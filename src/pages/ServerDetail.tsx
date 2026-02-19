import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DnsIcon from "@mui/icons-material/Dns";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PowerIcon from "@mui/icons-material/Power";
import TerminalIcon from "@mui/icons-material/Terminal";
import FolderIcon from "@mui/icons-material/Folder";
import RefreshIcon from "@mui/icons-material/Refresh";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SEO from "../components/SEO";

interface Server {
  _id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: "password" | "key";
  status: "online" | "offline" | "unknown";
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ServerStats {
  cpu: string;
  memory: { total: string; used: string; free: string; percent: string };
  disk: { total: string; used: string; free: string; percent: string };
  uptime: string;
  loadAvg: string;
}

interface RelatedProject {
  _id: string;
  name: string;
  repoUrl: string;
  branch: string;
  deployPath: string;
  status: string;
}

const ServerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [projects, setProjects] = useState<RelatedProject[]>([]);
  const [testing, setTesting] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    host: "",
    port: 22,
    username: "root",
    authType: "password" as "password" | "key",
    password: "",
    privateKey: "",
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Terminal state
  const [termInput, setTermInput] = useState("");
  const [termLoading, setTermLoading] = useState(false);
  const [termOutput, setTermOutput] = useState<
    { command: string; stdout: string; stderr: string; code: number }[]
  >([]);
  const [termCmdHistory, setTermCmdHistory] = useState<string[]>([]);
  const [termCmdIndex, setTermCmdIndex] = useState(-1);
  const [termCwd, setTermCwd] = useState("~");
  const termRef = useRef<HTMLDivElement>(null);

  const fetchServer = async () => {
    try {
      const { data } = await api.get(`/servers/${id}`);
      setServer(data);
    } catch {
      toast.error("Server not found");
      navigate("/servers");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get(`/servers/${id}/stats`);
      setStats(data.stats);
    } catch {
      toast.error("Failed to fetch stats");
    } finally {
      setStatsLoading(false);
    }
  };
  console.log(stats);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get(`/servers/${id}/projects`);
      setProjects(data);
    } catch {
      // Silently fail — endpoint might not exist yet
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data } = await api.post(`/servers/${id}/test`);
      if (data.success) {
        toast.success("Connection successful!");
        fetchServer();
      } else {
        toast.error(`Connection failed: ${data.message}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/servers/${id}`, editForm);
      toast.success("Server updated!");
      setEditOpen(false);
      fetchServer();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/servers/${id}`);
      toast.success("Server deleted!");
      navigate("/servers");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const openEdit = () => {
    if (!server) return;
    setEditForm({
      name: server.name,
      host: server.host,
      port: server.port,
      username: server.username,
      authType: server.authType,
      password: "",
      privateKey: "",
    });
    setEditOpen(true);
  };

  const parsePercent = (s: string) => parseFloat(s) || 0;

  const runCommand = async (cmd: string) => {
    if (!cmd || termLoading) return;
    setTermInput("");
    setTermLoading(true);
    setTermCmdHistory((prev) => [cmd, ...prev]);
    setTermCmdIndex(-1);
    const wrappedCmd =
      termCwd === "~" ? `${cmd} && pwd` : `cd ${termCwd} && ${cmd} && pwd`;
    try {
      const { data } = await api.post(`/servers/${id}/exec`, {
        command: wrappedCmd,
      });
      const lines = (data.stdout || "").split("\n");
      const newCwd = lines.pop()?.trim() || termCwd;
      const displayStdout = lines.join("\n").trim();
      if (data.code === 0 || data.code == null) {
        setTermCwd(newCwd);
      }
      setTermOutput((prev) => [
        ...prev,
        {
          command: cmd,
          stdout: displayStdout,
          stderr: data.stderr || "",
          code: data.code ?? 0,
        },
      ]);
    } catch (err: any) {
      setTermOutput((prev) => [
        ...prev,
        {
          command: cmd,
          stdout: "",
          stderr: err.response?.data?.message || "Connection failed",
          code: 1,
        },
      ]);
    } finally {
      setTermLoading(false);
      setTimeout(
        () => termRef.current?.scrollTo(0, termRef.current.scrollHeight),
        50,
      );
    }
  };

  useEffect(() => {
    fetchServer();
    fetchStats();
    fetchProjects();
    // Auto-refresh stats every 30s
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", gap: 2.5, flexWrap: "wrap" }}>
        <Card sx={{ flex: 1, minWidth: 300 }}>
          <CardContent sx={{ p: 3 }}>
            <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                variant="text"
                width="100%"
                height={24}
                sx={{ mb: 1 }}
              />
            ))}
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 300 }}>
          <CardContent sx={{ p: 3 }}>
            <Skeleton variant="text" width={160} height={28} sx={{ mb: 2 }} />
            <Skeleton
              variant="rounded"
              width="100%"
              height={8}
              sx={{ mb: 2 }}
            />
            <Skeleton
              variant="rounded"
              width="100%"
              height={8}
              sx={{ mb: 2 }}
            />
            <Skeleton variant="rounded" width="100%" height={8} />
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!server) return null;

  const prompt = `${server.username}@${server.host}:${termCwd}#`;

  return (
    <Box className="server-detail-page">
      <SEO title={server.name} description={`Manage server ${server.name}`} />
      {/* Header */}
      <Box
        className="server-header"
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          mb: 3,
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            className="server-back-btn"
            onClick={() => navigate("/servers")}
          >
            <ArrowBackIcon />
          </IconButton>
          <DnsIcon
            className="server-title-icon"
            sx={{ fontSize: 32, color: "primary.main" }}
          />
          <Box>
            <Typography
              className="server-title-text"
              variant="h5"
              fontWeight={700}
            >
              {server.name}
            </Typography>
            <Typography
              className="server-subtitle-text"
              variant="body2"
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "text.secondary",
              }}
            >
              {server.username}@{server.host}:{server.port}
            </Typography>
          </Box>
          <Chip
            className="server-status-chip"
            label={server.status}
            size="small"
            color={
              server.status === "online"
                ? "success"
                : server.status === "offline"
                  ? "error"
                  : "default"
            }
          />
        </Box>
        <Box
          className="server-actions-container"
          sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
        >
          <Button
            className="server-test-conn-btn"
            variant="outlined"
            color="success"
            startIcon={
              testing ? (
                <Skeleton variant="circular" width={14} height={14} />
              ) : (
                <PowerIcon />
              )
            }
            onClick={handleTest}
            disabled={testing}
          >
            {t("servers.testConnection")}
          </Button>
          <Button
            className="server-edit-btn"
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={openEdit}
          >
            {t("common.edit")}
          </Button>
          <Button
            className="server-delete-btn"
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            {t("common.delete")}
          </Button>
        </Box>
      </Box>

      {/* Server Info + Stats row */}
      <Box sx={{ display: "flex", gap: 2.5, mb: 3, flexWrap: "wrap" }}>
        {/* Server Info */}
        <Card
          className="server-info-card"
          sx={{ flex: 1, minWidth: { xs: 0, sm: 300 } }}
        >
          <CardContent
            className="server-info-content"
            sx={{ p: { xs: 2, md: 3 } }}
          >
            <Typography
              className="server-info-title"
              variant="subtitle2"
              fontWeight={600}
              sx={{ mb: 2 }}
            >
              🖥️ {t("servers.serverInfo")}
            </Typography>
            <Box
              className="server-info-list"
              sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
            >
              {[
                { label: t("servers.host"), value: server.host },
                { label: t("servers.port"), value: server.port },
                { label: t("servers.username"), value: server.username },
                {
                  label: t("servers.authType"),
                  value: server.authType === "key" ? "SSH Key" : "Password",
                },
                {
                  label: t("servers.lastChecked"),
                  value: server.lastCheckedAt
                    ? new Date(server.lastCheckedAt).toLocaleString("vi-VN")
                    : t("common.never"),
                },
                {
                  label: t("common.created"),
                  value: new Date(server.createdAt).toLocaleString("vi-VN"),
                },
              ].map((item) => (
                <Box
                  key={item.label}
                  className="server-info-row"
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    py: 0.5,
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <Typography
                    className="server-info-label"
                    variant="body2"
                    color="text.secondary"
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    className="server-info-value"
                    variant="body2"
                    fontWeight={500}
                    sx={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* System Stats */}
        <Card
          className="system-stats-card"
          sx={{ flex: 1, minWidth: { xs: 0, sm: 300 } }}
        >
          <CardContent
            className="stats-card-content"
            sx={{ p: { xs: 2, md: 3 } }}
          >
            <Box
              className="stats-header"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography
                className="stats-title"
                variant="subtitle2"
                fontWeight={600}
              >
                📊 {t("serverDetail.systemStats")}
              </Typography>
              <Tooltip title="Refresh">
                <IconButton
                  className="stats-refresh-btn"
                  size="small"
                  onClick={fetchStats}
                  disabled={statsLoading}
                >
                  {statsLoading ? (
                    <Skeleton variant="circular" width={16} height={16} />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Box>

            {!stats ? (
              <Typography
                className="stats-loading-text"
                variant="body2"
                color="text.secondary"
              >
                {statsLoading
                  ? "Loading..."
                  : "No stats available. Server may be offline."}
              </Typography>
            ) : (
              <Box
                className="stats-container"
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                {/* CPU */}
                <Box className="stats-cpu-section">
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      CPU
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats.cpu}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={parsePercent(stats.cpu)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "rgba(255,255,255,0.05)",
                      "& .MuiLinearProgress-bar": {
                        bgcolor:
                          parsePercent(stats.cpu) > 80
                            ? "error.main"
                            : "primary.main",
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
                {/* RAM */}
                <Box className="stats-ram-section">
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      RAM
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats.memory?.used || "?"} / {stats.memory?.total || "?"}{" "}
                      ({stats.memory?.percent || "0%"})
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={parsePercent(stats.memory?.percent)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "rgba(255,255,255,0.05)",
                      "& .MuiLinearProgress-bar": {
                        bgcolor:
                          parsePercent(stats.memory?.percent) > 85
                            ? "error.main"
                            : "success.main",
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
                {/* Disk */}
                <Box className="stats-disk-section">
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      Disk
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stats.disk?.used || "?"} / {stats.disk?.total || "?"} (
                      {stats.disk?.percent || "0%"})
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={parsePercent(stats.disk?.percent)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: "rgba(255,255,255,0.05)",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "warning.main",
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
                {/* Uptime + Load */}
                <Box
                  className="stats-footer"
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    pt: 1,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    ⏱ {stats.uptime}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Load: {stats.loadAvg}
                  </Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Remote Terminal */}
      <Card className="remote-terminal-card" sx={{ mb: 3 }}>
        <CardContent className="terminal-card-content" sx={{ p: 0 }}>
          <Box
            className="terminal-container"
            sx={{
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {/* Title bar */}
            <Box
              className="terminal-title-bar"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2,
                py: 0.8,
                bgcolor: "#2d2d2d",
                borderBottom: "1px solid #404040",
              }}
            >
              <Box
                className="terminal-window-controls"
                sx={{ display: "flex", gap: 0.8, alignItems: "center" }}
              >
                <Box
                  className="control-red"
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: "#ff5f57",
                  }}
                />
                <Box
                  className="control-yellow"
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: "#ffbd2e",
                  }}
                />
                <Box
                  className="control-green"
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: "#28c840",
                  }}
                />
                <Box
                  className="terminal-header-info"
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <TerminalIcon sx={{ ml: 1.5, fontSize: 16, color: "#999" }} />
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#999",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {server.username}@{server.host} — bash
                  </Typography>
                </Box>
              </Box>
              <Button
                className="terminal-clear-btn"
                size="small"
                sx={{
                  color: "#999",
                  fontSize: 10,
                  minWidth: 0,
                  textTransform: "none",
                }}
                onClick={() => setTermOutput([])}
              >
                clear
              </Button>
            </Box>

            {/* Terminal body */}
            <Box
              className="terminal-body"
              ref={termRef}
              onClick={() => {
                const input = document.getElementById("term-input-field");
                input?.focus();
              }}
              sx={{
                bgcolor: "#0c0c0c",
                px: 1.5,
                py: 1,
                minHeight: 350,
                maxHeight: 550,
                overflow: "auto",
                fontFamily:
                  "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
                fontSize: { xs: 11, sm: 13 },
                lineHeight: 1.5,
                cursor: "text",
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "#333",
                  borderRadius: 3,
                },
              }}
            >
              {termOutput.length === 0 && !termLoading && (
                <>
                  <Box className="terminal-welcome-msg" sx={{ color: "#5f5" }}>
                    Welcome to {server.name} ({server.host})
                  </Box>
                  <Box
                    className="terminal-welcome-sub"
                    sx={{ color: "#888", mb: 1 }}
                  >
                    Type commands to execute on the remote server.
                  </Box>
                </>
              )}

              {termOutput.map((entry, i) => (
                <Box key={i} className="terminal-output-line" sx={{ mb: 0.5 }}>
                  <Box className="terminal-line-cmd">
                    <span style={{ color: "#5f5" }}>{prompt}</span>{" "}
                    <span style={{ color: "#fff" }}>{entry.command}</span>
                  </Box>
                  {entry.stdout && (
                    <Box
                      className="terminal-line-stdout"
                      sx={{
                        color: "#ccc",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {entry.stdout}
                    </Box>
                  )}
                  {entry.stderr && (
                    <Box
                      className="terminal-line-stderr"
                      sx={{
                        color: "#f44",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {entry.stderr}
                    </Box>
                  )}
                </Box>
              ))}

              {termLoading && (
                <Box
                  className="terminal-loading-indicator"
                  sx={{ color: "#888" }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Skeleton variant="circular" width={10} height={10} />
                    <span>running...</span>
                  </Box>
                </Box>
              )}

              {!termLoading && (
                <Box
                  className="terminal-input-line"
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <span
                    className="terminal-prompt"
                    style={{ color: "#5f5", whiteSpace: "nowrap" }}
                  >
                    {prompt}
                  </span>
                  &nbsp;
                  <input
                    id="term-input-field"
                    className="terminal-input"
                    value={termInput}
                    onChange={(e) => setTermInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        await runCommand(termInput.trim());
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        if (termCmdHistory.length > 0) {
                          const next = Math.min(
                            termCmdIndex + 1,
                            termCmdHistory.length - 1,
                          );
                          setTermCmdIndex(next);
                          setTermInput(termCmdHistory[next]);
                        }
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        if (termCmdIndex > 0) {
                          const next = termCmdIndex - 1;
                          setTermCmdIndex(next);
                          setTermInput(termCmdHistory[next]);
                        } else {
                          setTermCmdIndex(-1);
                          setTermInput("");
                        }
                      }
                    }}
                    disabled={termLoading}
                    autoFocus
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#fff",
                      fontFamily:
                        "'JetBrains Mono', 'Cascadia Code', monospace",
                      fontSize: "inherit",
                      caretColor: "#5f5",
                      padding: 0,
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Related Projects */}
      {projects.length > 0 && (
        <Card className="related-projects-card">
          <CardContent className="projects-card-content" sx={{ p: 3 }}>
            <Typography
              className="projects-title"
              variant="subtitle2"
              fontWeight={600}
              sx={{ mb: 2 }}
            >
              <FolderIcon
                className="projects-icon"
                sx={{ fontSize: 18, mr: 1, verticalAlign: "text-bottom" }}
              />
              Projects on this Server ({projects.length})
            </Typography>
            <Box
              className="projects-list"
              sx={{ display: "flex", flexDirection: "column", gap: 1 }}
            >
              {projects.map((p) => (
                <Box
                  key={p._id}
                  className="project-item"
                  onClick={() => navigate(`/projects/${p._id}/deploy`)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.04)",
                      transform: "translateX(4px)",
                    },
                  }}
                >
                  <Box
                    className="project-info"
                    sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                  >
                    <RocketLaunchIcon
                      className="project-icon"
                      sx={{ fontSize: 18, color: "primary.main" }}
                    />
                    <Box>
                      <Typography
                        className="project-name"
                        variant="body2"
                        fontWeight={600}
                      >
                        {p.name}
                      </Typography>
                      <Typography
                        className="project-details"
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {p.branch} → {p.deployPath}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    className="project-status-chip"
                    label={p.status || "idle"}
                    size="small"
                    color={
                      p.status === "running"
                        ? "success"
                        : p.status === "failed"
                          ? "error"
                          : "default"
                    }
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                  />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog
        className="edit-server-dialog"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form className="edit-server-form" onSubmit={handleEdit}>
          <DialogTitle className="edit-server-title">
            {t("servers.editServer")}
          </DialogTitle>
          <DialogContent className="edit-server-content">
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
              <TextField
                className="field-name"
                label={t("common.name")}
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                required
                fullWidth
              />
              <TextField
                className="field-host"
                label={t("servers.host")}
                value={editForm.host}
                onChange={(e) =>
                  setEditForm({ ...editForm, host: e.target.value })
                }
                required
                fullWidth
              />
              <TextField
                className="field-port"
                label={t("servers.port")}
                type="number"
                value={editForm.port}
                onChange={(e) =>
                  setEditForm({ ...editForm, port: Number(e.target.value) })
                }
                fullWidth
              />
              <TextField
                className="field-username"
                label={t("servers.username")}
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
                required
                fullWidth
              />
              <FormControl className="field-auth-type" fullWidth>
                <InputLabel>{t("servers.authType")}</InputLabel>
                <Select
                  value={editForm.authType}
                  label={t("servers.authType")}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      authType: e.target.value as "password" | "key",
                    })
                  }
                >
                  <MenuItem value="password">Password</MenuItem>
                  <MenuItem value="key">SSH Key</MenuItem>
                </Select>
              </FormControl>
              {editForm.authType === "password" ? (
                <TextField
                  className="field-password"
                  label={t("servers.password")}
                  type="password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm({ ...editForm, password: e.target.value })
                  }
                  fullWidth
                  helperText="Leave blank to keep current"
                />
              ) : (
                <TextField
                  className="field-private-key"
                  label={t("servers.privateKey")}
                  value={editForm.privateKey}
                  onChange={(e) =>
                    setEditForm({ ...editForm, privateKey: e.target.value })
                  }
                  fullWidth
                  multiline
                  rows={4}
                  helperText="Leave blank to keep current"
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions className="edit-server-actions">
            <Button onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained">
              {t("common.save")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        className="delete-server-dialog"
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      >
        <DialogTitle className="delete-server-title">
          {t("servers.deleteServer")}
        </DialogTitle>
        <DialogContent className="delete-server-content">
          <Typography>{t("servers.confirmDelete")}</Typography>
        </DialogContent>
        <DialogActions className="delete-server-actions">
          <Button onClick={() => setDeleteOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServerDetail;
