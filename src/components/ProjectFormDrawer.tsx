import React, { useState, useCallback, useEffect, useRef, memo } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Skeleton,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from "@mui/material";
import Drawer from "@mui/material/Drawer";
import InputAdornment from "@mui/material/InputAdornment";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import GitHubIcon from "@mui/icons-material/GitHub";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderBrowserDialog from "./FolderBrowserDialog";
import toast from "react-hot-toast";
import api from "../services/api";
import { type Project, type Server } from "./ProjectCard";

export interface FormState {
  name: string;
  repoUrl: string;
  branch: string;
  repoFolder: string;
  server: string;
  deployPath: string;
  outputPath: string;
  buildOutputDir: string;
  buildCommand: string;
  installCommand: string;
  startCommand: string;
  stopCommand: string;
  autoDeploy: boolean;
  processManager: "nohup" | "pm2";
}

const DEFAULT_FORM: FormState = {
  name: "",
  repoUrl: "",
  branch: "main",
  repoFolder: "",
  server: "",
  deployPath: "",
  outputPath: "",
  buildOutputDir: "",
  buildCommand: "npm run build",
  installCommand: "npm install",
  startCommand: "npm start",
  stopCommand: "",
  autoDeploy: false,
  processManager: "nohup",
};

interface ProjectFormDrawerProps {
  open: boolean;
  editing: Project | null;
  servers: Server[];
  onClose: () => void;
  onSaved: () => void;
}

const ProjectFormDrawer = memo(function ProjectFormDrawer({
  open,
  editing,
  servers,
  onClose,
  onSaved,
}: ProjectFormDrawerProps) {
  const { t } = useTranslation();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [detectingBranch, setDetectingBranch] = useState(false);
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(0);

  // ── GitHub state ────────────────────────────────────────────────────────────
  const [repos, setRepos] = useState<any[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposPage, setReposPage] = useState(1);
  const [reposHasMore, setReposHasMore] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [githubConnected, setGithubConnected] = useState(true);
  const [analyzingRepo, setAnalyzingRepo] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchKey = useRef(""); // tracks "page-search" to avoid redundant fetches
  const sentinelRef = useRef<HTMLDivElement | null>(null); // infinite scroll sentinel

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        repoUrl: editing.repoUrl,
        branch: editing.branch,
        repoFolder: editing.repoFolder || "",
        server: editing.server._id,
        deployPath: editing.deployPath,
        outputPath: editing.outputPath || "",
        buildOutputDir: editing.buildOutputDir || "",
        buildCommand: editing.buildCommand,
        installCommand: editing.installCommand,
        startCommand: editing.startCommand,
        stopCommand: editing.stopCommand,
        autoDeploy: editing.autoDeploy,
        processManager: editing.processManager || "nohup",
      });
      const vars = editing.envVars
        ? Object.entries(editing.envVars).map(([key, value]) => ({
            key,
            value,
          }))
        : [];
      setEnvVars(vars);
      setActiveTab(0);
    } else {
      setForm(DEFAULT_FORM);
      setEnvVars([]);
      setActiveTab(0);
      setSelectedRepo(null);
      setRepoSearch("");
      setReposPage(1);
    }
  }, [open, editing]);

  // ── Server-side fetch repos ──────────────────────────────────────────────────
  const fetchRepos = useCallback(
    async (page: number, search: string, append = false) => {
      setReposLoading(true);
      try {
        const params: Record<string, any> = { page, per_page: 20 };
        if (search.trim()) params.search = search.trim();
        const { data } = await api.get("/auth/github/repos", { params });
        // Support both old (array) and new ({ repos, hasMore }) response shapes
        const newRepos: any[] = Array.isArray(data) ? data : data.repos || [];
        const hasMore: boolean = Array.isArray(data)
          ? data.length === 20
          : data.hasMore || false;
        setRepos((prev) => (append ? [...prev, ...newRepos] : newRepos));
        setReposHasMore(hasMore);
        setGithubConnected(true);
      } catch (error: any) {
        console.error("Failed to fetch repos", error);
        if (
          error.response?.status === 400 &&
          error.response?.data?.message === "GitHub not connected"
        ) {
          setGithubConnected(false);
        }
      } finally {
        setReposLoading(false);
      }
    },
    [],
  );

  // Initial load + search-change: reset list and fetch page 1
  useEffect(() => {
    if (!open || activeTab !== 1 || selectedRepo) return;
    const key = `1::${repoSearch}`;
    if (key === lastFetchKey.current && repos.length > 0) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(
      () => {
        lastFetchKey.current = key;
        setReposPage(1);
        setRepos([]);
        fetchRepos(1, repoSearch, false);
      },
      repoSearch ? 500 : 0,
    );
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, repoSearch, selectedRepo, fetchRepos]);

  // IntersectionObserver: load next page when sentinel comes into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && reposHasMore && !reposLoading) {
          const nextPage = reposPage + 1;
          setReposPage(nextPage);
          lastFetchKey.current = `${nextPage}::${repoSearch}`;
          fetchRepos(nextPage, repoSearch, true);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [reposHasMore, reposLoading, reposPage, repoSearch, fetchRepos]);

  // ── Detect branch ────────────────────────────────────────────────────────────
  const detectBranch = async () => {
    if (!form.repoUrl || !form.server) {
      toast.error("Please select a server first");
      return;
    }
    setDetectingBranch(true);
    const toastId = toast.loading("Checking repository...");
    try {
      const server = servers.find((s) => s._id === form.server);
      if (!server) throw new Error("Server not found");
      const { data } = await api.post("/projects/detect-branch", {
        repoUrl: form.repoUrl,
        serverId: server._id,
      });
      if (data.branch) {
        setForm((prev) => ({ ...prev, branch: data.branch }));
        toast.success(`Branch detected: ${data.branch}`, { id: toastId });
      } else if (data.branches?.length > 0) {
        const defaultBranch = data.branches.includes("main")
          ? "main"
          : data.branches[0];
        setForm((prev) => ({ ...prev, branch: defaultBranch }));
        toast.success(`Branch detected: ${defaultBranch}`, { id: toastId });
      } else {
        throw new Error(t("projects.noBranchesFound"));
      }
      if (data.framework) {
        setForm((prev) => ({
          ...prev,
          buildCommand: data.framework.buildCommand || prev.buildCommand,
          startCommand: data.framework.startCommand || prev.startCommand,
          buildOutputDir: data.framework.outputDir || prev.buildOutputDir,
        }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to detect branch", {
        id: toastId,
      });
    } finally {
      setDetectingBranch(false);
    }
  };

  // ── Import repo (Step 1 → Step 2) ────────────────────────────────────────────
  const handleSelectRepo = async (repo: any) => {
    setAnalyzingRepo(true);
    setSelectedRepo(repo);
    const toastId = toast.loading("Analyzing repository...");
    try {
      // repo.owner is now an object { login } from the updated backend
      const ownerLogin = repo.owner?.login || repo.owner || "";
      const { data } = await api.post("/auth/github/detect-framework", {
        owner: ownerLogin,
        repo: repo.name,
        branch: repo.default_branch || repo.defaultBranch || "main",
      });
      setForm((prev) => ({
        ...prev,
        name: repo.name,
        repoUrl: repo.html_url || repo.htmlUrl || "",
        branch: repo.default_branch || repo.defaultBranch || "main",
        buildCommand: data.buildCommand || prev.buildCommand,
        startCommand: data.startCommand || prev.startCommand,
        buildOutputDir: data.outputDir || prev.buildOutputDir,
      }));
      toast.success(
        `Imported ${repo.name} — ${data.type !== "unknown" ? data.type : "Generic project"}`,
        { id: toastId },
      );
    } catch (error) {
      toast.error("Failed to analyze repository — basic info imported", {
        id: toastId,
      });
      setForm((prev) => ({
        ...prev,
        name: repo.name,
        repoUrl: repo.html_url || repo.htmlUrl || "",
        branch: repo.default_branch || repo.defaultBranch || "main",
      }));
    } finally {
      setAnalyzingRepo(false);
    }
  };

  const handleBackToRepoList = () => {
    setSelectedRepo(null);
    setForm(DEFAULT_FORM);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.server || !form.repoUrl || !form.deployPath) {
      toast.error(t("projects.validationError"));
      return;
    }
    setSubmitting(true);
    const envVarsObj: Record<string, string> = {};
    envVars.forEach(({ key, value }) => {
      if (key.trim()) envVarsObj[key.trim()] = value;
    });
    const payload = { ...form, envVars: envVarsObj };
    try {
      if (editing) {
        await api.put(`/projects/${editing._id}`, payload);
        toast.success("Updated!");
      } else {
        const { data: newProject } = await api.post("/projects", payload);

        // Auto-setup webhook if created via GitHub Integration
        let webhookSuccess = false;
        if (activeTab === 1 && selectedRepo) {
          try {
            const ownerLogin =
              selectedRepo.owner?.login || selectedRepo.owner || "";
            await api.post("/auth/github/webhook", {
              owner: ownerLogin,
              repo: selectedRepo.name,
              projectId: newProject._id,
            });
            webhookSuccess = true;
          } catch (err) {
            console.error("Failed to setup webhook", err);
          }
        }

        if (webhookSuccess) {
          toast.success("Project created & Webhook registered! 🚀");
        } else if (activeTab === 1 && selectedRepo) {
          toast.error("Created, but webhook setup failed.");
        } else {
          toast.success("Created!");
        }
      }
      onClose();
      onSaved();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared configure form ────────────────────────────────────────────────────
  const renderConfigureForm = (isGitHubMode = false) => (
    <>
      {/* Selected repo banner (GitHub step 2) */}
      {isGitHubMode && selectedRepo && (
        <Alert
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToRepoList}
            >
              Change
            </Button>
          }
        >
          <Typography variant="body2" fontWeight={600}>
            {selectedRepo.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedRepo.private ? "Private" : "Public"}
            {" · "}
            {selectedRepo.full_name || selectedRepo.fullName}
          </Typography>
        </Alert>
      )}

      {/* Server */}
      <FormControl fullWidth sx={{ mb: 2 }} className="input-project-server">
        <InputLabel>{t("common.server")}</InputLabel>
        <Select
          value={form.server}
          label={t("common.server")}
          onChange={(e) => setForm({ ...form, server: e.target.value })}
          required
          className="select-server"
        >
          {servers.map((server) => (
            <MenuItem key={server._id} value={server._id}>
              {server.name} ({server.host})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Name */}
      <TextField
        label={t("common.name")}
        placeholder="My Awesome App"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
        fullWidth
        sx={{ mb: 2 }}
        className="input-project-name"
      />

      {/* Repo URL — shown in manual mode; in GitHub mode show as read-only info */}
      {!isGitHubMode ? (
        <TextField
          label={t("projects.repoUrl")}
          placeholder="https://github.com/username/repo.git"
          value={form.repoUrl}
          onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
          required
          fullWidth
          sx={{ mb: 2 }}
          className="input-repo-url"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Paste from Clipboard">
                  <IconButton
                    edge="end"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text)
                          setForm((prev) => ({
                            ...prev,
                            repoUrl: text.trim(),
                          }));
                      } catch {
                        toast.error("Cannot access clipboard");
                      }
                    }}
                    className="btn-paste-repo"
                  >
                    <ContentPasteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      ) : (
        <TextField
          label={t("projects.repoUrl")}
          value={form.repoUrl}
          fullWidth
          sx={{ mb: 2 }}
          className="input-repo-url"
          InputProps={{ readOnly: true }}
          helperText="Repository URL (imported from GitHub)"
        />
      )}

      {/* Branch + Auto Detect */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }} className="branch-container">
        <TextField
          label={t("projects.branch")}
          placeholder="main"
          value={form.branch}
          onChange={(e) => setForm({ ...form, branch: e.target.value })}
          sx={{ flex: 1 }}
          className="input-branch"
        />
        <Tooltip
          title={
            !form.server
              ? "Please select a server first"
              : !form.repoUrl
                ? "Please enter or import a repository URL"
                : t("projects.detectBranch")
          }
        >
          <span>
            <Button
              variant="outlined"
              onClick={detectBranch}
              /* Only require server to be selected; repoUrl is already set in GitHub mode */
              disabled={detectingBranch || !form.repoUrl || !form.server}
              startIcon={
                detectingBranch ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AutoFixHighIcon />
                )
              }
              sx={{ minWidth: 130, whiteSpace: "nowrap" }}
              className="btn-detect-branch"
            >
              {detectingBranch ? t("common.loading") : t("projects.detect")}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Repo Folder */}
      <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
        <TextField
          label={t("projects.repoFolder")}
          placeholder="docs (optional)"
          value={form.repoFolder || ""}
          onChange={(e) => setForm({ ...form, repoFolder: e.target.value })}
          fullWidth
          helperText={t("projects.repoFolderHint")}
          className="input-repo-folder"
        />
        <Tooltip title={t("projects.browse")}>
          <span>
            <Button
              variant="outlined"
              sx={{ minWidth: 40, height: 40 }}
              onClick={() => setFolderBrowserOpen(true)}
              disabled={
                !form.repoUrl || !form.branch || !form.server || detectingBranch
              }
            >
              <FolderOpenIcon />
            </Button>
          </span>
        </Tooltip>
      </Box>

      <FolderBrowserDialog
        open={folderBrowserOpen}
        onClose={() => setFolderBrowserOpen(false)}
        onSelect={(path) => setForm((prev) => ({ ...prev, repoFolder: path }))}
        serverId={form.server}
        repoUrl={form.repoUrl}
        branch={form.branch}
        deployPath={form.deployPath}
      />

      {/* Deploy Path */}
      <TextField
        label={t("projects.deployPathLabel")}
        placeholder="/var/www/my-app"
        value={form.deployPath}
        onChange={(e) => setForm({ ...form, deployPath: e.target.value })}
        required
        fullWidth
        sx={{ mb: 2 }}
        helperText={t("projects.deployPathHint")}
        className="input-deploy-path"
      />

      <TextField
        label={t("projects.outputPath")}
        placeholder="/var/www/my-app-dist"
        value={form.outputPath}
        onChange={(e) => setForm({ ...form, outputPath: e.target.value })}
        sx={{ mb: 2 }}
        helperText={t("projects.outputPathHint")}
        className="input-output-path"
        fullWidth
      />

      <TextField
        label={t("projects.buildOutput")}
        placeholder="build or dist"
        value={form.buildOutputDir}
        onChange={(e) => setForm({ ...form, buildOutputDir: e.target.value })}
        sx={{ mb: 2 }}
        helperText={t("projects.buildOutputHint")}
        className="input-build-output-dir"
        fullWidth
      />

      {/* Commands */}
      <Typography
        variant="caption"
        fontWeight={600}
        color="text.secondary"
        sx={{ mb: 1, display: "block" }}
        className="commands-section-title"
      >
        {t("projects.commandsSection")}
      </Typography>
      <Box
        className="commands-grid"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
          mb: 2,
        }}
      >
        <TextField
          label={t("settings.installCommand")}
          placeholder="npm install"
          value={form.installCommand}
          onChange={(e) => setForm({ ...form, installCommand: e.target.value })}
          size="small"
          className="input-install-cmd"
        />
        <TextField
          label={t("settings.buildCommand")}
          placeholder="npm run build"
          value={form.buildCommand}
          onChange={(e) => setForm({ ...form, buildCommand: e.target.value })}
          size="small"
          className="input-build-cmd"
        />
        <TextField
          label={t("settings.startCommand")}
          placeholder="npm start"
          value={form.startCommand}
          onChange={(e) => setForm({ ...form, startCommand: e.target.value })}
          size="small"
          className="input-start-cmd"
        />
        <TextField
          label={t("settings.stopCommand")}
          placeholder="pm2 stop app"
          value={form.stopCommand}
          onChange={(e) => setForm({ ...form, stopCommand: e.target.value })}
          size="small"
          className="input-stop-cmd"
        />
      </Box>

      {/* Process Manager */}
      <FormControl fullWidth sx={{ mb: 2 }} className="input-process-manager">
        <InputLabel>Process Manager</InputLabel>
        <Select
          value={form.processManager}
          label="Process Manager"
          onChange={(e) =>
            setForm({
              ...form,
              processManager: e.target.value as "nohup" | "pm2",
            })
          }
          className="select-process-manager"
        >
          <MenuItem value="nohup">
            <Box>
              <Typography variant="body1">Nohup (Default)</Typography>
              <Typography variant="caption" color="text.secondary">
                Simple background process
              </Typography>
            </Box>
          </MenuItem>
          <MenuItem value="pm2">
            <Box>
              <Typography variant="body1">PM2</Typography>
              <Typography variant="caption" color="text.secondary">
                Advanced process manager (auto-restart, monitoring)
              </Typography>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Environment Variables */}
      <Box sx={{ mb: 2 }} className="env-vars-section">
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          sx={{ mb: 1, display: "block" }}
        >
          {t("projects.envVarsSection")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {envVars.map((env, index) => (
            <Box key={index} sx={{ display: "flex", gap: 1 }}>
              <TextField
                label="Key"
                value={env.key}
                onChange={(e) => {
                  const newVars = [...envVars];
                  newVars[index].key = e.target.value;
                  setEnvVars(newVars);
                }}
                size="small"
                sx={{ flex: 1 }}
                placeholder="API_KEY"
              />
              <TextField
                label="Value"
                value={env.value}
                onChange={(e) => {
                  const newVars = [...envVars];
                  newVars[index].value = e.target.value;
                  setEnvVars(newVars);
                }}
                size="small"
                sx={{ flex: 1 }}
                placeholder="secret-123"
              />
              <IconButton
                color="error"
                onClick={() =>
                  setEnvVars(envVars.filter((_, i) => i !== index))
                }
              >
                <DeleteForeverIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() => setEnvVars([...envVars, { key: "", value: "" }])}
            variant="outlined"
            size="small"
            sx={{ alignSelf: "flex-start" }}
          >
            {t("common.add")}
          </Button>
        </Box>
      </Box>

      {/* Auto Deploy */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: form.autoDeploy
            ? "rgba(33,150,243,0.08)"
            : "rgba(255,255,255,0.03)",
          border: "1px solid",
          borderColor: form.autoDeploy ? "info.main" : "rgba(255,255,255,0.08)",
          transition: "all 0.2s ease",
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={form.autoDeploy}
              onChange={(e) =>
                setForm({ ...form, autoDeploy: e.target.checked })
              }
              color="info"
            />
          }
          label={
            <Typography variant="body2" fontWeight={600}>
              🔄 {t("projects.autoDeployLabel")}
            </Typography>
          }
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", ml: 6, mt: -0.5 }}
        >
          {t(
            form.autoDeploy
              ? "projects.autoDeployEnabled"
              : "projects.autoDeployDisabled",
          )}
        </Typography>
      </Box>
    </>
  );

  // ── GitHub repo list (Step 1) ────────────────────────────────────────────────
  const renderRepoList = () => (
    <>
      <TextField
        fullWidth
        size="small"
        placeholder="Search repository..."
        value={repoSearch}
        onChange={(e) => {
          setRepoSearch(e.target.value);
          setReposPage(1); // reset page on new search
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={t("common.paste") || "Paste"}>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        setRepoSearch(text.trim());
                        setReposPage(1);
                      }
                    } catch {
                      toast.error(t("projects.clipboardError"));
                    }
                  }}
                >
                  <ContentPasteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1.5 }}
      />

      {/* State 1: GitHub not connected */}
      {!githubConnected ? (
        <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
          <GitHubIcon
            sx={{ fontSize: 48, color: "text.secondary", mb: 2, opacity: 0.5 }}
          />
          <Typography variant="h6" gutterBottom>
            GitHub Not Connected
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, maxWidth: 300, mx: "auto" }}
          >
            Connect your GitHub account to easily import repositories and
            configure auto-deploy with webhooks.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<GitHubIcon />}
            onClick={() => {
              // Same connection logic from Settings
              const clientId =
                import.meta.env.VITE_GITHUB_CLIENT_ID || "Ov23li0ksThNd1mnZDtt";
              const currentUrl = window.location.href;
              localStorage.setItem("github_redirect", currentUrl);
              const scope = "repo user admin:repo_hook";
              window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}`;
            }}
          >
            Connect GitHub
          </Button>
        </Box>
      ) : reposLoading && repos.length === 0 ? (
        // State 2: Initial load — show skeleton list
        <List disablePadding>
          {Array.from({ length: 6 }).map((_, i) => (
            <ListItem
              key={`skel-init-${i}`}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                mb: 1,
              }}
            >
              <ListItemAvatar>
                <Skeleton variant="circular" width={32} height={32} />
              </ListItemAvatar>
              <ListItemText
                primary={<Skeleton variant="text" width="45%" />}
                secondary={<Skeleton variant="text" width="25%" />}
              />
            </ListItem>
          ))}
        </List>
      ) : repos.length === 0 ? (
        /* State 3: Loaded, but empty */
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          {repoSearch
            ? t("projects.noMatchingRepos", "No matching repositories found.")
            : t(
                "projects.noReposFound",
                "No repositories found for this account.",
              )}
        </Typography>
      ) : (
        /* State 3: Has repos */
        <>
          <List disablePadding>
            {repos.map((repo) => (
              <ListItem
                key={repo.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleSelectRepo(repo)}
                  >
                    Import
                  </Button>
                }
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    <GitHubIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={repo.name}
                  secondary={
                    <>
                      <Chip
                        label={repo.private ? "Private" : "Public"}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10, height: 16, mr: 0.5 }}
                      />
                      <span style={{ fontSize: 11, opacity: 0.7 }}>
                        {repo.default_branch || repo.defaultBranch}
                      </span>
                    </>
                  }
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  secondaryTypographyProps={{ component: "div" as any }}
                />
              </ListItem>
            ))}

            {/* Skeleton rows when appending next page */}
            {reposLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <ListItem
                  key={`skel-more-${i}`}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemAvatar>
                    <Skeleton variant="circular" width={32} height={32} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Skeleton variant="text" width="40%" />}
                    secondary={<Skeleton variant="text" width="25%" />}
                  />
                </ListItem>
              ))}
          </List>

          {/* Sentinel for IntersectionObserver — only mount when there's more to load */}
          {reposHasMore && <Box ref={sentinelRef} sx={{ height: 8 }} />}

          {!reposHasMore && !reposLoading && (
            <Typography
              variant="caption"
              color="text.secondary"
              align="center"
              display="block"
              sx={{ py: 1 }}
            >
              All repositories loaded
            </Typography>
          )}
        </>
      )}
    </>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Drawer open={open} onClose={onClose} anchor="right">
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: { xs: "100vw", sm: 500, md: 600 },
          p: 0,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
        role="presentation"
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            pt: 4,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography variant="h6">
              {editing ? t("projects.editProject") : t("projects.addProject")}
            </Typography>
            {!editing && activeTab === 1 && (
              <Typography variant="caption" color="text.secondary">
                {selectedRepo
                  ? `Step 2: Configure deployment · ${selectedRepo.name}`
                  : "Step 1: Select a repository"}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs */}
        {!editing && (
          <Box sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => {
                setActiveTab(v);
                if (v === 1) {
                  setSelectedRepo(null);
                  setForm(DEFAULT_FORM);
                }
              }}
              variant="fullWidth"
            >
              <Tab label={t("projects.manual")} />
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <GitHubIcon sx={{ fontSize: 16 }} />
                    GitHub Integration
                    {selectedRepo && (
                      <Chip
                        label={selectedRepo.name}
                        size="small"
                        color="success"
                        sx={{ ml: 0.5, height: 18, fontSize: 10 }}
                      />
                    )}
                  </Box>
                }
              />
            </Tabs>
          </Box>
        )}

        {/* Body */}
        <Box sx={{ p: 3, pt: 2, flex: 1, overflowY: "auto" }}>
          {/* Manual tab */}
          {(editing || activeTab === 0) && renderConfigureForm(false)}

          {/* GitHub tab */}
          {!editing && activeTab === 1 && (
            <>
              {/* Step 1: repo list */}
              {!selectedRepo && renderRepoList()}

              {/* Analyzing spinner */}
              {selectedRepo && analyzingRepo && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    py: 8,
                    gap: 2,
                  }}
                >
                  <CircularProgress />
                  <Typography color="text.secondary">
                    Analyzing {selectedRepo.name}...
                  </Typography>
                </Box>
              )}

              {/* Step 2: configure */}
              {selectedRepo && !analyzingRepo && (
                <>
                  <Divider sx={{ mb: 2 }} />
                  {renderConfigureForm(true)}
                </>
              )}
            </>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            px: 3,
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          {(editing ||
            activeTab === 0 ||
            (activeTab === 1 && selectedRepo && !analyzingRepo)) && (
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || analyzingRepo}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {editing ? t("common.update") : t("projects.addProject")}
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
  );
});

export default ProjectFormDrawer;
