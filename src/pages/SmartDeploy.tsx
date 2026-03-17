import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../services/api";
import { useServer } from "../contexts/ServerContext";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
  IconButton,
  Skeleton,
  useTheme,
  alpha,
  Collapse,
  keyframes,
  Tooltip,
  CircularProgress,
  InputAdornment,
  Autocomplete,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import GitHubIcon from "@mui/icons-material/GitHub";
import StorageIcon from "@mui/icons-material/Storage";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CelebrationIcon from "@mui/icons-material/Celebration";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import LinkIcon from "@mui/icons-material/Link";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DescriptionIcon from "@mui/icons-material/Description";
import SEO from "../components/SEO";
import { connectSocket } from "../services/socket";

/* ─── animations ─── */
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

/* ─── interfaces ─── */
interface DetectedProject {
  framework: string;
  frameworkIcon: string;
  displayName: string;
  description: string;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
  stopCommand: string;
  buildOutputDir: string;
  deployPath: string;
  requiredTools: string[];
  environment: string;
  nodeVersion?: string;
  envVarsFromExample?: Record<string, string>;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  confidence: number;
}

interface ServerInfo {
  _id: string;
  name: string;
  host: string;
  status: string;
}

interface ToolCheck {
  installed: boolean;
  version?: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updated_at: string;
  default_branch: string;
}

/* ─── localStorage key ─── */
const LS_KEY = "smart-deploy-state";

interface WizardState {
  repoUrl: string;
  branch: string;
  customToken: string;
  detection: DetectedProject | null;
  projectName: string;
  editableConfig: {
    installCommand: string;
    buildCommand: string;
    startCommand: string;
    deployPath: string;
    buildOutputDir: string;
  };
  selectedServer: string;
  envVars: Record<string, string>;
  activeStep: number;
  branches: string[];
  selectedRepo: GitHubRepo | null;
}

const defaultState: WizardState = {
  repoUrl: "",
  branch: "main",
  customToken: "",
  detection: null,
  projectName: "",
  editableConfig: {
    installCommand: "",
    buildCommand: "",
    startCommand: "",
    deployPath: "",
    buildOutputDir: "",
  },
  selectedServer: "",
  envVars: {},
  activeStep: 0,
  branches: [],
  selectedRepo: null,
};

function loadState(): WizardState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultState;
}

function saveState(state: Partial<WizardState>) {
  try {
    const current = loadState();
    localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...state }));
  } catch {
    /* ignore */
  }
}

const steps = ["Source", "Branch", "Review", "Server", "Deploy"];

const SmartDeploy: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primary = theme.palette.primary.main;
  const { selectedServer: globalActiveServer, servers: contextServers } =
    useServer();
  const [searchParams, setSearchParams] = useSearchParams();

  // Restore from localStorage
  const restored = useMemo(() => loadState(), []);

  // Wizard state
  const [activeStep, setActiveStep] = useState(() => {
    const urlStep = parseInt(searchParams.get("step") || "", 10);
    if (!isNaN(urlStep) && urlStep >= 0 && urlStep <= 4) return urlStep;
    return restored.activeStep;
  });

  // Step 0: Source
  const [repoUrl, setRepoUrl] = useState(restored.repoUrl);
  const [customToken, setCustomToken] = useState(restored.customToken);
  const [showTokenInput, setShowTokenInput] = useState(!!restored.customToken);
  const [showTokenValue, setShowTokenValue] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(
    !restored.selectedRepo && !!restored.repoUrl,
  );

  // GitHub repos
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const [ghSearch, setGhSearch] = useState("");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghConnected, setGhConnected] = useState(true); // assume connected
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(
    restored.selectedRepo,
  );

  // Step 1: Branch
  const [branches, setBranches] = useState<string[]>(restored.branches);
  const [branch, setBranch] = useState(restored.branch);
  const [detectingBranches, setDetectingBranches] = useState(false);

  // Step 2: Detection
  const [detection, setDetection] = useState<DetectedProject | null>(
    restored.detection,
  );
  const [projectName, setProjectName] = useState(restored.projectName);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editableConfig, setEditableConfig] = useState(restored.editableConfig);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState("");

  // Step 3: Server
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [selectedServer, setSelectedServer] = useState(restored.selectedServer);
  const [loadingServers, setLoadingServers] = useState(false);
  const [toolChecks, setToolChecks] = useState<Record<string, ToolCheck>>({});
  const [checkingTools, setCheckingTools] = useState(false);
  const [installingTools, setInstallingTools] = useState(false);
  const [installProgress, setInstallProgress] = useState<
    Record<string, string>
  >({});

  // Step 4: Deploy
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [deployedProjectId, setDeployedProjectId] = useState("");
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(
    null,
  );
  const [deployStages, setDeployStages] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<string>("pending");

  // Friendly labels for known stages (fallback: capitalize the raw name)
  const stageLabelMap: Record<string, string> = {
    pending: "Preparing deployment...",
    cloning: "Cloning repository",
    installing: "Installing dependencies",
    building: "Building project",
    starting: "Starting service",
    deploying: "Deploying",
    running: "Live",
    failed: "Failed",
    cancelled: "Cancelled",
    stopped: "Stopped",
  };
  const friendlyLabel = (s: string) =>
    stageLabelMap[s] || s.charAt(0).toUpperCase() + s.slice(1);

  // Listen to deployment status updates via socket
  useEffect(() => {
    if (!activeDeploymentId) return;
    const socket = connectSocket();

    const handleStatus = (data: { status: string }) => {
      const s = data.status;
      setCurrentStage(s);
      // Add to completed stages list (skip terminal states)
      if (!["running", "failed", "cancelled", "stopped"].includes(s)) {
        setDeployStages((prev) => (prev.includes(s) ? prev : [...prev, s]));
      }
    };

    socket.on("deployment:status", handleStatus);
    return () => {
      socket.off("deployment:status", handleStatus);
    };
  }, [activeDeploymentId]);

  // Env vars
  const [envVars, setEnvVars] = useState<Record<string, string>>(
    restored.envVars,
  );

  const notionCard = {
    background: isDark ? "#191919" : "#ffffff",
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    borderRadius: 2,
    boxShadow: isDark
      ? "0 4px 12px rgba(0,0,0,0.2)"
      : "0 1px 3px rgba(0,0,0,0.05)",
  };

  // ─── Sync step → URL ───
  useEffect(() => {
    const current = searchParams.get("step");
    if (current !== String(activeStep)) {
      setSearchParams({ step: String(activeStep) }, { replace: true });
    }
  }, [activeStep]);

  // ─── Persist state to localStorage ───
  useEffect(() => {
    saveState({
      repoUrl,
      branch,
      customToken,
      detection,
      projectName,
      editableConfig,
      selectedServer,
      envVars,
      activeStep,
      branches,
      selectedRepo,
    });
  }, [
    repoUrl,
    branch,
    customToken,
    detection,
    projectName,
    editableConfig,
    selectedServer,
    envVars,
    activeStep,
    branches,
    selectedRepo,
  ]);

  // ─── Load GitHub repos on mount ───
  useEffect(() => {
    setGhLoading(true);
    api
      .get("/auth/github/repos", { params: { per_page: 50 } })
      .then(({ data }) => {
        setGhRepos(data.repos || []);
        setGhConnected(true);
      })
      .catch(() => {
        setGhConnected(false);
        setShowManualUrl(true);
      })
      .finally(() => setGhLoading(false));
  }, []);

  // ─── Load servers on step 3 (use context servers) ───
  useEffect(() => {
    if (activeStep === 3 && servers.length === 0) {
      if (contextServers.length > 0) {
        setServers(contextServers);
      } else {
        setLoadingServers(true);
        api
          .get("/servers")
          .then(({ data }) => setServers(data))
          .catch(() => toast.error("Failed to load servers"))
          .finally(() => setLoadingServers(false));
      }
    }
  }, [activeStep, contextServers]);

  // ─── Auto-select global active server ───
  useEffect(() => {
    if (
      activeStep === 3 &&
      !selectedServer &&
      globalActiveServer &&
      globalActiveServer.status === "online"
    ) {
      setSelectedServer(globalActiveServer._id);
    }
  }, [activeStep, selectedServer, globalActiveServer]);

  // ─── Filter repos by search ───
  const filteredRepos = useMemo(() => {
    if (!ghSearch.trim()) return ghRepos;
    const q = ghSearch.toLowerCase();
    return ghRepos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q),
    );
  }, [ghRepos, ghSearch]);

  // ═══════════════════════════════
  // Select a GitHub repo (Step 0)
  // ═══════════════════════════════
  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setRepoUrl(repo.clone_url);
    setBranch(repo.default_branch);
  };

  // ═══════════════════════════════
  // Step 0 → 1: Detect Branches
  // ═══════════════════════════════
  const handleDetectBranches = useCallback(async () => {
    if (!repoUrl) {
      toast.error("Please select or enter a repository");
      return;
    }

    setDetectingBranches(true);
    try {
      // Need a server for ssh detection
      let serverList = servers;
      if (serverList.length === 0) {
        const { data } = await api.get("/servers");
        serverList = data;
        setServers(data);
      }

      if (serverList.length === 0) {
        toast.error("Add a server first");
        setDetectingBranches(false);
        return;
      }

      const onlineServer = serverList.find(
        (s: ServerInfo) => s.status === "online",
      );
      if (!onlineServer) {
        toast.error("No online servers available");
        setDetectingBranches(false);
        return;
      }

      const { data } = await api.post("/projects/detect-branch", {
        repoUrl,
        serverId: onlineServer._id,
      });

      const detectedBranches: string[] = data.allBranches || [data.branch];
      setBranches(detectedBranches);

      // Auto-select default branch
      if (
        selectedRepo?.default_branch &&
        detectedBranches.includes(selectedRepo.default_branch)
      ) {
        setBranch(selectedRepo.default_branch);
      } else if (
        detectedBranches.length > 0 &&
        !detectedBranches.includes(branch)
      ) {
        setBranch(detectedBranches[0]);
      }

      setActiveStep(1);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Failed to detect branches",
      );
    } finally {
      setDetectingBranches(false);
    }
  }, [repoUrl, servers, selectedRepo, branch]);

  // ═══════════════════════════════
  // Step 1 → 2: Analyze Repository
  // ═══════════════════════════════
  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setAnalyzeProgress("Connecting...");
    try {
      let serverList = servers;
      if (serverList.length === 0) {
        const { data } = await api.get("/servers");
        serverList = data;
        setServers(data);
      }

      const onlineServer = serverList.find(
        (s: ServerInfo) => s.status === "online",
      );
      if (!onlineServer) {
        toast.error("No online servers available");
        setAnalyzing(false);
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || "";
      const token = localStorage.getItem("accessToken");

      const response = await fetch(`${API_URL}/api/smart-deploy/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          repoUrl,
          branch,
          serverId: onlineServer._id,
          customToken: customToken || undefined,
        }),
      });

      if (!response.ok) {
        let msg = "Analysis failed";
        try {
          const errData = await response.json();
          msg = errData.message || msg;
        } catch (e) {}
        throw new Error(msg);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let dataBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        dataBuffer += decoder.decode(value, { stream: true });

        // Parse SSE chunks separated by \n\n
        let boundary = dataBuffer.indexOf("\n\n");
        while (boundary !== -1) {
          const chunk = dataBuffer.slice(0, boundary).trim();
          dataBuffer = dataBuffer.slice(boundary + 2);
          boundary = dataBuffer.indexOf("\n\n");

          if (!chunk) continue;

          // SSE format: data: {"type":"..."}
          if (chunk.startsWith("data: ")) {
            const jsonStr = chunk.slice(6);
            try {
              const eventData = JSON.parse(jsonStr);

              if (eventData.type === "progress") {
                setAnalyzeProgress(eventData.message);
              } else if (eventData.type === "error") {
                throw new Error(eventData.message);
              } else if (eventData.type === "success") {
                const { detection } = eventData;
                setDetection(detection);
                setEditableConfig({
                  installCommand: detection.installCommand,
                  buildCommand: detection.buildCommand,
                  startCommand: detection.startCommand,
                  deployPath: detection.deployPath,
                  buildOutputDir: detection.buildOutputDir,
                });

                const name =
                  repoUrl
                    .split("/")
                    .pop()
                    ?.replace(".git", "")
                    ?.replace(/[^a-zA-Z0-9-_]/g, "-") || "my-site";
                setProjectName(name);

                if (detection.envVarsFromExample) {
                  setEnvVars(detection.envVarsFromExample);
                }

                setActiveStep(2);
                toast.success(`Detected: ${detection.displayName}`);
                setAnalyzing(false);
                return; // Done
              }
            } catch (err: any) {
              if (err.message) throw err;
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Analysis failed");
      setAnalyzing(false);
    }
  }, [repoUrl, branch, servers, customToken]);

  // ═══════════════════════════════
  // Step 3: Check Server Tools
  // ═══════════════════════════════
  const handleCheckTools = useCallback(
    async (serverId: string) => {
      if (!detection) return;
      setCheckingTools(true);
      try {
        const { data } = await api.smartDeployCheckServer({
          serverId,
          requiredTools: [...detection.requiredTools, "git"],
        });
        setToolChecks(data.tools);
      } catch {
        toast.error("Failed to check server tools");
      } finally {
        setCheckingTools(false);
      }
    },
    [detection],
  );

  useEffect(() => {
    if (selectedServer && activeStep === 3) {
      handleCheckTools(selectedServer);
    }
  }, [selectedServer, activeStep, handleCheckTools]);

  // ═══════════════════════════════
  // Step 4: Execute Deploy
  // ═══════════════════════════════
  const handleDeploy = useCallback(async () => {
    if (!detection || !selectedServer) return;

    setDeploying(true);
    try {
      const { data } = await api.smartDeployExecute({
        repoUrl,
        branch,
        serverId: selectedServer,
        projectName,
        installCommand: editableConfig.installCommand,
        buildCommand: editableConfig.buildCommand,
        startCommand: editableConfig.startCommand,
        stopCommand: detection.stopCommand,
        buildOutputDir: editableConfig.buildOutputDir,
        deployPath: editableConfig.deployPath,
        environment: detection.environment,
        envVars,
        autoDeploy: true,
      });

      setDeployedProjectId(data.project._id);
      setDeploySuccess(true);
      setActiveDeploymentId(data.deploymentId);
      const socket = connectSocket();
      socket.emit("join:deployment", data.deploymentId);
      // Clear localStorage on success
      localStorage.removeItem(LS_KEY);
      toast.success("Your site is being deployed!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Deployment failed");
    } finally {
      setDeploying(false);
    }
  }, [
    detection,
    selectedServer,
    repoUrl,
    branch,
    projectName,
    editableConfig,
    envVars,
  ]);

  // ═══════════════════════════════
  // Reset wizard
  // ═══════════════════════════════
  const resetWizard = () => {
    localStorage.removeItem(LS_KEY);
    setRepoUrl("");
    setBranch("main");
    setCustomToken("");
    setDetection(null);
    setProjectName("");
    setEditableConfig(defaultState.editableConfig);
    setSelectedServer("");
    setEnvVars({});
    setBranches([]);
    setSelectedRepo(null);
    setActiveStep(0);
    setDeploySuccess(false);
    setActiveDeploymentId(null);
    setDeployStages([]);
    setCurrentStage("pending");
    setShowManualUrl(false);
    setShowTokenInput(false);
  };

  // ═══════════════════════════════
  // Navigate between steps
  // ═══════════════════════════════
  const goNext = () => {
    if (activeStep === 0) {
      handleDetectBranches();
    } else if (activeStep === 1) {
      handleAnalyze();
    } else {
      setActiveStep((s) => Math.min(4, s + 1));
    }
  };

  const goBack = () => {
    setActiveStep((s) => Math.max(0, s - 1));
  };

  const canGoNext = () => {
    switch (activeStep) {
      case 0:
        return !!repoUrl;
      case 1:
        return !!branch;
      case 2:
        return !!detection && !!projectName;
      case 3:
        return !!selectedServer;
      default:
        return false;
    }
  };

  const isStepLoading = () => {
    if (activeStep === 0) return detectingBranches;
    if (activeStep === 1) return analyzing;
    return false;
  };

  // ═══════════════════════════════
  // Render Steps
  // ═══════════════════════════════
  const renderStep = () => {
    switch (activeStep) {
      // ─── Step 0: Source ───
      case 0:
        return (
          <Box
            sx={{
              animation: `${fadeInUp} 0.4s ease-out`,
              maxWidth: 700,
              mx: "auto",
            }}
          >
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  mb: 2,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                }}
              >
                <GitHubIcon sx={{ fontSize: 40, color: primary }} />
              </Box>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                {t("smartDeploy.sourceTitle", "Where's your code?")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {ghConnected
                  ? t(
                      "smartDeploy.sourceDescGh",
                      "Pick a repo from your GitHub account, or paste a URL.",
                    )
                  : t(
                      "smartDeploy.sourceDescManual",
                      "Paste your Git repository URL.",
                    )}
              </Typography>
            </Box>

            {/* GitHub Repo Picker */}
            {ghConnected && !showManualUrl && (
              <Card sx={{ ...notionCard, mb: 2, p: 0.5 }}>
                <CardContent sx={{ p: 2 }}>
                  {/* Search */}
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search your repos..."
                    value={ghSearch}
                    onChange={(e) => setGhSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon
                            sx={{ fontSize: 18, color: "text.secondary" }}
                          />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2.5, fontSize: 13 },
                    }}
                    sx={{ mb: 2 }}
                  />

                  {/* Repo list */}
                  <Box
                    sx={{
                      maxHeight: 320,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.8,
                      "&::-webkit-scrollbar": { width: 4 },
                      "&::-webkit-scrollbar-thumb": {
                        bgcolor: "rgba(128,128,128,0.2)",
                        borderRadius: 100,
                      },
                    }}
                  >
                    {ghLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          variant="rounded"
                          height={56}
                          sx={{ borderRadius: 2.5 }}
                        />
                      ))
                    ) : filteredRepos.length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: "center", py: 3 }}
                      >
                        {ghSearch
                          ? "No repos match your search"
                          : "No repositories found"}
                      </Typography>
                    ) : (
                      filteredRepos.map((repo) => {
                        const isSelected = selectedRepo?.id === repo.id;
                        return (
                          <Box
                            key={repo.id}
                            onClick={() => handleSelectRepo(repo)}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              py: 1.2,
                              px: 1.5,
                              borderRadius: 2.5,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              border: "1px solid",
                              borderColor: isSelected
                                ? primary
                                : isDark
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.06)",
                              bgcolor: isSelected
                                ? alpha(primary, 0.06)
                                : "transparent",
                              "&:hover": {
                                bgcolor: isSelected
                                  ? alpha(primary, 0.08)
                                  : isDark
                                    ? "rgba(255,255,255,0.03)"
                                    : "rgba(0,0,0,0.02)",
                              },
                            }}
                          >
                            <GitHubIcon
                              sx={{
                                fontSize: 20,
                                color: "text.secondary",
                                opacity: 0.6,
                              }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: 13.5,
                                    fontWeight: isSelected ? 700 : 500,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {repo.name}
                                </Typography>
                                {repo.private && (
                                  <LockIcon
                                    sx={{
                                      fontSize: 12,
                                      color: "text.secondary",
                                      opacity: 0.5,
                                    }}
                                  />
                                )}
                              </Box>
                              {repo.description && (
                                <Typography
                                  sx={{
                                    fontSize: 11.5,
                                    color: "text.secondary",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {repo.description}
                                </Typography>
                              )}
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {repo.language && (
                                <Chip
                                  label={repo.language}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    bgcolor: isDark
                                      ? "rgba(255,255,255,0.06)"
                                      : "rgba(0,0,0,0.04)",
                                  }}
                                />
                              )}
                              {isSelected && (
                                <CheckCircleIcon
                                  sx={{ fontSize: 18, color: primary }}
                                />
                              )}
                            </Box>
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Toggle: manual URL */}
            {ghConnected && (
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <Button
                  size="small"
                  onClick={() => {
                    setShowManualUrl(!showManualUrl);
                    if (!showManualUrl) setSelectedRepo(null);
                  }}
                  startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    textTransform: "none",
                    fontSize: 12,
                    color: "text.secondary",
                  }}
                >
                  {showManualUrl
                    ? "Pick from GitHub instead"
                    : "Or paste a URL"}
                </Button>
              </Box>
            )}

            {/* Manual URL input */}
            {(showManualUrl || !ghConnected) && (
              <Card sx={{ ...notionCard, p: 0.5, mb: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <TextField
                    fullWidth
                    label={t("smartDeploy.repoUrl", "Repository URL")}
                    placeholder="https://github.com/user/my-project.git"
                    value={repoUrl}
                    onChange={(e) => {
                      setRepoUrl(e.target.value);
                      setSelectedRepo(null);
                    }}
                    InputProps={{ sx: { borderRadius: 2.5, fontSize: 14 } }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Custom Token toggle */}
            <Box sx={{ textAlign: "center", mb: 1 }}>
              <Button
                size="small"
                onClick={() => setShowTokenInput(!showTokenInput)}
                startIcon={<LockIcon sx={{ fontSize: 14 }} />}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  color: "text.secondary",
                }}
              >
                {showTokenInput
                  ? "Hide custom token"
                  : "Private repo? Add a token"}
              </Button>
            </Box>

            <Collapse in={showTokenInput}>
              <Card sx={{ ...notionCard, p: 0.5, mb: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: 12, mb: 1.5 }}
                  >
                    If this repo isn't accessible via your connected GitHub
                    account, paste a <strong>Personal Access Token</strong> with
                    repo scope.
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type={showTokenValue ? "text" : "password"}
                    label="Personal Access Token"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    InputProps={{
                      sx: {
                        borderRadius: 2.5,
                        fontSize: 13,
                        fontFamily: "monospace",
                      },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowTokenValue(!showTokenValue)}
                          >
                            {showTokenValue ? (
                              <VisibilityOffIcon sx={{ fontSize: 16 }} />
                            ) : (
                              <VisibilityIcon sx={{ fontSize: 16 }} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </CardContent>
              </Card>
            </Collapse>
          </Box>
        );

      // ─── Step 1: Branch ───
      case 1:
        return (
          <Box
            sx={{
              animation: `${fadeInUp} 0.4s ease-out`,
              maxWidth: 600,
              mx: "auto",
            }}
          >
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                {t("smartDeploy.branchTitle", "Select a branch")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("smartDeploy.branchDesc", "Which branch should we deploy?")}
              </Typography>
            </Box>

            <Card sx={{ ...notionCard, p: 0.5 }}>
              <CardContent sx={{ p: 3 }}>
                <Autocomplete
                  freeSolo
                  options={branches}
                  value={branch}
                  onChange={(_, newValue) => {
                    if (newValue) setBranch(newValue);
                  }}
                  onInputChange={(_, newInputValue) => {
                    setBranch(newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      label="Select or type branch name"
                      variant="outlined"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2.5,
                          fontSize: 13,
                          fontFamily: "monospace",
                        },
                      }}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* ── SSE Progress Panel ── */}
            {analyzing && (
              <Card
                sx={{
                  ...notionCard,
                  p: 0.5,
                  mt: 3,
                  animation: `${fadeInUp} 0.35s ease-out`,
                }}
              >
                <Box
                  sx={{
                    height: 3,
                    background: `linear-gradient(90deg, ${primary}, ${alpha(primary, 0.3)})`,
                    animation: `${pulse} 1.5s ease-in-out infinite`,
                  }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ mb: 2 }}
                  >
                    🔍 Analyzing Repository...
                  </Typography>
                  {[
                    "Cloning repository...",
                    "Scanning repository files...",
                    "Analyzing project structure with AI...",
                    "Cleaning up...",
                  ].map((stepLabel) => {
                    const allProgress = [
                      "Connecting...",
                      "Cloning repository...",
                      "Scanning repository files...",
                      "Analyzing project structure with AI...",
                      "AI detection skipped. Using rule-based detection...",
                      "AI successfully detected project type.",
                      "Cleaning up...",
                    ];
                    const currentIdx = allProgress.indexOf(analyzeProgress);
                    const stepIdx = allProgress.indexOf(stepLabel);
                    const isDone = currentIdx > stepIdx;
                    const isActive =
                      analyzeProgress === stepLabel ||
                      (stepLabel === "Analyzing project structure with AI..." &&
                        (analyzeProgress ===
                          "AI detection skipped. Using rule-based detection..." ||
                          analyzeProgress ===
                            "AI successfully detected project type."));

                    return (
                      <Box
                        key={stepLabel}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          py: 0.8,
                          opacity: isDone || isActive ? 1 : 0.35,
                          transition: "opacity 0.3s ease",
                        }}
                      >
                        {isDone ? (
                          <CheckCircleIcon
                            sx={{ fontSize: 20, color: "#10b981" }}
                          />
                        ) : isActive ? (
                          <CircularProgress
                            size={18}
                            thickness={5}
                            sx={{ color: primary }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              border: "2px solid",
                              borderColor: isDark
                                ? "rgba(255,255,255,0.15)"
                                : "rgba(0,0,0,0.12)",
                            }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: 13,
                            fontWeight: isDone || isActive ? 600 : 400,
                            color: isDone
                              ? "#10b981"
                              : isActive
                                ? "text.primary"
                                : "text.secondary",
                          }}
                        >
                          {stepLabel}
                        </Typography>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </Box>
        );

      // ─── Step 2: Review Plan ───
      case 2:
        if (!detection) return null;
        return (
          <Box
            sx={{
              animation: `${fadeInUp} 0.4s ease-out`,
              maxWidth: 700,
              mx: "auto",
            }}
          >
            {/* Detection card */}
            <Card
              sx={{
                ...notionCard,
                mb: 3,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  height: 3,
                  background: `linear-gradient(90deg, ${primary}, ${alpha(primary, 0.3)})`,
                }}
              />
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `linear-gradient(135deg, ${alpha(primary, 0.12)}, ${alpha(primary, 0.04)})`,
                      fontSize: 28,
                    }}
                  >
                    {detection.frameworkIcon}
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {detection.displayName}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: 13 }}
                    >
                      {detection.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${detection.confidence}% match`}
                    size="small"
                    sx={{
                      ml: "auto",
                      fontWeight: 600,
                      fontSize: 11,
                      bgcolor:
                        detection.confidence >= 80
                          ? alpha("#10b981", 0.12)
                          : alpha("#f59e0b", 0.12),
                      color: detection.confidence >= 80 ? "#10b981" : "#f59e0b",
                    }}
                  />
                </Box>

                <TextField
                  fullWidth
                  label={t("smartDeploy.projectName", "Site Name")}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  sx={{ mb: 2.5 }}
                  InputProps={{ sx: { borderRadius: 2.5, fontSize: 14 } }}
                  size="small"
                />

                <Box
                  sx={{ display: "flex", gap: 0.7, flexWrap: "wrap", mb: 2 }}
                >
                  {detection.requiredTools.map((tool) => (
                    <Chip
                      key={tool}
                      label={tool}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: 11,
                        bgcolor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      }}
                    />
                  ))}
                  <Chip
                    label={detection.environment}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: 11,
                      bgcolor: alpha(primary, 0.08),
                      color: primary,
                    }}
                  />
                </Box>

                <Box
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    cursor: "pointer",
                    color: "text.secondary",
                    fontSize: 13,
                    mb: 1,
                    "&:hover": { color: primary },
                  }}
                >
                  <EditIcon sx={{ fontSize: 14 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                    {t("smartDeploy.editCommands", "Edit commands")}
                  </Typography>
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 16,
                      transform: showAdvanced ? "rotate(180deg)" : "rotate(0)",
                      transition: "0.2s",
                    }}
                  />
                </Box>

                <Collapse in={showAdvanced}>
                  <Box
                    sx={{
                      mt: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    {(
                      [
                        ["installCommand", "Install"],
                        ["buildCommand", "Build"],
                        ["startCommand", "Start"],
                        ["deployPath", "Deploy Path"],
                        ["buildOutputDir", "Output Dir"],
                      ] as const
                    ).map(([key, label]) => (
                      <TextField
                        key={key}
                        label={label}
                        value={editableConfig[key]}
                        onChange={(e) =>
                          setEditableConfig((c) => ({
                            ...c,
                            [key]: e.target.value,
                          }))
                        }
                        size="small"
                        InputProps={{
                          sx: {
                            borderRadius: 2,
                            fontSize: 13,
                            fontFamily: "monospace",
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>

            {/* Env vars */}
            {Object.keys(envVars).length > 0 && (
              <Card sx={{ ...notionCard, mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ mb: 1.5 }}
                  >
                    {t(
                      "smartDeploy.envVars",
                      "Environment Variables (from .env.example)",
                    )}
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {Object.entries(envVars).map(([key, val]) => (
                      <TextField
                        key={key}
                        label={key}
                        value={val}
                        onChange={(e) =>
                          setEnvVars((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        size="small"
                        InputProps={{
                          sx: {
                            borderRadius: 2,
                            fontSize: 13,
                            fontFamily: "monospace",
                          },
                        }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      // ─── Step 3: Choose Server ───
      case 3: {
        const currentServer = servers.find((s) => s._id === selectedServer);
        const isGlobalActive = globalActiveServer?._id === selectedServer;
        const otherServers = servers.filter(
          (s) => s._id !== selectedServer && s.status === "online",
        );

        return (
          <Box
            sx={{
              animation: `${fadeInUp} 0.4s ease-out`,
              maxWidth: 600,
              mx: "auto",
            }}
          >
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                {t("smartDeploy.chooseServer", "Choose a server")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  "smartDeploy.chooseServerDesc",
                  "Where do you want your site to live?",
                )}
              </Typography>
            </Box>

            {/* Static site badge */}
            {detection?.environment === "static" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 2,
                  mb: 2,
                  borderRadius: 3,
                  bgcolor: alpha("#10b981", isDark ? 0.08 : 0.05),
                  border: `1px solid ${alpha("#10b981", 0.2)}`,
                }}
              >
                <DescriptionIcon sx={{ fontSize: 24, color: "#10b981" }} />
                <Box>
                  <Typography
                    sx={{ fontWeight: 700, fontSize: 13, color: "#10b981" }}
                  >
                    Static Site
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    Only git + nginx needed. Node is used for building only.
                  </Typography>
                </Box>
              </Box>
            )}

            {loadingServers ? (
              <Skeleton
                variant="rounded"
                height={100}
                sx={{ borderRadius: 4 }}
              />
            ) : servers.length === 0 ? (
              <Card sx={{ ...notionCard, textAlign: "center", py: 6 }}>
                <StorageIcon
                  sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {t("smartDeploy.noServersTitle", "No servers yet")}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {t(
                    "smartDeploy.noServersDesc",
                    "Add a server to deploy your site.",
                  )}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate("/servers")}
                  sx={{
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  {t("smartDeploy.addServer", "Add Server")}
                </Button>
              </Card>
            ) : (
              <>
                {/* Currently selected server */}
                {currentServer && (
                  <Card
                    sx={{
                      ...notionCard,
                      borderColor: primary,
                      boxShadow: `0 0 0 1px ${primary}`,
                    }}
                  >
                    <Box
                      sx={{
                        height: 3,
                        background: primary,
                      }}
                    />
                    <CardContent sx={{ p: 2.5 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor:
                              currentServer.status === "online"
                                ? "#10b981"
                                : "#ef4444",
                            boxShadow:
                              currentServer.status === "online"
                                ? "0 0 8px rgba(16,185,129,0.4)"
                                : undefined,
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                            {currentServer.name}
                          </Typography>
                          <Typography
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          >
                            {currentServer.host}
                          </Typography>
                        </Box>
                        {isGlobalActive && (
                          <Chip
                            label="Active"
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: 11,
                              bgcolor: alpha("#10b981", 0.12),
                              color: "#10b981",
                            }}
                          />
                        )}
                        <CheckCircleIcon
                          sx={{ color: primary, fontSize: 22 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Switch to another server */}
                {otherServers.length > 0 && (
                  <Autocomplete
                    options={otherServers}
                    getOptionLabel={(option) =>
                      `${(option as ServerInfo).name} — ${(option as ServerInfo).host}`
                    }
                    value={null}
                    onChange={(_, newValue) => {
                      if (newValue) {
                        setSelectedServer((newValue as ServerInfo)._id);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Switch to another server..."
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2.5,
                            fontSize: 13,
                            bgcolor: isDark
                              ? "rgba(0,0,0,0.2)"
                              : "rgba(255,255,255,0.5)",
                          },
                        }}
                      />
                    )}
                    sx={{ mt: 2 }}
                  />
                )}
              </>
            )}

            {/* Tool checks */}
            {selectedServer && detection && (
              <Card sx={{ ...notionCard, mt: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ mb: 1.5 }}
                  >
                    {t("smartDeploy.toolCheck", "Server Requirements")}
                  </Typography>
                  {checkingTools ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography
                        sx={{ fontSize: 13, color: "text.secondary" }}
                      >
                        Checking installed tools...
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {Object.entries(toolChecks).map(([name, check]) => {
                          const toolDescriptions: Record<string, string> = {
                            node: "JavaScript runtime — required to run JS/TS projects",
                            pm2: "Process manager — keeps your app alive and auto-restarts",
                            nginx:
                              "Web server — serves static files and proxies requests",
                            git: "Version control — clones your repository",
                            docker:
                              "Container runtime — runs isolated containers",
                            python3:
                              "Python runtime — required for Python projects",
                          };
                          return (
                            <Tooltip
                              key={name}
                              title={toolDescriptions[name] || name}
                              arrow
                              placement="top"
                            >
                              <Chip
                                icon={
                                  installProgress[name] === "installing" ? (
                                    <CircularProgress size={12} thickness={5} />
                                  ) : check.installed ||
                                    installProgress[name] === "done" ? (
                                    <CheckCircleIcon
                                      sx={{
                                        fontSize: 14,
                                        color: "#10b981 !important",
                                      }}
                                    />
                                  ) : (
                                    <ErrorOutlineIcon
                                      sx={{
                                        fontSize: 14,
                                        color: "#ef4444 !important",
                                      }}
                                    />
                                  )
                                }
                                label={`${name}${check.version ? ` (${check.version})` : ""}`}
                                size="small"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: 11,
                                  bgcolor:
                                    check.installed ||
                                    installProgress[name] === "done"
                                      ? alpha("#10b981", isDark ? 0.12 : 0.08)
                                      : installProgress[name] === "installing"
                                        ? alpha(primary, isDark ? 0.12 : 0.08)
                                        : alpha(
                                            "#ef4444",
                                            isDark ? 0.12 : 0.08,
                                          ),
                                  color:
                                    check.installed ||
                                    installProgress[name] === "done"
                                      ? "#10b981"
                                      : installProgress[name] === "installing"
                                        ? primary
                                        : "#ef4444",
                                }}
                              />
                            </Tooltip>
                          );
                        })}
                      </Box>

                      {/* Quick Fix Button */}
                      {Object.entries(toolChecks).some(
                        ([, check]) => !check.installed,
                      ) &&
                        !installingTools && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={async () => {
                              const missingTools = Object.entries(toolChecks)
                                .filter(([, c]) => !c.installed)
                                .map(([n]) => n);
                              if (missingTools.length === 0) return;

                              setInstallingTools(true);
                              setInstallProgress({});
                              try {
                                const API_URL =
                                  import.meta.env.VITE_API_URL || "";
                                const token =
                                  localStorage.getItem("accessToken");

                                const response = await fetch(
                                  `${API_URL}/api/smart-deploy/install-tools`,
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      ...(token
                                        ? { Authorization: `Bearer ${token}` }
                                        : {}),
                                    },
                                    body: JSON.stringify({
                                      serverId: selectedServer,
                                      tools: missingTools,
                                    }),
                                  },
                                );

                                if (!response.ok || !response.body) {
                                  throw new Error("Install request failed");
                                }

                                const reader = response.body.getReader();
                                const decoder = new TextDecoder("utf-8");
                                let buf = "";

                                while (true) {
                                  const { value, done } = await reader.read();
                                  if (done) break;
                                  buf += decoder.decode(value, {
                                    stream: true,
                                  });

                                  let boundary = buf.indexOf("\n\n");
                                  while (boundary !== -1) {
                                    const chunk = buf.slice(0, boundary).trim();
                                    buf = buf.slice(boundary + 2);
                                    boundary = buf.indexOf("\n\n");

                                    if (chunk.startsWith("data: ")) {
                                      try {
                                        const evt = JSON.parse(chunk.slice(6));
                                        if (evt.type === "progress") {
                                          setInstallProgress((prev) => ({
                                            ...prev,
                                            [evt.tool]: evt.status,
                                          }));
                                        }
                                        if (evt.type === "complete") {
                                          // Re-check tools after install
                                          toast.success(
                                            "Installation complete! Re-checking...",
                                          );
                                          setCheckingTools(true);
                                          try {
                                            const { data } = await api.post(
                                              "/smart-deploy/check-server",
                                              {
                                                serverId: selectedServer,
                                                requiredTools:
                                                  detection!.requiredTools,
                                              },
                                            );
                                            setToolChecks(data.tools);
                                          } catch (e) {
                                            /* ignore */
                                          } finally {
                                            setCheckingTools(false);
                                          }
                                        }
                                      } catch {
                                        /* ignore */
                                      }
                                    }
                                  }
                                }
                              } catch {
                                toast.error("Failed to install tools");
                              } finally {
                                setInstallingTools(false);
                                setInstallProgress({});
                              }
                            }}
                            startIcon={
                              <AutoFixHighIcon sx={{ fontSize: 14 }} />
                            }
                            sx={{
                              mt: 2,
                              borderRadius: 2.5,
                              textTransform: "none",
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            Quick Fix — Install Missing Tools
                          </Button>
                        )}

                      {installingTools && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mt: 2,
                          }}
                        >
                          <CircularProgress size={14} />
                          <Typography
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          >
                            Installing missing tools... please wait
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        );
      }

      // ─── Step 4: Deploy ───
      case 4:
        return (
          <Box
            sx={{
              animation: `${fadeInUp} 0.4s ease-out`,
              maxWidth: 600,
              mx: "auto",
              textAlign: "center",
            }}
          >
            {deploySuccess ? (
              <Box sx={{ py: 4 }}>
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    mx: "auto",
                    mb: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isDark
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(16,185,129,0.05)",
                    animation: `${pulse} 2s ease-in-out infinite`,
                  }}
                >
                  <CelebrationIcon sx={{ fontSize: 48, color: "#10b981" }} />
                </Box>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                  Your site is deploying!
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 4, maxWidth: 400, mx: "auto" }}
                >
                  We're setting everything up. You can watch the real-time logs
                  below.
                </Typography>

                {activeDeploymentId && (
                  <Card sx={{ ...notionCard, mb: 4, textAlign: "left" }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ mb: 2 }}
                      >
                        Deployment Progress
                      </Typography>

                      {/* Completed stages */}
                      {deployStages.map((s, i) => (
                        <Box
                          key={s}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            py: 1.2,
                            borderBottom: "1px solid",
                            borderColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.06)",
                          }}
                        >
                          <CheckCircleIcon
                            sx={{ color: "#10b981", fontSize: 20 }}
                          />
                          <Typography
                            sx={{ fontSize: 13, fontWeight: 500, flex: 1 }}
                          >
                            {friendlyLabel(s)}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: "#10b981",
                              fontWeight: 600,
                            }}
                          >
                            Done
                          </Typography>
                        </Box>
                      ))}

                      {/* Current active stage */}
                      {!["running", "failed", "cancelled", "stopped"].includes(
                        currentStage,
                      ) && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            py: 1.2,
                          }}
                        >
                          <CircularProgress size={18} thickness={5} />
                          <Typography
                            sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}
                          >
                            {friendlyLabel(currentStage)}
                          </Typography>
                        </Box>
                      )}

                      {/* Success banner */}
                      {currentStage === "running" && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: isDark
                              ? "rgba(16,185,129,0.08)"
                              : "rgba(16,185,129,0.05)",
                            border: "1px solid",
                            borderColor: "rgba(16,185,129,0.2)",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#10b981",
                              mb: 0.5,
                            }}
                          >
                            Deployment successful!
                          </Typography>
                          <Typography
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          >
                            Your site is now live. You can manage it from the
                            project page.
                          </Typography>
                        </Box>
                      )}

                      {/* Failure banner */}
                      {currentStage === "failed" && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 2,
                            borderRadius: 2,
                            bgcolor: isDark
                              ? "rgba(239,68,68,0.08)"
                              : "rgba(239,68,68,0.05)",
                            border: "1px solid",
                            borderColor: "rgba(239,68,68,0.2)",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#ef4444",
                              mb: 0.5,
                            }}
                          >
                            Deployment failed
                          </Typography>
                          <Typography
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          >
                            Check the full logs on the project page for details.
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={() =>
                      navigate(`/projects/${deployedProjectId}/deploy`)
                    }
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 700,
                      px: 3,
                    }}
                  >
                    View Deploy Logs
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/projects")}
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Go to My Sites
                  </Button>
                  <Button
                    variant="text"
                    onClick={resetWizard}
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Deploy Another
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    mx: "auto",
                    mb: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.03)",
                  }}
                >
                  <RocketLaunchIcon sx={{ fontSize: 40, color: primary }} />
                </Box>
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  Ready to launch!
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 4, maxWidth: 400, mx: "auto" }}
                >
                  We'll create your project, clone the code, install
                  dependencies, build, and start your app.
                </Typography>

                <Card sx={{ ...notionCard, mb: 4, textAlign: "left" }}>
                  <CardContent sx={{ p: 2.5 }}>
                    {[
                      ["Site", projectName],
                      ["Framework", detection?.displayName || "—"],
                      ["Branch", branch],
                      [
                        "Server",
                        servers.find((s) => s._id === selectedServer)?.name ||
                          "—",
                      ],
                    ].map(([label, value]) => (
                      <Box
                        key={label}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          py: 0.8,
                          borderBottom: "1px solid",
                          borderColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.04)",
                          "&:last-child": { border: "none" },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "text.secondary",
                          }}
                        >
                          {label}
                        </Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                          {value}
                        </Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleDeploy}
                  disabled={deploying}
                  startIcon={
                    deploying ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <RocketLaunchIcon />
                    )
                  }
                  sx={{
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: 16,
                    py: 1.8,
                    boxShadow: "none",
                    border: "1px solid",
                    borderColor: "transparent",
                    animation: deploying
                      ? undefined
                      : `${pulse} 2s ease-in-out infinite`,
                    "&:hover": {
                      boxShadow: "none",
                      borderColor: "rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  {deploying ? "Launching your site..." : "Launch My Site"}
                </Button>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <SEO
        title={t("smartDeploy.title", "Smart Deploy")}
        description={t(
          "smartDeploy.desc",
          "Deploy your project with one click",
        )}
      />

      {/* Back button */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        {activeStep > 0 && !deploySuccess && (
          <Button
            size="small"
            onClick={resetWizard}
            sx={{
              textTransform: "none",
              fontSize: 12,
              color: "text.secondary",
            }}
          >
            Start Over
          </Button>
        )}
      </Box>

      {/* Stepper */}
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{
          mb: 5,
          "& .MuiStepLabel-label": { fontSize: 12, fontWeight: 600, mt: 0.5 },
          "& .MuiStepIcon-root": {
            fontSize: 28,
            color: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
            "&.Mui-active": { color: primary },
            "&.Mui-completed": { color: "#10b981" },
          },
        }}
      >
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>
              {t(
                `smartDeploy.step.${label.toLowerCase().replace(/ /g, "")}`,
                label,
              )}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      {renderStep()}

      {/* Navigation buttons */}
      {!deploySuccess && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            maxWidth: 700,
            mx: "auto",
            mt: 4,
          }}
        >
          <Button
            variant="outlined"
            onClick={goBack}
            disabled={activeStep === 0}
            startIcon={<ArrowBackIcon />}
            sx={{
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 600,
              visibility: activeStep === 0 ? "hidden" : "visible",
            }}
          >
            {t("smartDeploy.back", "Back")}
          </Button>
          {activeStep < 4 && (
            <Button
              variant="contained"
              onClick={goNext}
              disabled={!canGoNext() || isStepLoading()}
              endIcon={
                isStepLoading() ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <ArrowForwardIcon />
                )
              }
              sx={{
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "none",
              }}
            >
              {isStepLoading()
                ? activeStep === 0
                  ? "Detecting branches..."
                  : analyzeProgress || "Analyzing..."
                : activeStep === 1
                  ? "Analyze & Detect"
                  : t("smartDeploy.next", "Next")}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SmartDeploy;
