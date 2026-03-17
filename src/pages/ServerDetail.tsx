import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  CircularProgress,
  Tabs,
  Tab,
  Drawer,
  Tooltip,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import DnsIcon from "@mui/icons-material/Dns";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PowerIcon from "@mui/icons-material/Power";
import TerminalIcon from "@mui/icons-material/Terminal";
import FolderIcon from "@mui/icons-material/Folder";
import RefreshIcon from "@mui/icons-material/Refresh";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SEO from "../components/SEO";
import { ServerTimeMachine } from "../components/ServerTimeMachine";
import { ServerSecurity } from "../components/ServerSecurity";
import ServerSetup from "../components/ServerSetup";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { getSocket } from "../services/socket";

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
  const theme = useTheme();

  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [projects, setProjects] = useState<RelatedProject[]>([]);
  const [testing, setTesting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const tabMapping: Record<string, number> = {
    overview: 0,
    "time-machine": 1,
    security: 2,
    setup: 3,
  };
  const reverseTabMapping = ["overview", "time-machine", "security", "setup"];

  const currentTab =
    tabParam && tabMapping[tabParam] !== undefined ? tabMapping[tabParam] : 0;

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSearchParams({ tab: reverseTabMapping[newValue] });
  };

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
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const termIdRef = useRef<number>(Date.now());
  const socketConnectedRef = useRef(false);

  const fetchServer = async () => {
    try {
      const { data } = await api.get(`/servers/${id}`);
      setServer(data);
    } catch {
      toast.error(t("servers.notFound"));
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
      toast.error(t("serverDetail.noStats"));
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
        toast.success(t("servers.testSuccess"));
        fetchServer();
      } else {
        toast.error(`${t("servers.testFailed")} ${data.message}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("servers.testError"));
    } finally {
      setTesting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/servers/${id}`, editForm);
      toast.success(t("servers.updated"));
      setEditOpen(false);
      fetchServer();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("servers.updateFailed"));
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/servers/${id}`);
      toast.success(t("servers.deleted"));
      navigate("/servers");
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("servers.deleteFailed"));
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

  const parsePercent = (s: string | undefined | null) => {
    if (!s) return 0;
    return parseFloat(s) || 0;
  };

  // Sync xterm theme when React Material UI theme changes
  useEffect(() => {
    if (xtermRef.current) {
      const isDark = theme.palette.mode === "dark";
      xtermRef.current.options.theme = {
        background: theme.palette.background.paper,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.primary.main,
        selectionBackground: theme.palette.primary.light,
        black: isDark ? "#000000" : "#ffffff",
        red: isDark ? "#cd3131" : "#cd3131",
        green: isDark ? "#0dbc79" : "#008000",
        yellow: isDark ? "#e5e510" : "#b58900",
        blue: isDark ? "#2472c8" : "#268bd2",
        magenta: isDark ? "#bc3fbc" : "#d33682",
        cyan: isDark ? "#11a8cd" : "#2aa198",
        white: isDark ? "#e5e5e5" : "#000000",
        brightBlack: isDark ? "#666666" : "#808080",
        brightRed: isDark ? "#f14c4c" : "#cb4b16",
        brightGreen: isDark ? "#23d18b" : "#586e75",
        brightYellow: isDark ? "#f5f543" : "#657b83",
        brightBlue: isDark ? "#3b8eea" : "#839496",
        brightMagenta: isDark ? "#d670d6" : "#6c71c4",
        brightCyan: isDark ? "#29b8db" : "#93a1a1",
        brightWhite: isDark ? "#e5e5e5" : "#073642",
      };
    }
  }, [
    theme.palette.mode,
    theme.palette.background.paper,
    theme.palette.text.primary,
    theme.palette.primary.main,
    theme.palette.primary.light,
  ]);

  useEffect(() => {
    if (!server || !termRef.current || currentTab !== 0) return;

    if (!xtermRef.current) {
      const isDark = theme.palette.mode === "dark";
      const xterm = new Terminal({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
        fontSize: 13,
        theme: {
          background: theme.palette.background.paper,
          foreground: theme.palette.text.primary,
          cursor: theme.palette.primary.main,
          selectionBackground: theme.palette.primary.light,
          black: isDark ? "#000000" : "#ffffff",
          red: isDark ? "#cd3131" : "#cd3131",
          green: isDark ? "#0dbc79" : "#008000",
          yellow: isDark ? "#e5e510" : "#b58900",
          blue: isDark ? "#2472c8" : "#268bd2",
          magenta: isDark ? "#bc3fbc" : "#d33682",
          cyan: isDark ? "#11a8cd" : "#2aa198",
          white: isDark ? "#e5e5e5" : "#000000",
          brightBlack: isDark ? "#666666" : "#808080",
          brightRed: isDark ? "#f14c4c" : "#cb4b16",
          brightGreen: isDark ? "#23d18b" : "#586e75",
          brightYellow: isDark ? "#f5f543" : "#657b83",
          brightBlue: isDark ? "#3b8eea" : "#839496",
          brightMagenta: isDark ? "#d670d6" : "#6c71c4",
          brightCyan: isDark ? "#29b8db" : "#93a1a1",
          brightWhite: isDark ? "#e5e5e5" : "#073642",
        },
      });
      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.open(termRef.current);

      setTimeout(() => {
        fitAddon.fit();
      }, 50);

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      const socket = getSocket();
      if (socket) {
        socketConnectedRef.current = true;
        socket.emit("join:server", server._id);

        const termId = termIdRef.current;

        xterm.onData((data) => {
          socket.emit("terminal:data", { termId, data });
        });

        xterm.onResize((size) => {
          socket.emit("terminal:resize", {
            termId,
            rows: size.rows,
            cols: size.cols,
          });
        });

        const handleOutput = (data: { termId: number; data: string }) => {
          if (data.termId === termId) {
            xterm.write(data.data);
          }
        };

        const handleExit = (data: { termId: number }) => {
          if (data.termId === termId) {
            xterm.write("\r\n\x1b[33m[Connection Closed]\x1b[0m\r\n");
          }
        };

        socket.on("terminal:output", handleOutput);
        socket.on("terminal:exit", handleExit);

        // --- Add Copy/Paste Keyboard Handlers ---
        xterm.attachCustomKeyEventHandler((arg) => {
          if (arg.ctrlKey && arg.type === "keydown") {
            // Ctrl + C (Copy)
            if (arg.code === "KeyC" && xterm.hasSelection()) {
              navigator.clipboard.writeText(xterm.getSelection());
              return false;
            }
            // Ctrl + V (Paste)
            if (arg.code === "KeyV") {
              navigator.clipboard.readText().then((text) => {
                socket.emit("terminal:data", { termId, data: text });
              });
              return false;
            }
          }
          return true; // Let xterm handle everything else
        });

        // Add Right-click to Paste
        const handleContextMenu = async (e: Event) => {
          e.preventDefault();
          if (xterm.hasSelection()) {
            // If they have text selected, right click copies it
            navigator.clipboard.writeText(xterm.getSelection());
            xterm.clearSelection();
          } else {
            // If nothing is selected, right click pastes
            try {
              const text = await navigator.clipboard.readText();
              socket.emit("terminal:data", { termId, data: text });
            } catch (err) {
              console.error("Failed to read clipboard:", err);
            }
          }
        };

        // We have to attach after a tiny delay so the DOM element is rendered
        setTimeout(() => {
          if (termRef.current) {
            const terminalEl = termRef.current.querySelector(".xterm");
            if (terminalEl) {
              terminalEl.addEventListener(
                "contextmenu",
                handleContextMenu as EventListener,
              );
            }
          }
        }, 100);

        // Start session
        socket.emit("terminal:start", {
          serverId: server._id,
          termId,
          rows: xterm.rows,
          cols: xterm.cols,
        });

        return () => {
          socket.off("terminal:output", handleOutput);
          socket.off("terminal:exit", handleExit);
          socket.emit("terminal:close", { termId });
          xterm.dispose();
          xtermRef.current = null;
        };
      }
    }

    const handleResize = () => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch {
          /* ignore if already disposed */
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [server, currentTab]);

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
                <CircularProgress size={16} color="inherit" />
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="server detail tabs"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Overview & Terminal" />
          <Tab label="Time Machine" />
          <Tab label={t("security.tabTitle", "Security & Compliance")} />
          <Tab label={t("serverSetup.tabTitle", "Setup")} />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      {currentTab === 0 && (
        <>
          {/* Server Info + Stats row */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2.5,
              mb: 3,
            }}
          >
            {/* Server Info */}
            <Card className="server-info-card" sx={{ flex: 1 }}>
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
                        alignItems: "center",
                        py: 0.5,
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        gap: 2,
                      }}
                    >
                      <Typography
                        className="server-info-label"
                        variant="body2"
                        color="text.secondary"
                        noWrap
                        sx={{ minWidth: 0, flexShrink: 0 }}
                      >
                        {item.label}
                      </Typography>
                      <Typography
                        className="server-info-value"
                        variant="body2"
                        fontWeight={500}
                        noWrap
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          minWidth: 0,
                          textAlign: "right",
                        }}
                      >
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* System Stats */}
            <Card className="system-stats-card" sx={{ flex: 1 }}>
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
                        <CircularProgress size={16} color="inherit" />
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
                      ? t("serverDetail.loading")
                      : t("serverDetail.noStats")}
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
                          {stats.memory?.used || "?"} /{" "}
                          {stats.memory?.total || "?"} (
                          {stats.memory?.percent || "0%"})
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
                          {stats.disk?.used || "?"} / {stats.disk?.total || "?"}{" "}
                          ({stats.disk?.percent || "0%"})
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
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "#2d2d2d"
                        : theme.palette.grey[200],
                    borderBottom: 1,
                    borderColor: "divider",
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
                      <TerminalIcon
                        sx={{
                          ml: 1.5,
                          fontSize: 16,
                          color: theme.palette.text.secondary,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: 12,
                          color: theme.palette.text.secondary,
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
                      color: theme.palette.text.secondary,
                      fontSize: 10,
                      minWidth: 0,
                      textTransform: "none",
                    }}
                    onClick={() => xtermRef.current?.clear()}
                  >
                    {t("serverDetail.clear")}
                  </Button>
                </Box>

                {/* Terminal body */}
                <Box
                  className="terminal-body"
                  ref={termRef}
                  sx={{
                    bgcolor: theme.palette.background.paper,
                    px: 1.5,
                    py: 1,
                    height: 550,
                    overflow: "hidden",
                    ".xterm-viewport": {
                      "&::-webkit-scrollbar": { width: 6 },
                      "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                      "&::-webkit-scrollbar-thumb": {
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "#333"
                            : theme.palette.grey[400],
                        borderRadius: 3,
                      },
                    },
                  }}
                />
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
                  {t("serverDetail.projectsOnServer")} ({projects.length})
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
        </>
      )}

      {/* Time Machine Tab */}
      {currentTab === 1 && <ServerTimeMachine serverId={server._id} />}

      {/* Security Tab */}
      {currentTab === 2 && <ServerSecurity serverId={server._id} />}

      {/* Setup Tab */}
      {currentTab === 3 && <ServerSetup serverId={server._id} />}

      {/* Edit Drawer */}
      <Drawer
        anchor="right"
        className="edit-server-drawer"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 500 } },
        }}
      >
        <Box
          sx={{
            p: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" className="edit-server-title">
            {t("servers.editServer")}
          </Typography>
          <IconButton onClick={() => setEditOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <form
          className="edit-server-form"
          onSubmit={handleEdit}
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <Box
            className="edit-server-content"
            sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                sx={{
                  "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                    {
                      display: "none",
                    },
                  "& input[type=number]": {
                    MozAppearance: "textfield",
                  },
                }}
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
                  helperText={t("serverDetail.passwordPlaceholder")}
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
                  helperText={t("serverDetail.privateKeyPlaceholder")}
                />
              )}
            </Box>
          </Box>
          <Box
            className="edit-server-actions"
            sx={{
              p: 3,
              borderTop: 1,
              borderColor: "divider",
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            <Button onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained">
              {t("common.save")}
            </Button>
          </Box>
        </form>
      </Drawer>

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
          <Typography>
            {t("servers.confirmDelete", { name: server?.name })}
          </Typography>
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
