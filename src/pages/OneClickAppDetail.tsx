import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  TextField,
  FormControl, // Added
  InputLabel, // Added
  Select, // Added
  Divider, // Added
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon,
  DeleteOutline as UninstallIcon,
  Key as AuthIcon,
  Save as SaveIcon,
  Dashboard as DashboardIcon,
  OpenInNew as OpenInNewIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Add as AddIcon, // Added
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

// Mocked API imports as per existing logic in frontend/src/services/api.ts
import api from "../services/api";
import toast from "react-hot-toast";
import yaml from "js-yaml";
// Also need Editor from monaco if used, but we'll use a simple textarea for config editing initially to minimize dependencies
import Editor from "@monaco-editor/react";
import { CLIProxyDashboard } from "../components/CLIProxyDashboard";
import { OpenClawDashboard } from "../components/OpenClawDashboard";
import { useServer } from "../contexts/ServerContext";

interface AppDetail {
  id: string;
  name: string;
  description: string;
  icon: string;
  installed: boolean;
  containerStatus?: string;
  state?: string;
  created?: string;
  hostIp?: string;
  port?: number;
}

const OneClickAppDetail: React.FC = () => {
  const { id: urlServerId, appId } = useParams<{ id: string; appId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { selectedServer } = useServer();
  const theme = useTheme();

  // Redirect if global server selector changes
  useEffect(() => {
    if (selectedServer && urlServerId && selectedServer._id !== urlServerId) {
      navigate(
        `/one-click/${selectedServer._id}/${appId}?${searchParams.toString()}`,
      );
    }
  }, [selectedServer, urlServerId, appId, navigate, searchParams]);

  // Use the urlServerId for data fetching. It will quickly update when navigated.
  const serverId = urlServerId;

  const [app, setApp] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize active tab from search params
  const initialTabQuery = searchParams.get("tab");
  const defaultTab = 0;
  let initialTab = defaultTab;

  if (initialTabQuery) {
    if (appId === "cliproxyapi" || appId === "openclaw") {
      if (initialTabQuery === "dashboard") initialTab = 0;
      else if (initialTabQuery === "logs") initialTab = 1;
      else if (initialTabQuery === "config") initialTab = 2;
    } else {
      if (initialTabQuery === "logs") initialTab = 0;
      else if (initialTabQuery === "config") initialTab = 1;
    }
  }

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tabQuery = searchParams.get("tab");
    let newTab = 0;
    if (tabQuery) {
      if (appId === "cliproxyapi" || appId === "openclaw") {
        if (tabQuery === "dashboard") newTab = 0;
        else if (tabQuery === "logs") newTab = 1;
        else if (tabQuery === "config") newTab = 2;
      } else {
        if (tabQuery === "logs") newTab = 0;
        else if (tabQuery === "config") newTab = 1;
      }
    }
    setActiveTab(newTab);
  }, [searchParams, appId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    if (appId === "cliproxyapi" || appId === "openclaw") {
      if (newValue === 0) setSearchParams({ tab: "dashboard" });
      else if (newValue === 1) setSearchParams({ tab: "logs" });
      else if (newValue === 2) setSearchParams({ tab: "config" });
    } else {
      if (newValue === 0) setSearchParams({ tab: "logs" });
      else if (newValue === 1) setSearchParams({ tab: "config" });
    }
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Manage Providers State (Added by user instruction)
  const [providerDialog, setProviderDialog] = useState(false);
  const [activeProviders, setActiveProviders] = useState<string[]>([]);
  const [savingProviders, setSavingProviders] = useState(false);

  // Change Password State (Added by user instruction)
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordChanging, setPasswordChanging] = useState(false);

  // SSE Action State
  const [actionDialog, setActionDialog] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionLogs, setActionLogs] = useState<string[]>([]);
  const [actionStatus, setActionStatus] = useState<
    "running" | "done" | "error"
  >("running");

  // Config State
  const [configContent, setConfigContent] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  // Terminal Ref
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const logsInterval = useRef<any>(null);

  // OAuth State
  const [oauthDialog, setOauthDialog] = useState(false);
  const [oauthLink, setOauthLink] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthAnchorEl, setOauthAnchorEl] = useState<null | HTMLElement>(null);

  // Dashboard Refresh State
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  // Available Providers State (Added)
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  const loadData = async () => {
    try {
      const res = await api.get(
        `/servers/${serverId}/one-click/${appId}/detail`,
      );
      setApp(res.data);

      const configTabIdx =
        appId === "cliproxyapi" || appId === "openclaw" ? 2 : 1;

      // Only fetch config initially if we don't have it and we are on the config tab
      // or if it's cliproxyapi which needs it for the provider list
      if (res.data.installed && !configContent) {
        if (activeTab === configTabIdx || appId === "cliproxyapi") {
          fetchConfig();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Only poll the detail endpoint to check if installation status changed.
    // We do not want to constantly poll config or logs here as they have their own pollers.
    // Polling every 30s instead of 5s to reduce network load.
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [serverId, appId]);

  const fetchConfig = async () => {
    try {
      const res = await api.get(
        `/servers/${serverId}/one-click/${appId}/config`,
      );
      setConfigContent(res.data.content);
    } catch (err) {
      console.error(err);
      setConfigContent(
        "# Failed to load configuration.\n# It might not exist yet.",
      );
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.post(`/servers/${serverId}/one-click/${appId}/config`, {
        content: configContent,
      });
      toast.success("Config saved! Container restarting...");
      // reload app status and config
      loadData();
      fetchConfig();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save config");
    } finally {
      setSavingConfig(false);
    }
  };

  // handleSavePassword function (Renamed to handleChangePassword)
  const handleChangePassword = async () => {
    if (!newPassword) return;
    setPasswordChanging(true);
    try {
      await api.post(`/servers/${serverId}/one-click/${appId}/password`, {
        password: newPassword,
      });
      toast.success("Password updated! Proxy container restarted.");
      setPasswordDialog(false);
      setNewPassword("");
      loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordChanging(false);
    }
  };

  const handleAction = async (
    action: "start" | "stop" | "restart" | "uninstall",
  ) => {
    if (action === "uninstall") {
      const confirmed = window.confirm(
        `Are you sure you want to completely remove ${app?.name}? This will delete all its data and containers.`,
      );
      if (!confirmed) return;

      setActionTitle("Uninstalling " + app?.name);
      setActionDialog(true);
      setActionLogs([]);
      setActionStatus("running");

      const eventSource = new EventSource(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5012/api"
        }/servers/${serverId}/one-click/uninstall/${appId}?token=${localStorage.getItem("token")}`,
      );

      eventSource.addEventListener("step", (e: any) => {
        const data = JSON.parse(e.data);
        setActionLogs((prev) => [
          ...prev,
          `➤ Step ${data.step}/${data.total}: ${data.label}`,
        ]);
      });

      eventSource.addEventListener("log", (e: any) => {
        const data = JSON.parse(e.data);
        setActionLogs((prev) => [...prev, data.text]);
      });

      eventSource.addEventListener("done", (e: any) => {
        const data = JSON.parse(e.data);
        eventSource.close();
        if (data.success) {
          setActionLogs((prev) => [...prev, "✅ Uninstalled successfully."]);
          setActionStatus("done");
          setTimeout(() => {
            setActionDialog(false);
            navigate(`/servers/${serverId}/one-click`);
          }, 1500);
        } else {
          setActionLogs((prev) => [
            ...prev,
            `❌ Uninstall failed: ${data.error}`,
          ]);
          setActionStatus("error");
          loadData();
        }
      });

      eventSource.addEventListener("error", (e: any) => {
        const data = JSON.parse(e.data);
        setActionLogs((prev) => [...prev, `❌ Error: ${data.message}`]);
        setActionStatus("error");
        eventSource.close();
      });

      return;
    }

    setActionTitle(
      `${action.charAt(0).toUpperCase() + action.slice(1)}ing ${app?.name}`,
    );
    setActionDialog(true);
    setActionLogs([]);
    setActionStatus("running");

    // We use EventSource for SSE. The backend endpoint needs to be GET to work cleanly with EventSource.
    // However, it's currently a POST in routes. Let's pass action in the query string if we change it or use fetch polyfill.
    // Assuming backend will be updated to GET for SSE:
    const eventSource = new EventSource(
      `${
        import.meta.env.VITE_API_URL || "http://localhost:5012/api"
      }/servers/${serverId}/one-click/${appId}/action?action=${action}&token=${localStorage.getItem("token")}`,
    );

    eventSource.addEventListener("step", (e: any) => {
      const data = JSON.parse(e.data);
      setActionLogs((prev) => [
        ...prev,
        `➤ Step ${data.step}/${data.total}: ${data.label}`,
      ]);
    });

    eventSource.addEventListener("log", (e: any) => {
      const data = JSON.parse(e.data);
      setActionLogs((prev) => [...prev, data.text]);
    });

    eventSource.addEventListener("done", (e: any) => {
      const data = JSON.parse(e.data);
      eventSource.close();
      if (data.success) {
        setActionLogs((prev) => [
          ...prev,
          `✅ Action '${action}' completed successfully.`,
        ]);
        setActionStatus("done");
        setTimeout(() => {
          setActionDialog(false);
          loadData();
          const logsTabIdx = appId === "cliproxyapi" ? 1 : 0;
          if (activeTab === logsTabIdx) fetchLogs();
        }, 1500);
      } else {
        setActionLogs((prev) => [...prev, `❌ Action failed: ${data.error}`]);
        setActionStatus("error");
      }
    });

    eventSource.addEventListener("error", (e: any) => {
      const data = JSON.parse(e.data);
      setActionLogs((prev) => [...prev, `❌ Error: ${data.message}`]);
      setActionStatus("error");
      eventSource.close();
    });
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get(
        `/servers/${serverId}/one-click/${appId}/logs?lines=200`,
      );
      if (xtermRef.current) {
        xtermRef.current.clear();
        xtermRef.current.write(res.data.logs.replace(/\\n/g, "\\r\\n"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // We only initialize terminal if the ref is attached, we are on the Logs tab, and it's not initialized yet
    // React might mount refs after this effect runs first time, so we use a small delay or check
    let initialized = false;
    const logsTabIdx = appId === "cliproxyapi" ? 1 : 0;
    const configTabIdx = appId === "cliproxyapi" ? 2 : 1;

    if (activeTab === logsTabIdx && app?.installed) {
      // Delay initialization slightly to let the tab display block fully render so FitAddon gets dimensions
      const initTerminal = setTimeout(() => {
        if (terminalRef.current && !xtermRef.current) {
          const term = new Terminal({
            theme: {
              background: "#0d1117",
              foreground: "#c9d1d9",
              cursor: "#8b949e",
            },
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 14,
            convertEol: true,
            disableStdin: true,
          });

          const fitAddon = new FitAddon();
          term.loadAddon(fitAddon);
          term.open(terminalRef.current);
          fitAddon.fit();

          xtermRef.current = term;
          fitAddonRef.current = fitAddon;

          const handleResize = () => fitAddonRef.current?.fit();
          window.addEventListener("resize", handleResize);

          fetchLogs();
          logsInterval.current = setInterval(fetchLogs, 5000);
          initialized = true;

          // Cleanup inner
          return () => {
            window.removeEventListener("resize", handleResize);
            clearInterval(logsInterval.current);
            term.dispose();
            xtermRef.current = null;
          };
        } else if (xtermRef.current) {
          // If already exists, just fetch
          fitAddonRef.current?.fit();
          fetchLogs();
          logsInterval.current = setInterval(fetchLogs, 5000);
        }
      }, 50);

      return () => {
        clearTimeout(initTerminal);
        if (logsInterval.current) clearInterval(logsInterval.current);
      };
    } else if (activeTab === configTabIdx && app?.installed) {
      fetchConfig();
      if (logsInterval.current) clearInterval(logsInterval.current);
    }
  }, [activeTab, serverId, appId, app?.installed]);

  // OAuth Handlers
  const handleOpenOAuthDialog = async (provider: string) => {
    setOauthAnchorEl(null);
    setOauthLoading(true);
    try {
      const res = await api.get(
        `/servers/${serverId}/one-click/cliproxyapi/oauth/url?provider=${provider}`,
      );
      setOauthLink(res.data.url);
      setOauthDialog(true);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message;
      toast.error(errMsg);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleVerifyCallback = async () => {
    setOauthLoading(true);
    try {
      await api.post(
        `/servers/${serverId}/one-click/cliproxyapi/oauth/callback`,
        {
          callbackUrl,
        },
      );
      setOauthDialog(false);
      setCallbackUrl("");
      toast.success("Authentication Successful!");
      setDashboardRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Authentication Failed");
    } finally {
      setOauthLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!app) return <Typography>App not found</Typography>;

  const isRunning = app.state === "running";

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          gap: 3,
          mb: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            flexGrow: 1,
            width: "100%",
          }}
        >
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2, mt: 0.5 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box
            sx={{
              width: 64,
              height: 64,
              mr: 3,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            {app.icon?.startsWith("http") || app.icon?.startsWith("/") ? (
              <Box
                component="img"
                src={app.icon}
                alt={app.name}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: 2,
                }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                  (e.target as HTMLElement).parentElement!.innerHTML = "📦";
                }}
              />
            ) : (
              app.icon || "📦"
            )}
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5,
                mb: 0.5,
              }}
            >
              <Typography
                variant="h4"
                fontWeight="800"
                sx={{ letterSpacing: "-0.02em" }}
              >
                {app.name}
              </Typography>
              {app.installed ? (
                <Chip
                  label={isRunning ? "Running" : app.state || "Stopped"}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    borderRadius: 1.5,
                    px: 0.5,
                    border: isRunning ? "none" : "1px solid",
                    borderColor: "divider",
                    bgcolor: isRunning ? "success.main" : "background.paper",
                    color: isRunning
                      ? "success.contrastText"
                      : "text.secondary",
                  }}
                />
              ) : (
                <Chip label="Not Installed" size="small" />
              )}
            </Box>
            <Typography
              color="text.secondary"
              variant="body1"
              sx={{ maxWidth: 800 }}
            >
              {app.description}
            </Typography>
            {app.containerStatus && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Status: {app.containerStatus}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Action Buttons */}
        {app.installed && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1.5,
              width: { xs: "100%", md: "auto" },
              justifyContent: { xs: "flex-start", md: "flex-end" },
            }}
          >
            {appId === "cliproxyapi" && isRunning && (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  mr: { xs: 0, sm: 1 },
                }}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={<OpenInNewIcon fontSize="small" />}
                  onClick={() =>
                    window.open(
                      `http://${app.hostIp}:${app.port}/management.html`,
                      "_blank",
                    )
                  }
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    bgcolor: "background.paper",
                  }}
                >
                  Open External
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<AuthIcon fontSize="small" />}
                  endIcon={<ArrowDownIcon fontSize="small" />}
                  onClick={(e) => setOauthAnchorEl(e.currentTarget)}
                  disabled={oauthLoading}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  OAuth Login
                </Button>

                <Menu
                  anchorEl={oauthAnchorEl}
                  open={Boolean(oauthAnchorEl)}
                  onClose={() => setOauthAnchorEl(null)}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 160,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    },
                  }}
                >
                  <MenuItem onClick={() => handleOpenOAuthDialog("gemini")}>
                    Gemini Auth
                  </MenuItem>
                  <MenuItem onClick={() => handleOpenOAuthDialog("openai")}>
                    OpenAI Auth
                  </MenuItem>
                  <MenuItem onClick={() => handleOpenOAuthDialog("codex")}>
                    Codex Auth
                  </MenuItem>
                  <MenuItem onClick={() => handleOpenOAuthDialog("anthropic")}>
                    Anthropic Auth
                  </MenuItem>
                </Menu>

                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<AuthIcon fontSize="small" />}
                  onClick={() => setPasswordDialog(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Change Password
                </Button>
              </Box>
            )}

            <Paper
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                p: 0.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "background.paper",
              }}
            >
              {!isRunning ? (
                <Tooltip title="Start Container">
                  <IconButton
                    size="small"
                    onClick={() => handleAction("start")}
                    color="primary"
                    disabled={!!actionLoading}
                    sx={{ borderRadius: 1.5 }}
                  >
                    {actionLoading === "start" ? (
                      <CircularProgress size={20} />
                    ) : (
                      <StartIcon />
                    )}
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Stop Container">
                  <IconButton
                    size="small"
                    onClick={() => handleAction("stop")}
                    color="warning"
                    disabled={!!actionLoading}
                    sx={{ borderRadius: 1.5 }}
                  >
                    {actionLoading === "stop" ? (
                      <CircularProgress size={20} />
                    ) : (
                      <StopIcon />
                    )}
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Restart Container">
                <IconButton
                  size="small"
                  onClick={() => handleAction("restart")}
                  color="info"
                  disabled={!!actionLoading}
                  sx={{ borderRadius: 1.5 }}
                >
                  {actionLoading === "restart" ? (
                    <CircularProgress size={20} />
                  ) : (
                    <RestartIcon />
                  )}
                </IconButton>
              </Tooltip>

              <Box
                sx={{ width: "1px", height: 24, bgcolor: "divider", mx: 0.5 }}
              />

              <Tooltip title="Uninstall App">
                <IconButton
                  size="small"
                  onClick={() => handleAction("uninstall")}
                  color="error"
                  disabled={!!actionLoading}
                  sx={{ borderRadius: 1.5 }}
                >
                  {actionLoading === "uninstall" ? (
                    <CircularProgress size={20} />
                  ) : (
                    <UninstallIcon />
                  )}
                </IconButton>
              </Tooltip>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      {app.installed && (
        <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}
          >
            {(appId === "cliproxyapi" || appId === "openclaw") && (
              <Tab label="Dashboard" />
            )}
            <Tab label="Container Logs" />
            <Tab label="Configuration (config.yaml)" />
          </Tabs>

          <Box sx={{ p: 0 }}>
            {/* Dashboard Tab */}
            {(appId === "cliproxyapi" || appId === "openclaw") && (
              <Box
                sx={{
                  display: activeTab === 0 ? "block" : "none",
                  minHeight: 600,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {activeTab === 0 && app.installed && (
                  <Box sx={{ mt: 3, px: 3 }}>
                    {appId === "cliproxyapi" ? (
                      <CLIProxyDashboard
                        serverId={serverId as string}
                        appId={appId as string}
                        refreshTrigger={dashboardRefreshKey}
                      />
                    ) : (
                      <OpenClawDashboard
                        serverId={serverId as string}
                        appId={appId as string}
                        refreshTrigger={dashboardRefreshKey}
                      />
                    )}
                  </Box>
                )}
              </Box>
            )}

            {/* Logs Tab */}
            <Box
              sx={{
                display:
                  activeTab ===
                  (appId === "cliproxyapi" || appId === "openclaw" ? 1 : 0)
                    ? "block"
                    : "none",
                height: 600,
              }}
            >
              <div
                ref={terminalRef}
                style={{ width: "100%", height: "100%" }}
              />
            </Box>

            {/* Config Tab */}
            <Box
              sx={{
                display:
                  activeTab ===
                  (appId === "cliproxyapi" || appId === "openclaw" ? 2 : 1)
                    ? "block"
                    : "none",
                height: 600,
                position: "relative",
              }}
            >
              <Editor
                height="100%"
                language="yaml"
                theme="vs-dark"
                value={configContent}
                onChange={(value) => setConfigContent(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                }}
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                sx={{ position: "absolute", bottom: 16, right: 16 }}
                onClick={handleSaveConfig}
                disabled={savingConfig}
              >
                Save & Restart
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* OAuth Dialog */}
      <Dialog open={oauthDialog} maxWidth="sm" fullWidth>
        <DialogTitle>OAuth Authentication</DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            Step 1: Click the generic link below and log into your provider API.
          </DialogContentText>
          <Button
            variant="outlined"
            href={oauthLink}
            target="_blank"
            sx={{ mb: 3 }}
          >
            Open Login Page
          </Button>

          <DialogContentText paragraph>
            Step 2: After the browser redirects to localhost and shows "Site
            cannot be reached", copy the entire localhost URL and paste it
            below.
          </DialogContentText>

          <textarea
            style={{
              width: "100%",
              padding: "12px",
              minHeight: "80px",
              borderRadius: "4px",
              background: "#222",
              color: "#fff",
            }}
            placeholder="http://localhost:8085/oauth2callback?state=xxx..."
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOauthDialog(false)}>Cancel</Button>
          <Button
            onClick={handleVerifyCallback}
            variant="contained"
            disabled={oauthLoading || !callbackUrl}
          >
            Verify
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog (Added by user instruction) */}
      <Dialog
        open={passwordDialog}
        onClose={() => !passwordChanging && setPasswordDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Change Admin Password
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Enter a new password for remote management.
          </DialogContentText>

          <TextField
            fullWidth
            label="New Password"
            type="password"
            variant="outlined"
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewPassword(e.target.value)
            }
            disabled={passwordChanging}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setPasswordDialog(false)}
            disabled={passwordChanging}
            sx={{ color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            disabled={!newPassword || passwordChanging}
            variant="contained"
            color="primary"
          >
            {passwordChanging ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Update Password"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Progress Dialog (SSE) */}
      <Dialog
        open={actionDialog}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={actionStatus === "running"}
      >
        <DialogTitle sx={{ pb: 1 }}>{actionTitle}</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#0d1117", p: 0 }}>
          <Box
            sx={{
              height: 400,
              overflowY: "auto",
              p: 2,
              fontFamily: "monospace",
              fontSize: "0.85rem",
              color: "#c9d1d9",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {actionLogs.map((log, idx) => (
              <Box
                key={idx}
                component="span"
                sx={{
                  whiteSpace: "pre-wrap",
                  mb: 0.5,
                  color: log.includes("❌")
                    ? "#ff7b72"
                    : log.includes("✅")
                      ? "#3fb950"
                      : log.includes("➤")
                        ? "#79c0ff"
                        : "inherit",
                }}
              >
                {log}
              </Box>
            ))}
            {actionStatus === "running" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 2,
                  color: "#8b949e",
                }}
              >
                <CircularProgress
                  size={14}
                  thickness={5}
                  sx={{ color: "inherit", mr: 1 }}
                />
                Processing...
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setActionDialog(false);
              loadData();
            }}
            disabled={actionStatus === "running"}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OneClickAppDetail;
