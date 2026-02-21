import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { connectSocket } from "../services/socket";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Skeleton,
  LinearProgress,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  TextField,
  Switch,
  FormControlLabel,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Drawer,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs from "dayjs";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HistoryIcon from "@mui/icons-material/History";
import EditIcon from "@mui/icons-material/Edit";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import ReplayIcon from "@mui/icons-material/Replay";
import DownloadIcon from "@mui/icons-material/Download";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import TerminalIcon from "@mui/icons-material/Terminal";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderBrowserDialog from "../components/FolderBrowserDialog";
import TerminalTabs from "../components/TerminalTabs";
import SEO from "../components/SEO";

interface LogEntry {
  log: string;
  type: "info" | "error" | "success" | "warning";
  timestamp: string;
}

interface DeploymentRecord {
  _id: string;
  status: string;
  commitHash?: string;
  commitMessage?: string;
  commitAuthor?: string;
  commitUrl?: string;
  branch: string;
  triggeredBy: string;
  triggeredByUser?: { username: string };
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  logs?: string[];
}

const statusColor: Record<string, "success" | "error" | "warning" | "default"> =
  {
    running: "success",
    stopped: "error",
    failed: "error",
    deploying: "warning",
    building: "warning",
    cloning: "warning",
    installing: "warning",
    starting: "warning",
    pending: "default",
    idle: "default",
  };

// In-progress statuses that mean a deploy is still active
const IN_PROGRESS = [
  "pending",
  "cloning",
  "installing",
  "building",
  "starting",
  "deploying",
];

// Server monitoring bar component
const ServerMonitorBar = React.memo(function ServerMonitorBar({
  serverId,
  serverStats,
  setServerStats,
}: {
  serverId: string;
  serverStats: any;
  setServerStats: (s: any) => void;
}) {
  useEffect(() => {
    const fetchStats = () => {
      api
        .get(`/servers/${serverId}/stats`)
        .then((res) => setServerStats(res.data))
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [serverId]);

  if (!serverStats) return null;
  // console.log(serverStats);

  // Handle nested stats object (if current API format) or flat object (legacy)
  const stats = serverStats.stats || serverStats;

  const items = [
    {
      label: "CPU",
      value: stats.cpuUsage ?? 0,
      color:
        (stats.cpuUsage ?? 0) > 80
          ? "#ef4444"
          : (stats.cpuUsage ?? 0) > 50
            ? "#eab308"
            : "#22c55e",
    },
    {
      label: "RAM",
      value: stats.memoryUsage ?? 0,
      color:
        (stats.memoryUsage ?? 0) > 80
          ? "#ef4444"
          : (stats.memoryUsage ?? 0) > 50
            ? "#eab308"
            : "#22c55e",
    },
    {
      label: "Disk",
      value: stats.diskUsage ?? 0,
      color:
        (stats.diskUsage ?? 0) > 90
          ? "#ef4444"
          : (stats.diskUsage ?? 0) > 70
            ? "#eab308"
            : "#22c55e",
    },
  ];

  return (
    <Box
      className="server-monitor-bar"
      sx={{
        display: "flex",
        gap: 2,
        mb: 2,
        p: 1.5,
        bgcolor: "rgba(0,0,0,0.15)",
        borderRadius: 2,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{ flex: 1 }}
          className={`monitor-item monitor-item-${item.label.toLowerCase()}`}
        >
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 10 }}
              className="monitor-label"
            >
              {item.label}
            </Typography>
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{ fontSize: 10, color: item.color }}
              className="monitor-value"
            >
              {item.value.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={item.value}
            className="monitor-progress"
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.06)",
              "& .MuiLinearProgress-bar": {
                bgcolor: item.color,
                borderRadius: 2,
              },
            }}
          />
        </Box>
      ))}
      {stats.uptime && (
        <Box
          sx={{ minWidth: 80, textAlign: "right" }}
          className="monitor-uptime"
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: 10, display: "block" }}
          >
            Uptime
          </Typography>
          <Typography variant="caption" fontWeight={600} sx={{ fontSize: 10 }}>
            {stats.uptime}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

const DeploymentDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [project, setProject] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [deployStatus, setDeployStatus] = useState<string>("idle");
  const [history, setHistory] = useState<DeploymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(
    null,
  );
  const [viewingLogs, setViewingLogs] = useState<DeploymentRecord | null>(null);
  const [historicalLogs, setHistoricalLogs] = useState<any[]>([]);
  const [historicalLogsLoading, setHistoricalLogsLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    branch: "",
    repoFolder: "",
    deployPath: "",
    outputPath: "",
    buildOutputDir: "",
    installCommand: "",
    buildCommand: "",
    startCommand: "",
    stopCommand: "",
    preDeployCommand: "",
    postDeployCommand: "",
    autoDeploy: false,
    healthCheckUrl: "",
    healthCheckInterval: 60,
    envVars: [] as { key: string; value: string }[],
  });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [cleanOutputOpen, setCleanOutputOpen] = useState(false);
  const [cleaningOutput, setCleaningOutput] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [serverStats, setServerStats] = useState<any>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffContent, setDiffContent] = useState("");
  const [diffLoading, setDiffLoading] = useState(false);
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<DeploymentRecord | null>(
    null,
  );
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookRegistered, setWebhookRegistered] = useState(false);
  const [webhookGuideOpen, setWebhookGuideOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [savingWebhookReg, setSavingWebhookReg] = useState(false);

  // Fetch project + history, and load logs from the latest deployment
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, historyRes] = await Promise.all([
          api.get(`/projects/${projectId}`),
          api.get(`/deployments/${projectId}/history`),
        ]);
        setProject(projectRes.data);
        setDeployStatus(projectRes.data.status);
        setWebhookRegistered(!!projectRes.data.webhookRegistered);
        const deployments: DeploymentRecord[] =
          historyRes.data.deployments || [];
        setHistory(deployments);

        // Load logs from the latest deployment (so they survive page reload)
        if (deployments.length > 0) {
          const latest = deployments[0];
          try {
            const { data } = await api.get(`/deployments/${latest._id}/logs`);
            const savedLogs: any[] = data.logs || [];
            // Convert saved logs into LogEntry format
            // Supports both old format (plain strings) and new format ({ log, type, timestamp })
            setLogs(
              savedLogs.map((entry) => {
                if (typeof entry === "string") {
                  // Old format: plain string,
                  return {
                    log: entry,
                    type: (data.status === "failed"
                      ? "error"
                      : "info") as LogEntry["type"],
                    timestamp: latest.startedAt,
                  };
                }
                // New format: structured object with per-log timestamp
                return {
                  log: entry.log || entry,
                  type: (entry.type ||
                    (data.status === "failed"
                      ? "error"
                      : "info")) as LogEntry["type"],
                  timestamp: entry.timestamp || latest.startedAt,
                };
              }),
            );
          } catch {
            // ignore log fetch errors
          }

          // If latest deployment is still in-progress, join its socket room
          if (IN_PROGRESS.includes(latest.status)) {
            setDeploying(true);
            setActiveDeploymentId(latest._id);
            const socket = connectSocket();
            socket.emit("join:deployment", latest._id);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  // Deduplicate logs from SSE and Socket.IO using timestamp+log as key
  const seenLogKeys = useRef<Set<string>>(new Set());
  const addLogDeduped = useCallback((entry: LogEntry) => {
    const key = `${entry.timestamp || ""}|${entry.log}`;
    if (seenLogKeys.current.has(key)) return;
    seenLogKeys.current.add(key);
    // Prevent memory leak: trim set if too large
    if (seenLogKeys.current.size > 5000) {
      const arr = Array.from(seenLogKeys.current);
      seenLogKeys.current = new Set(arr.slice(arr.length - 2000));
    }
    setLogs((prev) => [...prev, entry]);
  }, []);

  // SSE: listen for live log & status updates via EventSource
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const API_URL = import.meta.env.VITE_API_URL || "";
    const url = `${API_URL}/api/deployments/${projectId}/stream${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const es = new EventSource(url);

    es.addEventListener("log", (e) => {
      const data = JSON.parse(e.data) as LogEntry & { deploymentId?: string };
      addLogDeduped(data);
    });

    es.addEventListener("status", (e) => {
      const data = JSON.parse(e.data) as {
        deploymentId?: string;
        status: string;
      };
      setDeployStatus(data.status);
      if (["running", "failed", "stopped"].includes(data.status)) {
        setDeploying(false);
        refreshHistory();
      }
    });

    es.onerror = () => {
      // SSE will auto-reconnect
      console.warn("[SSE] Connection error, will auto-reconnect...");
    };

    return () => {
      es.close();
    };
  }, [projectId]);

  // Periodically refresh project status + history (every 10s)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshHistory();
      // Refresh project data (but don't overwrite status during active deploy,
      // since project.status in DB is stale until pipeline finishes)
      api
        .get(`/projects/${projectId}`)
        .then((res) => {
          setProject(res.data);
          // Only update status from project if we're not in an active deploy
          setDeployStatus((prev) => {
            if (IN_PROGRESS.includes(prev)) return prev;
            return res.data.status;
          });
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Auto-scroll terminal
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const refreshHistory = useCallback(() => {
    api
      .get(`/deployments/${projectId}/history`)
      .then((res) => setHistory(res.data.deployments || []))
      .catch(() => {});
  }, [projectId]);

  // Socket.IO: listen for live log & status updates
  useEffect(() => {
    const socket = connectSocket();

    const handleLog = (data: LogEntry & { deploymentId?: string }) => {
      addLogDeduped(data);
    };
    const handleStatus = (data: { deploymentId?: string; status: string }) => {
      setDeployStatus(data.status);
      if (["running", "failed", "stopped"].includes(data.status)) {
        setDeploying(false);
        refreshHistory();
      }
    };

    const handleRejoin = () => {
      if (activeDeploymentId) {
        socket.emit("join:deployment", activeDeploymentId);
        console.log("[Socket] Re-joining deployment room:", activeDeploymentId);
      }
    };

    socket.on("deployment:log", handleLog);
    socket.on("deployment:status", handleStatus);
    socket.on("connect", handleRejoin);

    // Initial join if we have an active ID
    if (activeDeploymentId && socket.connected) {
      socket.emit("join:deployment", activeDeploymentId);
    }

    return () => {
      socket.off("deployment:log", handleLog);
      socket.off("deployment:status", handleStatus);
      socket.off("connect", handleRejoin);
    };
  }, [addLogDeduped, refreshHistory, activeDeploymentId]);

  // F11: Confirm deploy dialog
  const [confirmDeployOpen, setConfirmDeployOpen] = useState(false);

  const handleDeploy = useCallback(async () => {
    setConfirmDeployOpen(false);
    setDeploying(true);
    setDeployStatus("deploying");
    setLogs([]);
    seenLogKeys.current.clear();
    try {
      // Connect socket and prepare listeners BEFORE triggering deploy
      const socket = connectSocket();
      const { data } = await api.post(`/deployments/${projectId}/deploy`);
      setActiveDeploymentId(data.deploymentId);
      // Join the deployment room immediately after getting the ID
      socket.emit("join:deployment", data.deploymentId);
      toast.success("Deployment started!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Deploy failed");
      setDeploying(false);
    }
  }, [projectId]);

  // F10: Export logs
  const handleExportLogs = useCallback(() => {
    if (logs.length === 0) {
      toast.error("No logs to export");
      return;
    }
    const content = logs
      .map(
        (l) =>
          `[${new Date(l.timestamp).toLocaleString()}] [${l.type.toUpperCase()}] ${l.log}`,
      )
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deploy-${project?.name || projectId}-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported!");
  }, [logs, project?.name, projectId]);

  const handleStop = useCallback(async () => {
    try {
      if (deploying) {
        // Cancel ongoing deployment (build, install, etc.)
        await api.post(`/deployments/${projectId}/cancel`);
        toast.success("Deployment cancelled");
      } else {
        // Stop running service
        await api.post(`/deployments/${projectId}/stop`);
        toast.success("Stopped");
      }
      setDeployStatus("stopped");
      setDeploying(false);
      refreshHistory();
    } catch (error: any) {
      const msg = error.response?.data?.message || "";
      if (msg.includes("No active deployment")) {
        // Deployment already finished before cancel was clicked — not a real error
        toast.success("Deployment already finished");
        setDeploying(false);
        refreshHistory();
        // Refresh project to get actual status
        api
          .get(`/projects/${projectId}`)
          .then((res) => {
            setProject(res.data);
            setDeployStatus(res.data.status);
          })
          .catch(() => {});
      } else {
        toast.error(msg || "Stop failed");
      }
    }
  }, [deploying, projectId, refreshHistory]);

  const handleRestart = useCallback(async () => {
    setDeploying(true);
    setDeployStatus("deploying");
    setLogs([]);
    try {
      const { data } = await api.post(`/deployments/${projectId}/restart`);
      setActiveDeploymentId(data.deploymentId);
      connectSocket().emit("join:deployment", data.deploymentId);
      toast.success("Restarting...");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Restart failed");
      setDeploying(false);
    }
  }, [projectId]);

  const viewDeploymentLogs = useCallback(async (dep: DeploymentRecord) => {
    setViewingLogs(dep);
    setHistoricalLogsLoading(true);
    try {
      const { data } = await api.get(`/deployments/${dep._id}/logs`);
      setHistoricalLogs(data.logs || []);
    } catch (error: any) {
      toast.error("Failed to load logs");
    } finally {
      setHistoricalLogsLoading(false);
    }
  }, []);

  const copyWebhookUrl = useCallback(() => {
    const url =
      webhookUrl ||
      `${import.meta.env.VITE_API_URL || window.location.origin}/api/webhook/${projectId}`;
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied!");
  }, [projectId, webhookUrl]);

  const fetchWebhookInfo = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data } = await api.get(`/projects/${projectId}/webhook-url`);
      setWebhookUrl(data.webhookUrl || "");
      setWebhookSecret(data.webhookSecret || "");
    } catch {
      // ignore — user may not own the project
    }
  }, [projectId]);

  const handleToggleWebhookRegistered = async (val: boolean) => {
    setSavingWebhookReg(true);
    try {
      await api.put(`/projects/${projectId}/webhook-registered`, {
        registered: val,
      });
      setWebhookRegistered(val);
      toast.success(
        val
          ? "Polling disabled — webhook mode active ⚡"
          : "Polling re-enabled",
      );
    } catch {
      toast.error("Failed to update webhook status");
    } finally {
      setSavingWebhookReg(false);
    }
  };

  const addEditEnvVar = () => {
    setEditForm((prev) => ({
      ...prev,
      envVars: [...prev.envVars, { key: "", value: "" }],
    }));
  };

  const updateEditEnvVar = (
    index: number,
    field: "key" | "value",
    val: string,
  ) => {
    setEditForm((prev) => {
      const newVars = [...prev.envVars];
      newVars[index][field] = val;
      return { ...prev, envVars: newVars };
    });
  };

  const removeEditEnvVar = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      envVars: prev.envVars.filter((_, i) => i !== index),
    }));
  };

  // Memoize filtered logs for search
  const filteredLogs = useMemo(
    () =>
      logSearch
        ? logs.filter((entry) =>
            entry.log.toLowerCase().includes(logSearch.toLowerCase()),
          )
        : logs,
    [logs, logSearch],
  );

  if (loading)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
            <Skeleton
              variant="rounded"
              width="100%"
              height={40}
              sx={{ mb: 1.5 }}
            />
            <Skeleton variant="rounded" width="100%" height={40} />
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={20} />
            <Skeleton variant="text" width="90%" height={20} />
            <Skeleton variant="text" width="95%" height={20} />
          </CardContent>
        </Card>
      </Box>
    );

  return (
    <Box>
      <SEO
        title={
          project
            ? `${project.name} - ${t("seo.deployments.title")}`
            : t("seo.deployments.title")
        }
        description={t("seo.deployments.description")}
      />
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/projects")}
        sx={{ mb: 2 }}
        size="small"
      >
        Back to Projects
      </Button>

      {/* Project Info */}
      <Card sx={{ mb: 3 }} className="project-info-card">
        <CardContent
          sx={{ p: { xs: 2, md: 3 } }}
          className="project-info-content"
        >
          <Box
            className="project-header"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box className="project-title-group" sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="h6"
                fontWeight={600}
                className="project-name"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                📦 {project?.name}
              </Typography>
              <Typography
                variant="body2"
                className="project-repo-info"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "text.secondary",
                  mt: 0.5,
                  fontSize: { xs: 11, md: 14 },
                  wordBreak: "break-all",
                }}
              >
                {project?.repoUrl} • {project?.branch}
              </Typography>
            </Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
              className="project-status-group"
            >
              <Tooltip title="Edit Project">
                <IconButton
                  size="small"
                  className="edit-project-btn"
                  onClick={() => {
                    if (project) {
                      setEditForm({
                        name: project.name || "",
                        branch: project.branch || "",
                        repoFolder: (project as any).repoFolder || "",
                        deployPath: project.deployPath || "",
                        outputPath: project.outputPath || "",
                        buildOutputDir: (project as any).buildOutputDir || "",
                        installCommand: project.installCommand || "",
                        buildCommand: project.buildCommand || "",
                        startCommand: project.startCommand || "",
                        stopCommand: project.stopCommand || "",
                        preDeployCommand: project.preDeployCommand || "",
                        postDeployCommand: project.postDeployCommand || "",
                        autoDeploy: project.autoDeploy || false,
                        healthCheckUrl: project.healthCheckUrl || "",
                        healthCheckInterval: project.healthCheckInterval || 60,
                        envVars: project.envVars
                          ? Object.entries(project.envVars).map(
                              ([key, value]) => ({
                                key,
                                value: String(value),
                              }),
                            )
                          : [],
                      });
                      setEditOpen(true);
                    }
                  }}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.06)",
                    "&:hover": { bgcolor: "rgba(99, 102, 241, 0.2)" },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Chip
                label={deployStatus}
                color={statusColor[deployStatus] || "default"}
                variant="outlined"
                className={`status-chip status-${deployStatus}`}
                icon={
                  <FiberManualRecordIcon sx={{ fontSize: "12px !important" }} />
                }
              />
              {project?.lastHealthCheck && project.healthCheckUrl && (
                <Tooltip
                  title={`Health: ${project.lastHealthCheck.status} ${project.lastHealthCheck.responseTime ? `(${project.lastHealthCheck.responseTime}ms)` : ""}`}
                >
                  <Chip
                    label={project.lastHealthCheck.status}
                    size="small"
                    className={`health-chip health-${project.lastHealthCheck.status}`}
                    color={
                      project.lastHealthCheck.status === "healthy"
                        ? "success"
                        : project.lastHealthCheck.status === "unhealthy"
                          ? "error"
                          : "default"
                    }
                    variant="outlined"
                    icon={
                      <FiberManualRecordIcon
                        sx={{ fontSize: "10px !important" }}
                      />
                    }
                  />
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Project details */}
          <Box
            className="project-details-grid"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1,
              mb: 2,
              p: { xs: 1.5, md: 2 },
              bgcolor: "rgba(0,0,0,0.15)",
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Box className="detail-item detail-server">
              <Typography variant="caption" color="text.secondary">
                Server
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {project?.server?.name || "—"} ({project?.server?.host || "—"})
              </Typography>
            </Box>
            <Box className="detail-item detail-path">
              <Typography variant="caption" color="text.secondary">
                Deploy Path
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                  textUnderlineOffset: 3,
                  "&:hover": { color: "primary.main" },
                }}
                onClick={() => {
                  if (project?.deployPath && project?.server?._id) {
                    navigate(
                      `/ftp?path=${encodeURIComponent(project.deployPath)}&server=${project.server._id}`,
                    );
                  }
                }}
              >
                {project?.deployPath || "—"}
              </Typography>
            </Box>
            <Box className="detail-item detail-install">
              <Typography variant="caption" color="text.secondary">
                Install Command
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
              >
                {project?.installCommand || "—"}
              </Typography>
            </Box>
            <Box className="detail-item detail-build">
              <Typography variant="caption" color="text.secondary">
                Build Command
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
              >
                {project?.buildCommand || "—"}
              </Typography>
            </Box>
            <Box className="detail-item detail-start">
              <Typography variant="caption" color="text.secondary">
                Start Command
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
              >
                {project?.startCommand || "—"}
              </Typography>
            </Box>
            {/* Webhook — full setup guide */}
            <Box
              className="detail-item detail-webhook"
              sx={{ gridColumn: "1 / -1", minWidth: 0 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  flexDirection: { xs: "column", sm: "row" },
                  mb: 1,
                  gap: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  GitHub Webhook
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    alignItems: "center",
                    alignSelf: { xs: "flex-start", sm: "auto" },
                    flexWrap: "wrap",
                  }}
                >
                  {webhookRegistered ? (
                    <Chip
                      label="⚡ Webhook Active"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: 10 }}
                    />
                  ) : (
                    <Chip
                      label="🕐 Polling (60s)"
                      size="small"
                      color="default"
                      variant="outlined"
                      sx={{ fontSize: 10 }}
                    />
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      fetchWebhookInfo();
                      setWebhookGuideOpen(true);
                    }}
                    sx={{ fontSize: 11, whiteSpace: "nowrap" }}
                  >
                    Setup Guide
                  </Button>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    opacity: 0.8,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {webhookUrl ||
                    `${import.meta.env.VITE_API_URL || window.location.origin}/api/webhook/${projectId}`}
                </Typography>
                <IconButton
                  size="small"
                  onClick={copyWebhookUrl}
                  className="copy-webhook-btn"
                >
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </Box>
            <Box className="detail-item detail-autodeploy">
              <Typography variant="caption" color="text.secondary">
                Auto-deploy
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Chip
                  label={project?.autoDeploy ? "Enabled" : "Disabled"}
                  size="small"
                  color={project?.autoDeploy ? "info" : "default"}
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
                {project?.autoDeploy && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: 10 }}
                  >
                    {webhookRegistered ? "via webhook" : "polls every 60s"}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Server Monitoring Bar */}
          {project?.server?._id && (
            <ServerMonitorBar
              serverId={project.server._id}
              serverStats={serverStats}
              setServerStats={setServerStats}
            />
          )}

          <Box
            className="deployment-actions"
            sx={{
              display: "flex",
              gap: { xs: 1, md: 1.5 },
              flexWrap: "wrap",
              "& > button": {
                flex: { xs: "1 1 calc(50% - 8px)", sm: "0 1 auto" },
              },
            }}
          >
            <Button
              variant="contained"
              size={isMobile ? "small" : "medium"}
              className="action-btn-deploy"
              startIcon={
                deploying ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <RocketLaunchIcon />
                )
              }
              onClick={() => setConfirmDeployOpen(true)}
              disabled={deploying}
            >
              Deploy
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              className="action-btn-export"
              startIcon={<DownloadIcon />}
              onClick={handleExportLogs}
              disabled={logs.length === 0}
            >
              Export
            </Button>
            <Button
              variant={deploying ? "contained" : "outlined"}
              color="error"
              size={isMobile ? "small" : "medium"}
              className="action-btn-stop"
              startIcon={<StopIcon />}
              onClick={handleStop}
              disabled={
                !deploying &&
                (deployStatus === "stopped" || deployStatus === "idle")
              }
            >
              {deploying ? "Cancel" : "Stop"}
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              className="action-btn-restart"
              startIcon={<RestartAltIcon />}
              onClick={handleRestart}
              disabled={deploying}
            >
              Restart
            </Button>
            <Button
              variant="outlined"
              color="info"
              size={isMobile ? "small" : "medium"}
              className="action-btn-schedule"
              startIcon={<ScheduleIcon />}
              onClick={() => {
                setScheduleDate("");
                setScheduleOpen(true);
              }}
              disabled={deploying}
            >
              Schedule
            </Button>
            {project?.outputPath && (
              <Button
                variant="outlined"
                color="warning"
                size={isMobile ? "small" : "medium"}
                className="action-btn-clean"
                startIcon={<CleaningServicesIcon />}
                onClick={() => setCleanOutputOpen(true)}
                disabled={deploying}
              >
                Clean Output
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              size={isMobile ? "small" : "medium"}
              className="action-btn-delete"
              startIcon={<DeleteForeverIcon />}
              onClick={() => setDeleteOpen(true)}
              disabled={deploying}
              sx={{ ml: { xs: 0, sm: "auto" } }}
            >
              Delete
            </Button>
          </Box>

          {/* Scheduled Deploy Indicator */}
          {project?.scheduledDeployAt && (
            <Box
              className="scheduled-deploy-indicator"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 1,
                p: 1.5,
                bgcolor: "rgba(99, 102, 241, 0.1)",
                borderRadius: 2,
                border: "1px solid rgba(99, 102, 241, 0.3)",
              }}
            >
              <ScheduleIcon sx={{ color: "info.main", fontSize: 18 }} />
              <Typography variant="body2" sx={{ flex: 1 }}>
                ⏰ Scheduled deploy at{" "}
                <strong>
                  {new Date(project.scheduledDeployAt).toLocaleString("vi-VN")}
                </strong>
              </Typography>
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={async () => {
                  try {
                    await api.delete(`/deployments/${projectId}/schedule`);
                    toast.success("Scheduled deploy cancelled");
                    const res = await api.get(`/projects/${projectId}`);
                    setProject(res.data);
                  } catch (err: any) {
                    toast.error("Failed to cancel");
                  }
                }}
              >
                Cancel
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Terminal Logs */}
      <Card sx={{ mb: 3 }} className="terminal-card">
        <CardContent sx={{ p: 0 }}>
          <Box
            className="terminal-toolbar"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.5,
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              📋 Deployment Logs
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                size="small"
                placeholder="Search..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                sx={{
                  width: { xs: 120, md: 200 },
                  "& .MuiOutlinedInput-root": {
                    height: 32,
                    fontSize: { xs: 11, md: 12 },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <SearchIcon
                      sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }}
                    />
                  ),
                }}
              />
              <Tooltip title="Export logs">
                <IconButton
                  size="small"
                  onClick={() => {
                    const text = logs
                      .map((l) => `[${l.timestamp}] ${l.log}`)
                      .join("\n");
                    const blob = new Blob([text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `deploy-${projectId}-${new Date().toISOString().slice(0, 10)}.log`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={logs.length === 0}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setLogs([])}>
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Terminal */}
          <Box
            className="terminal-container"
            sx={{
              bgcolor: "var(--terminal-bg)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Terminal header */}
            <Box
              className="terminal-header"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2,
                py: 1,
                bgcolor: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Box sx={{ display: "flex", gap: 0.8 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "#ff5f57",
                  }}
                />
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "#ffbd2e",
                  }}
                />
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "#28c840",
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {deploying ? "● Live" : "○ Idle"}
              </Typography>
            </Box>

            {/* Log body */}
            <div className="terminal-body" ref={logRef}>
              {logs.length === 0 ? (
                <div className="log-line info" style={{ color: "#6b7280" }}>
                  <span className="log-content">
                    Waiting for deployment logs... Click "Deploy" to start.
                  </span>
                </div>
              ) : (
                filteredLogs.map((entry, i) => {
                  const isStep = /^[📥📦🔨🚀⏹️🔧📂🎉❌⚙]/.test(entry.log);
                  return (
                    <div
                      key={i}
                      className={`log-line ${entry.type}${isStep ? " step-header" : ""}`}
                    >
                      <span className="log-time">
                        {new Date(entry.timestamp).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span className="log-content">{entry.log}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Box>
        </CardContent>
      </Card>

      {/* Remote Terminal */}
      {project?.server?._id && project?.deployPath && (
        <TerminalTabs
          serverId={project.server._id}
          initialPath={project.deployPath}
        />
      )}

      {/* Deployment History */}
      <Card className="deployment-history-card">
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            📜 Deployment History
          </Typography>

          {history.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", py: 4 }}
            >
              No deployment history yet
            </Typography>
          ) : (
            <Box
              className="history-list"
              sx={{ pl: 3, borderLeft: "2px solid", borderColor: "divider" }}
            >
              {history.map((dep, i) => (
                <Box
                  key={dep._id}
                  onClick={() => viewDeploymentLogs(dep)}
                  className={`history-item history-status-${dep.status}`}
                  sx={{
                    pb: 3,
                    position: "relative",
                    cursor: "pointer",
                    px: 1.5,
                    py: 1,
                    mx: -1.5,
                    borderRadius: 2,
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.04)",
                    },
                  }}
                >
                  {/* Dot */}
                  <Box
                    className="history-dot"
                    sx={{
                      position: "absolute",
                      left: -9,
                      top: 12,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor:
                        dep.status === "running"
                          ? "success.main"
                          : dep.status === "failed"
                            ? "error.main"
                            : "text.secondary",
                      border: "2px solid",
                      borderColor: "background.paper",
                      ...(dep.status === "running" || dep.status === "deploying"
                        ? { animation: "pulse-dot 1.5s ease-in-out infinite" }
                        : {}),
                    }}
                  />

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <Chip
                      label={dep.status}
                      size="small"
                      color={statusColor[dep.status] || "default"}
                      variant="outlined"
                      className={`history-chip history-chip-${dep.status}`}
                    />
                    {dep.commitHash && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          overflow: "hidden",
                          maxWidth: "60%",
                        }}
                      >
                        <Typography
                          variant="caption"
                          component="a"
                          href={dep.commitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="history-commit"
                          sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            color: dep.commitUrl
                              ? "primary.main"
                              : "text.secondary",
                            textDecoration: "none",
                            "&:hover": {
                              textDecoration: dep.commitUrl
                                ? "underline"
                                : "none",
                            },
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          #{dep.commitHash.substring(0, 7)}
                        </Typography>
                        {dep.commitMessage && (
                          <Tooltip title={dep.commitMessage}>
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{
                                fontSize: 13,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {dep.commitMessage}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    )}
                    <Box sx={{ flex: 1 }} />
                    {dep.commitHash && dep.status !== "running" && (
                      <Tooltip title={`Rollback to #${dep.commitHash}`}>
                        <IconButton
                          size="small"
                          color="warning"
                          className="history-rollback-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRollbackTarget(dep);
                            setRollbackOpen(true);
                          }}
                        >
                          <ReplayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {dep.commitHash &&
                      i < history.length - 1 &&
                      history[i + 1]?.commitHash && (
                        <Tooltip title="Compare with previous">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDiffLoading(true);
                              setDiffOpen(true);
                              setDiffContent("");
                              try {
                                const { data } = await api.get(
                                  `/deployments/${projectId}/diff?from=${history[i + 1].commitHash}&to=${dep.commitHash}`,
                                );
                                setDiffContent(
                                  typeof data.diff === "string"
                                    ? data.diff
                                    : JSON.stringify(
                                        data.diff || data,
                                        null,
                                        2,
                                      ),
                                );
                              } catch (err: any) {
                                setDiffContent(
                                  err.response?.data?.message ||
                                    "Failed to load diff",
                                );
                              } finally {
                                setDiffLoading(false);
                              }
                            }}
                          >
                            <CompareArrowsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    <Tooltip title="View logs">
                      <HistoryIcon
                        fontSize="small"
                        sx={{ color: "text.secondary", opacity: 0.6 }}
                      />
                    </Tooltip>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    {dep.triggeredBy === "manual"
                      ? "👤"
                      : dep.triggeredBy === "webhook"
                        ? "🔗"
                        : "⏱️"}{" "}
                    {dep.triggeredBy}
                    {dep.triggeredByUser &&
                      ` by ${dep.triggeredByUser.username}`}
                  </Typography>

                  {/* Error message */}
                  {dep.errorMessage && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "error.main",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        mt: 0.5,
                        p: 1,
                        bgcolor: "rgba(239,68,68,0.1)",
                        borderRadius: 1,
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      ❌ {dep.errorMessage}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    {new Date(dep.startedAt).toLocaleString("vi-VN")}
                    {dep.finishedAt &&
                      ` → ${new Date(dep.finishedAt).toLocaleTimeString("vi-VN")}`}
                  </Typography>
                  {i < history.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Historical Logs Dialog */}
      <Dialog
        open={!!viewingLogs}
        onClose={() => setViewingLogs(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        className="historical-logs-dialog"
      >
        <DialogTitle className="logs-dialog-title">
          Logs — {viewingLogs?.status}{" "}
          {viewingLogs?.commitHash && `#${viewingLogs.commitHash}`}
        </DialogTitle>
        <DialogContent className="logs-dialog-content">
          <Box
            className="logs-container"
            sx={{
              bgcolor: "var(--terminal-bg)",
              p: 2,
              borderRadius: 2,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              maxHeight: 400,
              overflow: "auto",
              color: "#c9d1d9",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {historicalLogsLoading ? (
              <Box sx={{ py: 1 }} className="logs-loading">
                <Skeleton variant="text" width="100%" height={18} />
                <Skeleton variant="text" width="90%" height={18} />
                <Skeleton variant="text" width="95%" height={18} />
              </Box>
            ) : historicalLogs.length === 0 ? (
              <Typography
                variant="caption"
                color="text.secondary"
                className="no-logs-message"
              >
                No logs recorded for this deployment
              </Typography>
            ) : (
              historicalLogs.map((entry, i) => {
                const text =
                  typeof entry === "string"
                    ? entry
                    : entry.log || JSON.stringify(entry);
                const type =
                  typeof entry === "string" ? "info" : entry.type || "info";
                const timestamp =
                  typeof entry !== "string" && entry.timestamp
                    ? new Date(entry.timestamp).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : null;
                const color =
                  type === "error"
                    ? "#f85149"
                    : type === "success"
                      ? "#3fb950"
                      : type === "warning"
                        ? "#eab308"
                        : "#c9d1d9";
                return (
                  <div
                    key={i}
                    className={`log-entry log-${type}`}
                    style={{
                      marginBottom: 4,
                      whiteSpace: "pre-wrap",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    {timestamp && (
                      <span
                        className="log-timestamp"
                        style={{
                          color: "#6b7280",
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      >
                        {timestamp}
                      </span>
                    )}
                    <span style={{ color }} className="log-text">
                      {text}
                    </span>
                  </div>
                );
              })
            )}
          </Box>
          {viewingLogs?.errorMessage && (
            <Box
              className="logs-error-details"
              sx={{
                mt: 2,
                p: 2,
                bgcolor: "rgba(239,68,68,0.1)",
                borderRadius: 2,
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <Typography
                variant="caption"
                fontWeight={600}
                color="error"
                className="error-title"
              >
                Error Details:
              </Typography>
              <Typography
                variant="body2"
                className="error-message"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: "error.main",
                  mt: 0.5,
                }}
              >
                {viewingLogs.errorMessage}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="logs-dialog-actions">
          <Button
            onClick={() => setViewingLogs(null)}
            className="btn-close-logs"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Drawer */}
      <Drawer
        anchor="right"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        className="edit-project-drawer"
        PaperProps={{
          sx: { width: { xs: "100%", sm: 500 }, p: 0 },
        }}
      >
        <form
          className="edit-project-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              const payload = {
                ...editForm,
                envVars: editForm.envVars.reduce(
                  (acc, curr) => {
                    if (curr.key) acc[curr.key] = curr.value;
                    return acc;
                  },
                  {} as Record<string, string>,
                ),
              };
              await api.put(`/projects/${projectId}`, payload);
              toast.success("Project updated!");
              setEditOpen(false);
              // Refresh project data
              const res = await api.get(`/projects/${projectId}`);
              setProject(res.data);
            } catch (err: any) {
              toast.error(err.response?.data?.message || "Update failed");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            className="edit-drawer-title"
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Edit Project
            </Typography>
          </Box>
          <Box
            sx={{ p: 3, overflowY: "auto", flex: 1 }}
            className="edit-drawer-content"
          >
            <TextField
              label="Project Name"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              required
              sx={{ mb: 2 }}
              className="input-project-name"
            />
            <TextField
              label="Branch"
              value={editForm.branch}
              onChange={(e) =>
                setEditForm({ ...editForm, branch: e.target.value })
              }
              sx={{ mb: 2 }}
              className="input-project-branch"
            />
            <TextField
              label="Repo Folder (Optional)"
              placeholder="frontend, packages/api, ..."
              value={editForm.repoFolder}
              onChange={(e) =>
                setEditForm({ ...editForm, repoFolder: e.target.value })
              }
              sx={{ mb: 2 }}
              helperText="Subfolder inside the repo to run commands in. Leave empty for root."
              className="input-repo-folder"
              InputProps={{
                endAdornment: (
                  <Tooltip title="Browse folders on server">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => setFolderBrowserOpen(true)}
                        disabled={!editForm.deployPath}
                        className="btn-browse-folder"
                      >
                        <FolderOpenIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ),
              }}
            />
            <FolderBrowserDialog
              open={folderBrowserOpen}
              onClose={() => setFolderBrowserOpen(false)}
              onSelect={(path) =>
                setEditForm((prev) => ({ ...prev, repoFolder: path }))
              }
              serverId={
                project?.server?._id || project?.server?.toString() || ""
              }
              repoUrl={project?.repoUrl || ""}
              branch={editForm.branch || project?.branch || "main"}
              deployPath={editForm.deployPath}
            />
            <TextField
              label="Deploy Path (Source)"
              value={editForm.deployPath}
              onChange={(e) =>
                setEditForm({ ...editForm, deployPath: e.target.value })
              }
              required
              sx={{ mb: 2 }}
              helperText="Full path on VPS where code will be cloned"
              className="input-deploy-path"
            />
            <TextField
              label="Output Path (Optional)"
              value={editForm.outputPath}
              onChange={(e) =>
                setEditForm({ ...editForm, outputPath: e.target.value })
              }
              sx={{ mb: 2 }}
              helperText="If set, build output will be copied here after build"
              className="input-output-path"
            />
            <TextField
              label="Build Output Folder (Optional)"
              placeholder="build or dist"
              value={editForm.buildOutputDir}
              onChange={(e) =>
                setEditForm({ ...editForm, buildOutputDir: e.target.value })
              }
              sx={{ mb: 2 }}
              helperText="Subfolder to copy (e.g., 'build' for CRA, 'dist' for Vite)"
              className="input-build-output-dir"
            />
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ mb: 1, display: "block" }}
              className="commands-title"
            >
              COMMANDS
            </Typography>
            <Box
              className="commands-grid"
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Install"
                value={editForm.installCommand}
                onChange={(e) =>
                  setEditForm({ ...editForm, installCommand: e.target.value })
                }
                size="small"
                className="input-install-cmd"
                InputProps={{
                  sx: {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  },
                }}
              />
              <TextField
                label="Build"
                value={editForm.buildCommand}
                onChange={(e) =>
                  setEditForm({ ...editForm, buildCommand: e.target.value })
                }
                size="small"
                className="input-build-cmd"
                InputProps={{
                  sx: {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  },
                }}
              />
              <TextField
                label="Start"
                value={editForm.startCommand}
                onChange={(e) =>
                  setEditForm({ ...editForm, startCommand: e.target.value })
                }
                size="small"
                className="input-start-cmd"
                InputProps={{
                  sx: {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  },
                }}
              />
              <TextField
                label="Stop"
                value={editForm.stopCommand}
                onChange={(e) =>
                  setEditForm({ ...editForm, stopCommand: e.target.value })
                }
                size="small"
                className="input-stop-cmd"
                InputProps={{
                  sx: {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  },
                }}
              />
            </Box>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ mb: 1, mt: 1, display: "block" }}
              className="hooks-title"
            >
              HOOKS
            </Typography>
            <Box
              className="hooks-grid"
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Pre-Deploy"
                value={editForm.preDeployCommand}
                onChange={(e) =>
                  setEditForm({ ...editForm, preDeployCommand: e.target.value })
                }
                size="small"
                className="input-pre-deploy"
                placeholder="e.g. npm run pre-deploy"
                InputProps={{
                  sx: {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  },
                }}
              />
              <TextField
                label="Post-Deploy"
                value={editForm.postDeployCommand}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    postDeployCommand: e.target.value,
                  })
                }
                size="small"
                className="input-post-deploy"
                placeholder="e.g. npm run migrate"
                InputProps={{
                  sx: {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  },
                }}
              />
            </Box>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ mb: 1, display: "block" }}
              className="health-title"
            >
              HEALTH CHECK
            </Typography>
            <Box
              className="health-check-grid"
              sx={{
                display: "grid",
                gridTemplateColumns: "3fr 1fr",
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Health Check URL"
                value={editForm.healthCheckUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, healthCheckUrl: e.target.value })
                }
                size="small"
                placeholder="https://example.com/health"
                className="input-health-url"
              />
              <TextField
                label="Interval (s)"
                type="number"
                value={editForm.healthCheckInterval}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    healthCheckInterval: parseInt(e.target.value) || 60,
                  })
                }
                size="small"
                className="input-health-interval"
              />
            </Box>

            {/* Environment Variables */}
            <Box sx={{ mb: 2 }} className="env-vars-container">
              <Box
                className="env-vars-header"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                  className="env-vars-title"
                >
                  ENVIRONMENT VARIABLES
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={addEditEnvVar}
                  className="btn-add-env"
                >
                  Add Variable
                </Button>
              </Box>
              {editForm.envVars.map((env, i) => (
                <Box
                  key={i}
                  sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}
                  className={`env-var-row row-${i}`}
                >
                  <TextField
                    size="small"
                    placeholder="KEY"
                    value={env.key}
                    onChange={(e) => updateEditEnvVar(i, "key", e.target.value)}
                    className="input-env-key"
                    sx={{
                      flex: 1,
                      "& input": {
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    placeholder="value"
                    value={env.value}
                    onChange={(e) =>
                      updateEditEnvVar(i, "value", e.target.value)
                    }
                    className="input-env-value"
                    sx={{
                      flex: 2,
                      "& input": {
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                      },
                    }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeEditEnvVar(i)}
                    className="btn-remove-env"
                  >
                    <RemoveCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              {editForm.envVars.length === 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontStyle: "italic" }}
                  className="no-env-vars-msg"
                >
                  No environment variables defined
                </Typography>
              )}
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={editForm.autoDeploy}
                  onChange={(e) =>
                    setEditForm({ ...editForm, autoDeploy: e.target.checked })
                  }
                  className="switch-auto-deploy"
                />
              }
              label="Auto-deploy"
              className="label-auto-deploy"
            />
          </Box>
          <Box
            sx={{
              p: 2,
              borderTop: "1px solid",
              borderColor: "divider",
              display: "flex",
              gap: 1,
              justifyContent: "flex-end",
            }}
            className="edit-drawer-actions"
          >
            <Button onClick={() => setEditOpen(false)} className="btn-cancel">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={
                saving ? (
                  <Skeleton variant="circular" width={16} height={16} />
                ) : null
              }
              className="btn-save"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="contained"
              color="warning"
              disabled={saving}
              startIcon={<ReplayIcon />}
              onClick={async () => {
                setSaving(true);
                try {
                  const payload = {
                    ...editForm,
                    envVars: editForm.envVars.reduce(
                      (acc, curr) => {
                        if (curr.key) acc[curr.key] = curr.value;
                        return acc;
                      },
                      {} as Record<string, string>,
                    ),
                  };
                  const { data } = await api.put(
                    `/projects/${projectId}/save-restart`,
                    payload,
                  );
                  toast.success("Saved & restart initiated!");
                  setEditOpen(false);
                  setProject(data.project);
                  // Connect to deployment logs
                  setActiveDeploymentId(data.deploymentId);
                  setDeploying(true);
                  setDeployStatus("deploying");
                  setLogs([]);
                  connectSocket().emit("join:deployment", data.deploymentId);
                } catch (err: any) {
                  toast.error(
                    err.response?.data?.message || "Save & restart failed",
                  );
                } finally {
                  setSaving(false);
                }
              }}
              className="btn-save-restart"
            >
              Save & Restart
            </Button>
          </Box>
        </form>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeletePassword("");
        }}
        className="delete-project-dialog"
      >
        <DialogTitle
          sx={{ color: "error.main", fontWeight: 700 }}
          className="delete-dialog-title"
        >
          ⚠️ Delete Project
        </DialogTitle>
        <DialogContent className="delete-dialog-content">
          <Typography variant="body1" sx={{ mb: 2 }}>
            Bạn có chắc muốn xóa project <strong>{project?.name}</strong>?
          </Typography>
          <Typography
            variant="body2"
            color="error"
            className="delete-warning-box"
            sx={{
              bgcolor: "rgba(239,68,68,0.08)",
              p: 1.5,
              borderRadius: 1,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              mb: 2,
            }}
          >
            Hành động này sẽ:
            <br />• Dừng process đang chạy
            <br />• Xóa thư mục <strong>{project?.deployPath}</strong> trên
            server
            {project?.outputPath && (
              <>
                <br />• Xóa thư mục output <strong>{project.outputPath}</strong>{" "}
                trên server
              </>
            )}
            <br />• Xóa toàn bộ deployment history
            <br />• Không thể hoàn tác!
          </Typography>
          <TextField
            label="Nhập mật khẩu để xác nhận"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            fullWidth
            autoFocus
            size="small"
            sx={{ mt: 1 }}
            className="input-delete-password"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }} className="delete-dialog-actions">
          <Button
            onClick={() => {
              setDeleteOpen(false);
              setDeletePassword("");
            }}
            className="btn-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleting || !deletePassword}
            startIcon={
              deleting ? (
                <Skeleton variant="circular" width={16} height={16} />
              ) : (
                <DeleteForeverIcon />
              )
            }
            onClick={async () => {
              setDeleting(true);
              try {
                await api.delete(`/projects/${projectId}`, {
                  data: { password: deletePassword },
                });
                toast.success("Project deleted!");
                navigate("/projects");
              } catch (err: any) {
                toast.error(err.response?.data?.message || "Delete failed");
                setDeleting(false);
              }
            }}
            className="btn-delete-confirm"
          >
            {deleting ? "Deleting..." : "Delete Forever"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clean Output Confirmation Dialog */}
      <Dialog
        open={cleanOutputOpen}
        onClose={() => setCleanOutputOpen(false)}
        className="clean-output-dialog"
      >
        <DialogTitle
          sx={{ color: "warning.main", fontWeight: 700 }}
          className="clean-dialog-title"
        >
          🧹 Clean Output Path
        </DialogTitle>
        <DialogContent className="clean-dialog-content">
          <Typography variant="body1" sx={{ mb: 1 }}>
            Bạn có chắc muốn xóa folder output trên VPS?
          </Typography>
          <Typography
            variant="body2"
            className="clean-warning-box"
            sx={{
              bgcolor: "rgba(255,152,0,0.08)",
              p: 1.5,
              borderRadius: 1,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
            }}
          >
            📂 <strong>{project?.outputPath}</strong> sẽ bị xóa hoàn toàn
            <br />• Deploy path (source code) sẽ KHÔNG bị ảnh hưởng
            <br />• Bạn có thể deploy lại để tạo lại output
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }} className="clean-dialog-actions">
          <Button
            onClick={() => setCleanOutputOpen(false)}
            className="btn-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={cleaningOutput}
            startIcon={
              cleaningOutput ? (
                <Skeleton variant="circular" width={16} height={16} />
              ) : (
                <CleaningServicesIcon />
              )
            }
            onClick={async () => {
              if (!project) return;
              setCleaningOutput(true);
              try {
                const { data } = await api.delete(
                  `/projects/${project._id}/output`,
                );
                toast.success(data.message);
                setCleanOutputOpen(false);
              } catch (err: any) {
                toast.error(
                  err.response?.data?.message || "Failed to clean output",
                );
              } finally {
                setCleaningOutput(false);
              }
            }}
            className="btn-confirm-clean"
          >
            {cleaningOutput ? "Deleting..." : "Delete Output"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diff Viewer Dialog */}
      <Dialog
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        maxWidth="md"
        fullWidth
        className="diff-viewer-dialog"
      >
        <DialogTitle sx={{ fontWeight: 600 }} className="diff-dialog-title">
          🔍 Code Diff
        </DialogTitle>
        <DialogContent sx={{ p: 0 }} className="diff-dialog-content">
          {diffLoading ? (
            <Box
              sx={{ display: "flex", justifyContent: "center", py: 4 }}
              className="diff-loading"
            >
              <Box sx={{ width: "100%" }}>
                <Skeleton variant="text" width="100%" height={18} />
                <Skeleton variant="text" width="85%" height={18} />
                <Skeleton variant="text" width="92%" height={18} />
                <Skeleton variant="text" width="78%" height={18} />
              </Box>
            </Box>
          ) : (
            <Box
              className="diff-content"
              sx={{
                bgcolor: "var(--terminal-bg)",
                p: 2,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                lineHeight: 1.6,
                overflow: "auto",
                maxHeight: 500,
                whiteSpace: "pre",
              }}
            >
              {(diffContent || "").split("\n").map((line, i) => {
                let color = "#c9d1d9";
                if (line.startsWith("+")) color = "#3fb950";
                else if (line.startsWith("-")) color = "#f85149";
                else if (line.startsWith("@@")) color = "#79c0ff";
                else if (line.startsWith("diff") || line.startsWith("index"))
                  color = "#8b949e";

                const lineClass = line.startsWith("+")
                  ? "diff-added"
                  : line.startsWith("-")
                    ? "diff-removed"
                    : line.startsWith("@@")
                      ? "diff-meta"
                      : "diff-context";

                return (
                  <div
                    key={i}
                    style={{ color, minHeight: 18 }}
                    className={`diff-line ${lineClass}`}
                  >
                    {line || " "}
                  </div>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }} className="diff-dialog-actions">
          <Button onClick={() => setDiffOpen(false)} className="btn-close">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        maxWidth="xs"
        fullWidth
        className="schedule-dialog"
      >
        <DialogTitle sx={{ fontWeight: 600 }} className="schedule-dialog-title">
          ⏰ Schedule Deployment
        </DialogTitle>
        <DialogContent
          sx={{ pt: "16px !important" }}
          className="schedule-dialog-content"
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              label="Schedule Time"
              value={scheduleDate ? dayjs(scheduleDate) : null}
              onChange={(newValue) =>
                setScheduleDate(newValue ? newValue.toISOString() : "")
              }
              minDateTime={dayjs()}
              slotProps={{
                textField: {
                  fullWidth: true,
                  className: "input-schedule-date",
                },
              }}
            />
          </LocalizationProvider>
        </DialogContent>
        <DialogActions
          sx={{ px: 3, pb: 2 }}
          className="schedule-dialog-actions"
        >
          <Button onClick={() => setScheduleOpen(false)} className="btn-cancel">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="info"
            disabled={!scheduleDate}
            startIcon={<ScheduleIcon />}
            onClick={async () => {
              try {
                await api.post(`/deployments/${projectId}/schedule`, {
                  scheduledAt: new Date(scheduleDate).toISOString(),
                });
                toast.success("Deploy scheduled!");
                setScheduleOpen(false);
                const res = await api.get(`/projects/${projectId}`);
                setProject(res.data);
              } catch (err: any) {
                toast.error(
                  err.response?.data?.message || "Failed to schedule",
                );
              }
            }}
            className="btn-confirm-schedule"
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* F11: Confirm Deploy Dialog */}
      <Dialog
        open={confirmDeployOpen}
        onClose={() => setConfirmDeployOpen(false)}
        maxWidth="xs"
        fullWidth
        className="confirm-deploy-dialog"
      >
        <DialogTitle className="confirm-dialog-title">
          🚀 Confirm Deployment
        </DialogTitle>
        <DialogContent className="confirm-dialog-content">
          <Typography>
            Deploy <strong>{project?.name}</strong> to{" "}
            <strong>{project?.server?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Branch: <strong>{project?.branch}</strong>
          </Typography>
        </DialogContent>
        <DialogActions className="confirm-dialog-actions">
          <Button
            onClick={() => setConfirmDeployOpen(false)}
            className="btn-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeploy}
            startIcon={<RocketLaunchIcon />}
            className="btn-confirm-deploy"
          >
            Deploy Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog
        open={rollbackOpen}
        onClose={() => {
          setRollbackOpen(false);
          setRollbackTarget(null);
        }}
        maxWidth="xs"
        fullWidth
        className="rollback-dialog"
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
          className="rollback-dialog-title"
        >
          <ReplayIcon color="warning" />
          Confirm Rollback
        </DialogTitle>
        <DialogContent className="rollback-dialog-content">
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to rollback to this version?
          </Typography>
          {rollbackTarget && (
            <Box
              className="rollback-target-info"
              sx={{
                bgcolor: "var(--terminal-bg)",
                p: 1.5,
                borderRadius: 1,
                border: "1px solid rgba(255,255,255,0.1)",
                mb: 2,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Commit
              </Typography>
              <Typography
                variant="body2"
                className="rollback-commit"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#79c0ff",
                  mb: 1,
                }}
              >
                #{rollbackTarget.commitHash}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Deployed At
              </Typography>
              <Typography variant="body2" className="rollback-date">
                {new Date(rollbackTarget.startedAt).toLocaleString("vi-VN")}
              </Typography>
            </Box>
          )}
          <Typography
            variant="caption"
            color="warning.main"
            className="rollback-warning"
            sx={{
              display: "block",
              bgcolor: "rgba(234,179,8,0.1)",
              p: 1,
              borderRadius: 1,
              border: "1px solid rgba(234,179,8,0.2)",
            }}
          >
            ⚠️ This will redeploy the selected version immediately.
          </Typography>
        </DialogContent>
        <DialogActions className="rollback-dialog-actions">
          <Button
            onClick={() => {
              setRollbackOpen(false);
              setRollbackTarget(null);
            }}
            className="btn-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<ReplayIcon />}
            onClick={async () => {
              if (!rollbackTarget?.commitHash) return;
              try {
                setRollbackOpen(false);
                setDeploying(true);
                setDeployStatus("deploying");
                setLogs([]);
                const { data } = await api.post(
                  `/deployments/${projectId}/rollback`,
                  { commitHash: rollbackTarget.commitHash },
                );
                setActiveDeploymentId(data.deploymentId);
                toast.success(
                  `Rolling back to ${rollbackTarget.commitHash}...`,
                );
                setRollbackTarget(null);
              } catch (err: any) {
                toast.error(err.response?.data?.message || "Rollback failed");
                setDeploying(false);
              }
            }}
            className="btn-confirm-rollback"
          >
            Rollback
          </Button>
        </DialogActions>
      </Dialog>

      {/* Webhook Setup Guide Dialog */}
      <Dialog
        open={webhookGuideOpen}
        onClose={() => setWebhookGuideOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>⚡ GitHub Webhook Setup</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect your GitHub repo so deploys happen{" "}
            <strong>instantly</strong> on every push — no more 60-second
            polling.
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Step 1 — Copy the Webhook URL
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              p: 1.5,
              bgcolor: "rgba(0,0,0,0.2)",
              borderRadius: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: "monospace",
                fontSize: 12,
                flex: 1,
                wordBreak: "break-all",
              }}
            >
              {webhookUrl || `http://localhost:5012/api/webhook/${projectId}`}
            </Typography>
            <Tooltip title="Copy URL">
              <IconButton size="small" onClick={copyWebhookUrl}>
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Step 2 — Copy the Secret
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              p: 1.5,
              bgcolor: "rgba(0,0,0,0.2)",
              borderRadius: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: "monospace",
                fontSize: 12,
                flex: 1,
                letterSpacing: showSecret ? 0 : 3,
              }}
            >
              {showSecret
                ? webhookSecret || "No secret set"
                : "••••••••••••••••••••"}
            </Typography>
            <Tooltip title={showSecret ? "Hide" : "Reveal"}>
              <IconButton size="small" onClick={() => setShowSecret((v) => !v)}>
                <Typography sx={{ fontSize: 14 }}>
                  {showSecret ? "🙈" : "👁"}
                </Typography>
              </IconButton>
            </Tooltip>
            {webhookSecret && (
              <Tooltip title="Copy secret">
                <IconButton
                  size="small"
                  onClick={async () => {
                    await navigator.clipboard.writeText(webhookSecret);
                    toast.success("Secret copied!");
                  }}
                >
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Step 3 — Add Webhook in GitHub
          </Typography>
          <Box component="ol" sx={{ pl: 2, mb: 2, "& li": { mb: 0.5 } }}>
            <Typography component="li" variant="body2">
              Go to your GitHub repo →{" "}
              <strong>Settings → Webhooks → Add webhook</strong>
            </Typography>
            <Typography component="li" variant="body2">
              Paste the Webhook URL above into <em>Payload URL</em>
            </Typography>
            <Typography component="li" variant="body2">
              Set <em>Content type</em> to <code>application/json</code>
            </Typography>
            <Typography component="li" variant="body2">
              Paste the Secret into <em>Secret</em>
            </Typography>
            <Typography component="li" variant="body2">
              Choose <strong>"Just the push event"</strong> → click{" "}
              <strong>Add webhook</strong>
            </Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Step 4 — Mark as Done (disables slow polling)
          </Typography>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: webhookRegistered ? "success.main" : "divider",
              bgcolor: webhookRegistered
                ? "rgba(46,160,67,0.08)"
                : "transparent",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={webhookRegistered}
                  onChange={(e) =>
                    handleToggleWebhookRegistered(e.target.checked)
                  }
                  disabled={savingWebhookReg}
                  color="success"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {webhookRegistered
                      ? "⚡ Webhook active — polling disabled"
                      : "Webhook not yet registered"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {webhookRegistered
                      ? "Deploys trigger instantly when you push to GitHub"
                      : "Toggle after setting up webhook above"}
                  </Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebhookGuideOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeploymentDetail;
