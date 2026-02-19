import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import TerminalIcon from "@mui/icons-material/Terminal";
import FolderIcon from "@mui/icons-material/Folder";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import StopIcon from "@mui/icons-material/Stop";
import SearchIcon from "@mui/icons-material/Search";
import Skeleton from "@mui/material/Skeleton";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import FolderBrowserDialog from "../components/FolderBrowserDialog";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

import SEO from "../components/SEO";

interface Server {
  _id: string;
  name: string;
  host: string;
  status: string;
}
interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  branch: string;
  server: Server;
  deployPath: string;
  repoFolder?: string;
  outputPath?: string;
  buildOutputDir?: string;
  buildCommand: string;
  installCommand: string;
  startCommand: string;
  stopCommand: string;
  preDeployCommand?: string;
  postDeployCommand?: string;
  status: string;
  autoDeploy: boolean;
  processManager: "nohup" | "pm2";
  lastDeployedAt?: string;
  envVars?: Record<string, string>;
}

const statusColor: Record<string, "success" | "error" | "warning" | "default"> =
  {
    running: "success",
    stopped: "error",
    failed: "error",
    deploying: "warning",
    building: "warning",
    idle: "default",
  };

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [detectingBranch, setDetectingBranch] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmStop, setConfirmStop] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, string>>(
    {},
  );

  // F4: Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredProjects = useMemo(
    () =>
      projects.filter((p) => {
        const matchSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.server?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === "all" || p.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [projects, searchQuery, statusFilter],
  );
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [form, setForm] = useState({
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
    processManager: "nohup" as "nohup" | "pm2",
  });
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api.get("/projects"),
        api.get("/servers"),
      ]);
      setProjects(p.data);
      setServers(s.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // Socket.io integration for realtime updates
  useEffect(() => {
    let socket: any;

    const setupSocket = async () => {
      try {
        // Import socket service dynamically or use the one from props/context if available
        // But here we use the exported connectSocket
        const { connectSocket } = await import("../services/socket");
        socket = await connectSocket();

        // Join project rooms
        projects.forEach((p) => {
          socket.emit("join:project", p._id);
        });

        socket.on("deployment:status", (data: any) => {
          if (data.projectId) {
            setProjects((prev) =>
              prev.map((p) =>
                p._id === data.projectId
                  ? {
                      ...p,
                      status: data.status,
                      lastDeployedAt:
                        data.timestamp || new Date().toISOString(),
                    }
                  : p,
              ),
            );

            // If running/failed/success, refresh to get consistent state
            if (
              ["running", "stopped", "failed", "success"].includes(data.status)
            ) {
              fetchData();
            }
          }
        });
      } catch (err) {
        console.error("Socket setup failed", err);
      }
    };

    if (projects.length > 0) {
      setupSocket();
    }

    return () => {
      if (socket) {
        socket.off("deployment:status");
      }
    };
  }, [projects.length]); // Re-run when projects are loaded

  const resetForm = useCallback(() => {
    setForm({
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
    });
    setEditing(null);
    setEnvVars([]);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);
  const openEdit = (p: Project) => {
    setForm({
      name: p.name,
      repoUrl: p.repoUrl,
      branch: p.branch,
      repoFolder: p.repoFolder || "",
      server: p.server._id,
      deployPath: p.deployPath,
      outputPath: p.outputPath || "",
      buildOutputDir: p.buildOutputDir || "",
      buildCommand: p.buildCommand,
      installCommand: p.installCommand,
      startCommand: p.startCommand,
      stopCommand: p.stopCommand,
      autoDeploy: p.autoDeploy,
      processManager: p.processManager || "nohup",
    });
    // Convert envVars object to string
    const vars = p.envVars
      ? Object.entries(p.envVars).map(([key, value]) => ({ key, value }))
      : [];
    setEnvVars(vars);
    setEditing(p);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Convert envVars array to object
    const envVarsObj: Record<string, string> = {};
    envVars.forEach(({ key, value }) => {
      if (key.trim()) {
        envVarsObj[key.trim()] = value;
      }
    });

    const payload = { ...form, envVars: envVarsObj };

    try {
      if (editing) {
        await api.put(`/projects/${editing._id}`, payload);
        toast.success("Updated!");
      } else {
        await api.post("/projects", payload);
        toast.success("Created!");
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/projects/${confirmDelete._id}`, {
        data: { password: deletePassword },
      });
      toast.success("Deleted!");
      setConfirmDelete(null);
      setDeletePassword("");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete project");
    }
  };

  const handleDeploy = useCallback(
    async (projectId: string) => {
      try {
        await api.post(`/deployments/${projectId}/deploy`);
        toast.success("Deployment started! 🚀");
        navigate(`/projects/${projectId}/deploy`);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Deploy failed");
      }
    },
    [navigate],
  );

  const handleToggleSecret = async (projectId: string) => {
    if (visibleSecrets[projectId]) {
      const newSecrets = { ...visibleSecrets };
      delete newSecrets[projectId];
      setVisibleSecrets(newSecrets);
      return;
    }

    try {
      const { data } = await api.get(`/projects/${projectId}/webhook-url`);
      setVisibleSecrets((prev) => ({
        ...prev,
        [projectId]: data.webhookSecret,
      }));
    } catch (error: any) {
      toast.error("Failed to get webhook secret");
    }
  };

  const detectBranch = async () => {
    if (!form.repoUrl || !form.server) {
      toast.error("Please enter Repo URL and select a Server first");
      return;
    }
    setDetectingBranch(true);
    try {
      const { data } = await api.post("/projects/detect-branch", {
        repoUrl: form.repoUrl,
        serverId: form.server,
      });
      setForm((prev) => ({ ...prev, branch: data.branch }));
      toast.success(`Detected branch: ${data.branch}`);
      if (data.allBranches && data.allBranches.length > 1) {
        toast(`Available branches: ${data.allBranches.join(", ")}`, {
          icon: "📋",
          duration: 5000,
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to detect branch");
    } finally {
      setDetectingBranch(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton
          variant="rectangular"
          height={40}
          sx={{ mb: 2, borderRadius: 1 }}
        />
        <Grid container spacing={2.5}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={i}>
              <Skeleton
                variant="rectangular"
                height={200}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );

  return (
    <Box sx={{ overflow: "hidden" }}>
      <SEO
        title={t("seo.projects.title")}
        description={t("seo.projects.description")}
      />
      <Box
        className="projects-header"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box className="projects-title-container">
          <Typography
            variant="body1"
            fontWeight={500}
            className="projects-title"
          >
            {t("projects.title")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            className="projects-count"
          >
            {t("projects.count", { count: projects.length })}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          className="add-project-btn"
        >
          {t("projects.addProject")}
        </Button>
      </Box>

      {/* F4: Search & Filter Bar */}
      <Box
        className="projects-filter-bar"
        sx={{
          display: "flex",
          gap: 1,
          mb: 2.5,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          className="projects-search-input"
          size="small"
          placeholder={t("projects.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 220 }}
        />
        {["all", "running", "stopped", "failed", "idle"].map((s) => (
          <Chip
            key={s}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            size="small"
            color={statusFilter === s ? "primary" : "default"}
            variant={statusFilter === s ? "filled" : "outlined"}
            onClick={() => setStatusFilter(s)}
            className={`filter-chip filter-${s}`}
          />
        ))}
      </Box>

      {filteredProjects.length === 0 ? (
        <Card className="no-projects-card">
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <FolderIcon
              sx={{ fontSize: 56, color: "text.secondary", mb: 2 }}
              className="no-projects-icon"
            />
            <Typography variant="h6" gutterBottom className="no-projects-title">
              {t("projects.noProjects")}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
              className="no-projects-desc"
            >
              {t("projects.addFirst")}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              className="add-project-btn-empty"
            >
              {t("projects.addProject")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={{ xs: 2, md: 2.5 }} className="projects-grid">
          {filteredProjects.map((project) => (
            <Grid
              key={project._id}
              size={{ xs: 12, sm: 6, lg: 4 }}
              className="project-grid-item"
            >
              <Card
                className={`project-card project-status-${project.status}`}
                sx={{
                  height: "100%",
                  overflow: "hidden",
                  maxWidth: "100%",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  },
                }}
              >
                <CardContent
                  sx={{ p: { xs: 2, md: 3 }, overflow: "hidden" }}
                  className="project-card-content"
                >
                  <Box
                    className="project-card-header"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Box
                      className="project-identity"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <FolderIcon
                        sx={{ color: "primary.main", flexShrink: 0 }}
                        className="project-icon"
                      />
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        className="project-name"
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            color: "primary.light",
                            textDecoration: "underline",
                          },
                          transition: "color 0.2s",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: { xs: 14, md: 16 },
                        }}
                        onClick={() =>
                          navigate(`/projects/${project._id}/deploy`)
                        }
                      >
                        {project.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={project.status}
                      size="small"
                      color={statusColor[project.status] || "default"}
                      variant="outlined"
                      className={`project-status-chip status-${project.status}`}
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    className="project-repo-url"
                    sx={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "text.secondary",
                      fontSize: { xs: 10, md: 12 },
                      mb: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {project.repoUrl}
                  </Typography>

                  <Box
                    className="project-tags"
                    sx={{
                      display: "flex",
                      gap: 1,
                      mb: 1.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <Chip
                      label={project.branch}
                      size="small"
                      variant="outlined"
                      className="project-branch-chip"
                      sx={{ fontSize: 11 }}
                    />
                    <Chip
                      label={project.server?.name || "No server"}
                      size="small"
                      variant="outlined"
                      className={`project-server-chip server-${project.server?.status}`}
                      color={
                        project.server?.status === "online"
                          ? "success"
                          : "default"
                      }
                      sx={{ fontSize: 11 }}
                    />
                    {project.autoDeploy && (
                      <Tooltip title="Auto-deploy enabled — checks for new commits every 60s">
                        <Chip
                          icon={
                            <AutoFixHighIcon
                              sx={{ fontSize: "14px !important" }}
                            />
                          }
                          label="Auto-deploy"
                          size="small"
                          color="info"
                          variant="outlined"
                          className="project-autodeploy-chip"
                          sx={{ fontSize: 11 }}
                        />
                      </Tooltip>
                    )}
                  </Box>

                  <Typography
                    variant="body2"
                    className="project-deploy-path"
                    sx={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "text.secondary",
                      fontSize: 11,
                      mb: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    📁 {project.deployPath}
                  </Typography>

                  {project.lastDeployedAt && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      className="project-last-deployed"
                      sx={{ mb: 1 }}
                    >
                      {t("deploy.lastDeployed")}:{" "}
                      {new Date(project.lastDeployedAt).toLocaleString("vi-VN")}
                    </Typography>
                  )}

                  {/* Webhook URL / Secret Display */}
                  <Box
                    className="project-webhook-box"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mb: 2,
                      p: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(0,0,0,0.3)"
                          : "action.hover",
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      overflow: "hidden",
                      minWidth: 0,
                    }}
                  >
                    <Box
                      className="webhook-content"
                      sx={{
                        flex: 1,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box component="span" sx={{ fontSize: 14 }}>
                        {visibleSecrets[project._id] ? "🔑" : "🔗"}
                      </Box>
                      <Typography
                        variant="caption"
                        className="webhook-text"
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: "text.primary",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {visibleSecrets[project._id]
                          ? visibleSecrets[project._id]
                          : `${import.meta.env.VITE_API_URL || window.location.origin}/api/webhook/${project._id}`}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small"
                      onClick={() => {
                        const text = visibleSecrets[project._id]
                          ? visibleSecrets[project._id]
                          : `${import.meta.env.VITE_API_URL || window.location.origin}/api/webhook/${project._id}`;
                        navigator.clipboard.writeText(text);
                        toast.success(
                          visibleSecrets[project._id]
                            ? "Secret Key copied!"
                            : "Webhook URL copied!",
                        );
                      }}
                      sx={{ p: 0.3, color: "text.secondary", ml: 0.5 }}
                      title={
                        visibleSecrets[project._id] ? "Copy Secret" : "Copy URL"
                      }
                    >
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    {/* <Box
                      sx={{
                        width: 1,
                        height: 14,
                        bgcolor: "rgba(255,255,255,0.1)",
                        mx: 0.5,
                      }}
                    /> */}
                    <IconButton
                      size="small"
                      onClick={() => handleToggleSecret(project._id)}
                      sx={{
                        p: 0.3,
                        color: visibleSecrets[project._id]
                          ? "primary.main"
                          : "warning.main",
                      }}
                      title={
                        visibleSecrets[project._id]
                          ? "Show URL"
                          : "Show Secret Key"
                      }
                    >
                      <Box
                        sx={{
                          fontSize: 10,
                          fontWeight: 700,
                          border: "1px solid currentColor",
                          borderRadius: 0.5,
                          px: 0.5,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {visibleSecrets[project._id] ? "URL" : "KEY"}
                      </Box>
                    </IconButton>
                  </Box>

                  <Box
                    className="project-actions"
                    sx={{
                      display: "flex",
                      gap: { xs: 0.5, md: 1 },
                      flexWrap: "wrap",
                    }}
                  >
                    {[
                      "running",
                      "deploying",
                      "building",
                      "cloning",
                      "installing",
                      "starting",
                    ].includes(project.status) ? (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          color="info"
                          startIcon={<TerminalIcon />}
                          onClick={() =>
                            navigate(`/projects/${project._id}/deploy`)
                          }
                          className="action-btn-console"
                        >
                          Console
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<StopIcon />}
                          onClick={() => setConfirmStop(project)}
                          disabled={project.status !== "running"}
                          className="action-btn-stop"
                        >
                          Stop
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<RocketLaunchIcon />}
                          onClick={() => handleDeploy(project._id)}
                          className="action-btn-deploy"
                        >
                          {t("common.deploy")}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<TerminalIcon />}
                          onClick={() =>
                            navigate(`/projects/${project._id}/deploy`)
                          }
                          className="action-btn-logs"
                        >
                          Logs
                        </Button>
                      </>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <IconButton
                      size="small"
                      onClick={() => openEdit(project)}
                      className="action-btn-edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteForeverIcon />}
                      onClick={() => setConfirmDelete(project)}
                      sx={{ minWidth: "auto" }}
                      className="action-btn-delete"
                    >
                      {t("common.delete")}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        className="project-dialog"
      >
        <form onSubmit={handleSubmit} className="project-form">
          <DialogTitle className="project-dialog-title">
            {editing ? t("common.edit") : t("projects.addProject")}
          </DialogTitle>
          <DialogContent
            sx={{ pt: "16px !important" }}
            className="project-dialog-content"
          >
            <TextField
              label={t("common.name")}
              placeholder="My App"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              sx={{ mb: 2 }}
              className="input-project-name"
            />

            {/* Server Select */}
            <FormControl
              fullWidth
              sx={{ mb: 2 }}
              className="input-project-server"
            >
              <InputLabel>{t("common.server")}</InputLabel>
              <Select
                value={form.server}
                label={t("common.server")}
                onChange={(e) => setForm({ ...form, server: e.target.value })}
                required
                className="select-project-server"
              >
                {servers.map((s) => (
                  <MenuItem
                    key={s._id}
                    value={s._id}
                    className={`server-item item-${s.status}`}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor:
                            s.status === "online"
                              ? "success.main"
                              : "text.disabled",
                        }}
                      />
                      {s.name} ({s.host})
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Repo URL */}
            <TextField
              label={t("projects.repoUrl")}
              placeholder="https://github.com/user/repo"
              value={form.repoUrl}
              onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
              required
              sx={{ mb: 2 }}
              className="input-repo-url"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Paste from clipboard">
                      <IconButton
                        size="small"
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

            {/* Branch with auto-detect */}
            <Box
              sx={{ display: "flex", gap: 1, mb: 2 }}
              className="branch-container"
            >
              <TextField
                label={t("projects.branch")}
                placeholder="main"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                sx={{ flex: 1 }}
                className="input-branch"
              />
              <Tooltip title={t("projects.detectBranch")}>
                <span>
                  <Button
                    variant="outlined"
                    onClick={detectBranch}
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
                    Detect
                  </Button>
                </span>
              </Tooltip>
            </Box>

            {/* Repo Folder (for monorepo) */}
            <TextField
              label={t("projects.repoFolder")}
              placeholder="frontend, packages/api, ..."
              value={form.repoFolder}
              onChange={(e) => setForm({ ...form, repoFolder: e.target.value })}
              sx={{ mb: 2 }}
              helperText={t("projects.repoFolderHint")}
              className="input-repo-folder"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={t("projects.browse")}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => setFolderBrowserOpen(true)}
                          disabled={!form.server || !form.repoUrl}
                          className="btn-browse-folder"
                        >
                          <FolderOpenIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />

            <FolderBrowserDialog
              open={folderBrowserOpen}
              onClose={() => setFolderBrowserOpen(false)}
              onSelect={(path) =>
                setForm((prev) => ({ ...prev, repoFolder: path }))
              }
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
            />

            <TextField
              label={t("projects.buildOutput")}
              placeholder="build or dist"
              value={form.buildOutputDir}
              onChange={(e) =>
                setForm({ ...form, buildOutputDir: e.target.value })
              }
              sx={{ mb: 2 }}
              helperText={t("projects.buildOutputHint")}
              className="input-build-output-dir"
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
                onChange={(e) =>
                  setForm({ ...form, installCommand: e.target.value })
                }
                size="small"
                className="input-install-cmd"
              />
              <TextField
                label={t("settings.buildCommand")}
                placeholder="npm run build"
                value={form.buildCommand}
                onChange={(e) =>
                  setForm({ ...form, buildCommand: e.target.value })
                }
                size="small"
                className="input-build-cmd"
              />
              <TextField
                label={t("settings.startCommand")}
                placeholder="npm start"
                value={form.startCommand}
                onChange={(e) =>
                  setForm({ ...form, startCommand: e.target.value })
                }
                size="small"
                className="input-start-cmd"
              />
              <TextField
                label={t("settings.stopCommand")}
                placeholder="pm2 stop app"
                value={form.stopCommand}
                onChange={(e) =>
                  setForm({ ...form, stopCommand: e.target.value })
                }
                size="small"
                className="input-stop-cmd"
              />
            </Box>

            {/* Process Manager */}
            <FormControl
              fullWidth
              sx={{ mb: 2 }}
              className="input-process-manager"
            >
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
                className="env-vars-title"
              >
                {t("projects.envVarsSection")}
              </Typography>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                className="env-vars-list"
              >
                {envVars.map((env, index) => (
                  <Box
                    key={index}
                    sx={{ display: "flex", gap: 1 }}
                    className={`env-var-row row-${index}`}
                  >
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
                      className="input-env-key"
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
                      className="input-env-value"
                    />
                    <IconButton
                      color="error"
                      onClick={() => {
                        const newVars = envVars.filter((_, i) => i !== index);
                        setEnvVars(newVars);
                      }}
                      className="btn-delete-env"
                    >
                      <DeleteForeverIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setEnvVars([...envVars, { key: "", value: "" }])
                  }
                  variant="outlined"
                  size="small"
                  sx={{ alignSelf: "flex-start" }}
                  className="btn-add-env"
                >
                  {t("common.add")}
                </Button>
              </Box>
            </Box>

            {/* Auto Deploy */}
            <Box
              className={`auto-deploy-box ${form.autoDeploy ? "enabled" : "disabled"}`}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: form.autoDeploy
                  ? "rgba(33,150,243,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: "1px solid",
                borderColor: form.autoDeploy
                  ? "info.main"
                  : "rgba(255,255,255,0.08)",
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
                    className="switch-auto-deploy"
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    className="auto-deploy-label"
                  >
                    🔄 {t("projects.autoDeployLabel")}
                  </Typography>
                }
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", ml: 6, mt: -0.5 }}
                className="auto-deploy-status-text"
              >
                {t(
                  form.autoDeploy
                    ? "projects.autoDeployEnabled"
                    : "projects.autoDeployDisabled",
                )}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions
            sx={{ px: 3, pb: 2 }}
            className="project-dialog-actions"
          >
            <Button onClick={() => setShowModal(false)} className="btn-cancel">
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained" className="btn-submit">
              {editing ? t("common.update") : t("projects.addProject")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => {
          setConfirmDelete(null);
          setDeletePassword("");
        }}
        className="delete-dialog"
      >
        <DialogTitle className="delete-dialog-title">
          {t("projects.deleteProject")}
        </DialogTitle>
        <DialogContent className="delete-dialog-content">
          <Typography>
            {t("projects.deleteConfirm", { name: confirmDelete?.name })}
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {t("projects.deleteWarning")}
          </Typography>
          <TextField
            label="Enter password to confirm"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            fullWidth
            autoFocus
            size="small"
            sx={{ mt: 2 }}
            className="input-delete-password"
          />
        </DialogContent>
        <DialogActions className="delete-dialog-actions">
          <Button
            onClick={() => {
              setConfirmDelete(null);
              setDeletePassword("");
            }}
            className="btn-cancel-delete"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={!deletePassword}
            startIcon={<DeleteForeverIcon />}
            className="btn-confirm-delete"
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Stop Dialog */}
      <Dialog
        open={!!confirmStop}
        onClose={() => setConfirmStop(null)}
        className="stop-dialog"
      >
        <DialogTitle className="stop-dialog-title">
          {t("projects.stopProject")}
        </DialogTitle>
        <DialogContent className="stop-dialog-content">
          <Typography>
            {t("projects.stopConfirm", { name: confirmStop?.name })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("projects.stopWarning")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }} className="stop-dialog-actions">
          <Button
            onClick={() => setConfirmStop(null)}
            className="btn-cancel-stop"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!confirmStop) return;
              try {
                await api.post(`/deployments/${confirmStop._id}/stop`);
                toast.success("Stopped");
                fetchData();
              } catch (err: any) {
                toast.error(err.response?.data?.message || "Stop failed");
              }
              setConfirmStop(null);
            }}
            className="btn-confirm-stop"
          >
            {t("common.stop")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects;
