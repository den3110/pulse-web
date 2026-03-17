import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Drawer,
  Divider,
  Autocomplete,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TerminalIcon from "@mui/icons-material/Terminal";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import SEO from "../components/SEO";
import { useServer } from "../contexts/ServerContext";

/* ───────── Types ───────── */

interface Server {
  _id: string;
  name: string;
  host: string;
  status: "online" | "offline" | "unknown";
}

interface Provider {
  id: string;
  name: string;
  icon: string;
}

interface OneClickApp {
  id: string;
  name: string;
  icon: string;
  description: string;
  docs: string;
  defaultPort: number;
  providers?: Provider[];
}

interface AppStatus {
  installed: boolean;
  version: string;
  containerStatus?: string;
}

/* ───────── Component ───────── */

const OneClickInstall: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";

  // State Context
  const { selectedServer } = useServer();

  // State
  const [apps, setApps] = useState<OneClickApp[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AppStatus>>({});
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [uninstalling, setUninstalling] = useState<string | null>(null);

  // CLIProxyAPI config
  const [selectedProviders, setSelectedProviders] = useState<string[]>([
    "gemini",
  ]);
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});
  const [selectedPort, setSelectedPort] = useState(8317);
  const [selectedPassword, setSelectedPassword] = useState<string>("");

  // OAuth UI State
  const [oauthOpen, setOauthOpen] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const [oauthStep, setOauthStep] = useState(0);
  const [oauthUrl, setOauthUrl] = useState("");
  const [oauthCallbackUrl, setOauthCallbackUrl] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);

  // Install log drawer
  const [logOpen, setLogOpen] = useState(false);
  const [logLines, setLogLines] = useState<
    { text: string; type: "stdout" | "stderr" }[]
  >([]);
  const [currentStep, setCurrentStep] = useState<{
    step: number;
    total: number;
    label: string;
  } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  /* ───── Data fetching ───── */

  const fetchApps = useCallback(async () => {
    if (!selectedServer) return;
    try {
      const { data } = await api.get(
        `/servers/${selectedServer._id}/one-click/apps`,
      );
      setApps(data);
    } catch {
      /* ignore */
    }
  }, [selectedServer]);

  const checkStatuses = useCallback(async () => {
    if (!selectedServer) return;
    setChecking(true);
    try {
      const { data } = await api.post(
        `/servers/${selectedServer._id}/one-click/check`,
      );
      setStatuses(data);
    } catch {
      toast.error(t("oneClick.checkFailed", "Failed to check app status"));
    } finally {
      setChecking(false);
    }
  }, [selectedServer, t]);

  useEffect(() => {
    if (selectedServer) {
      fetchApps();
      checkStatuses();
    }
  }, [selectedServer]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logLines]);

  /* ───── SSE install/uninstall ───── */

  const startInstall = (appId: string) => {
    if (!selectedServer) return;
    setInstalling(appId);
    setLogLines([]);
    setCurrentStep(null);
    setLogOpen(true);

    const token = localStorage.getItem("accessToken");
    let url = "";
    if (appId === "cliproxyapi") {
      let proxyUrl = `${import.meta.env.VITE_API_URL || ""}/api/servers/${selectedServer._id}/one-click/install/cliproxyapi?provider=${selectedProviders.join(",")}&port=${selectedPort}&token=${token}`;
      if (selectedPassword) {
        proxyUrl += `&adminPassword=${encodeURIComponent(selectedPassword)}`;
      }
      url = proxyUrl;
    } else {
      url = `${import.meta.env.VITE_API_URL || ""}/api/servers/${selectedServer._id}/one-click/install/openclaw?token=${token}`;
    }

    const es = new EventSource(url);

    es.addEventListener("step", (e) => {
      const data = JSON.parse(e.data);
      setCurrentStep(data);
      setLogLines((prev) => [
        ...prev,
        {
          text: `\n━━━ Step ${data.step}/${data.total}: ${data.label} ━━━\n`,
          type: "stdout",
        },
      ]);
    });

    es.addEventListener("log", (e) => {
      const data = JSON.parse(e.data);
      setLogLines((prev) => [...prev, { text: data.text, type: data.type }]);
    });

    es.addEventListener("done", (e) => {
      const data = JSON.parse(e.data);
      let successStatus = false;
      if (data.success) {
        toast.success(t("oneClick.installSuccess", { app: appId }));
        setLogLines((prev) => [
          ...prev,
          {
            text: "\n✅ Installation completed successfully!\n",
            type: "stdout",
          },
        ]);
        successStatus = true;
      } else {
        toast.error(t("oneClick.installFailed", { app: appId }));
        setLogLines((prev) => [
          ...prev,
          { text: "\n❌ Installation failed\n", type: "stderr" },
        ]);
      }
      setInstalling(null);
      checkStatuses();
      es.close();
      if (successStatus) {
        setTimeout(() => setLogOpen(false), 3000);
      }
    });

    es.addEventListener("error", (e: any) => {
      toast.error(t("oneClick.installError", "Installation error"));
      setInstalling(null);
      es.close();
    });

    es.onerror = () => {
      if (installing) {
        setInstalling(null);
        es.close();
      }
    };
  };

  const startUninstall = (appId: string) => {
    if (!selectedServer) return;
    const appName = apps.find((a) => a.id === appId)?.name || appId;
    setUninstalling(appId);
    setLogLines([
      { text: `\n━━━ ${appName} removing.... ━━━\n`, type: "stdout" },
    ]);
    setCurrentStep(null);
    setLogOpen(true);

    const token = localStorage.getItem("accessToken");
    const url = `${import.meta.env.VITE_API_URL || ""}/api/servers/${selectedServer._id}/one-click/uninstall/${appId}?token=${token}`;

    const es = new EventSource(url);

    es.addEventListener("log", (e) => {
      const data = JSON.parse(e.data);
      setLogLines((prev) => [...prev, { text: data.text, type: data.type }]);
    });

    es.addEventListener("done", (e) => {
      const data = JSON.parse(e.data);
      let successStatus = false;
      if (data.success) {
        toast.success(t("oneClick.uninstallSuccess", { app: appId }));
        setLogLines((prev) => [
          ...prev,
          { text: `\n✅ ${appName} removed successfully!\n`, type: "stdout" },
        ]);
        successStatus = true;
      } else {
        toast.error(t("oneClick.uninstallFailed", { app: appId }));
        setLogLines((prev) => [
          ...prev,
          { text: `\n❌ Failed to remove ${appName}\n`, type: "stderr" },
        ]);
      }
      setUninstalling(null);
      checkStatuses();
      es.close();
      if (successStatus) {
        setTimeout(() => setLogOpen(false), 3000);
      }
    });

    es.onerror = () => {
      setUninstalling(null);
      es.close();
    };
  };

  /* ───── OAuth Flow ───── */

  const handleOpenOauth = async (providerId: string) => {
    if (!selectedServer) return;
    setOauthProvider(providerId);
    setOauthStep(0);
    setOauthUrl("");
    setOauthCallbackUrl("");
    setOauthOpen(true);
    setOauthLoading(true);

    try {
      const { data } = await api.get(
        `/servers/${selectedServer._id}/one-click/cliproxyapi/oauth/url?provider=${providerId}`,
      );
      setOauthUrl(data.url);
      setOauthStep(1); // URL is ready
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to start OAuth flow",
      );
      setOauthOpen(false);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSubmitOauthCallback = async () => {
    if (!selectedServer || !oauthCallbackUrl) return;

    if (
      !oauthCallbackUrl.includes("127.0.0.1") &&
      !oauthCallbackUrl.includes("localhost")
    ) {
      toast.error(
        "Please paste the exact localhost loopback URL from your browser address bar.",
      );
      return;
    }

    setOauthLoading(true);
    try {
      await api.post(
        `/servers/${selectedServer._id}/one-click/cliproxyapi/oauth/callback`,
        { callbackUrl: oauthCallbackUrl },
      );
      toast.success("OAuth authentication successful!");
      setOauthStep(2); // Success step
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OAuth callback failed");
    } finally {
      setOauthLoading(false);
    }
  };

  /* ───── Render helpers ───── */

  const renderAppCard = (app: OneClickApp) => {
    const status = statuses[app.id];
    const isInstalling = installing === app.id;
    const isUninstalling = uninstalling === app.id;
    const isInstalled = status?.installed;

    const gradients: Record<string, string> = {
      cliproxyapi: isDark
        ? "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.10) 100%)"
        : "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 100%)",
      openclaw: isDark
        ? "linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(251,146,60,0.10) 100%)"
        : "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(251,146,60,0.05) 100%)",
    };

    const borderColors: Record<string, string> = {
      cliproxyapi: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)",
      openclaw: isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)",
    };

    return (
      <Card
        key={app.id}
        sx={{
          flex: 1,
          minWidth: 340,
          background: gradients[app.id],
          border: `1px solid ${borderColors[app.id]}`,
          borderRadius: 3,
          transition: "all 0.3s ease",
          position: "relative",
          overflow: "visible",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: isDark
              ? `0 20px 40px -12px ${alpha(theme.palette.primary.main, 0.25)}`
              : `0 20px 40px -12px rgba(0,0,0,0.15)`,
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  fontSize: 32,
                  lineHeight: 1,
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                }}
              >
                {app.icon}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {app.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  Port:{" "}
                  {app.id === "cliproxyapi" ? selectedPort : app.defaultPort}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {checking ? (
                <CircularProgress size={16} />
              ) : isInstalled ? (
                <>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={
                      status.version || t("oneClick.installed", "Installed")
                    }
                    color="success"
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: 11 }}
                  />
                  {status.containerStatus && (
                    <Chip
                      label={status.containerStatus}
                      color={
                        status.containerStatus.toLowerCase().includes("up")
                          ? "primary"
                          : "warning"
                      }
                      size="small"
                      variant="filled"
                      sx={{
                        fontWeight: 600,
                        fontSize: 11,
                        background: "rgba(0, 150, 255, 0.1)",
                      }}
                    />
                  )}
                </>
              ) : (
                <Chip
                  icon={<ErrorIcon />}
                  label={t("oneClick.notInstalled", "Not Installed")}
                  color="default"
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: 11 }}
                />
              )}
            </Box>
          </Box>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2.5, lineHeight: 1.6 }}
          >
            {app.description}
          </Typography>

          {/* Provider selection for CLIProxyAPI */}
          {app.id === "cliproxyapi" && app.providers && !isInstalled && (
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                {t("oneClick.selectProvider", "Select Provider")}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {app.providers.map((p) => {
                  const isSelected = selectedProviders.includes(p.id);
                  return (
                    <Chip
                      key={p.id}
                      label={`${p.icon} ${p.name}`}
                      onClick={() => {
                        setSelectedProviders((prev) => {
                          if (prev.includes(p.id)) {
                            // Don't allow deselecting the last one
                            if (prev.length <= 1) return prev;
                            return prev.filter((id) => id !== p.id);
                          }
                          return [...prev, p.id];
                        });
                      }}
                      color={isSelected ? "primary" : "default"}
                      variant={isSelected ? "filled" : "outlined"}
                      size="small"
                      sx={{
                        fontWeight: isSelected ? 700 : 400,
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Configuration for CLIProxyAPI */}
          {app.id === "cliproxyapi" && !isInstalled && (
            <Box sx={{ mb: 2.5, display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                label={t("oneClick.port", "Port")}
                type="number"
                size="small"
                value={selectedPort}
                onChange={(e) =>
                  setSelectedPort(parseInt(e.target.value) || 8317)
                }
                sx={{ width: 120 }}
                inputProps={{ min: 1, max: 65535 }}
              />
              <TextField
                label="Admin Password (Optional)"
                type="text"
                size="small"
                value={selectedPassword}
                onChange={(e) => setSelectedPassword(e.target.value)}
                sx={{ width: 220 }}
                placeholder="localadmin123"
                helperText="Leave empty for default"
              />
            </Box>
          )}

          {/* Actions */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {!isInstalled ? (
              <Button
                variant="contained"
                startIcon={
                  isInstalling ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <RocketLaunchIcon />
                  )
                }
                onClick={() => startInstall(app.id)}
                disabled={isInstalling || !selectedServer}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  background:
                    app.id === "cliproxyapi"
                      ? "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)"
                      : "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                  "&:hover": {
                    background:
                      app.id === "cliproxyapi"
                        ? "linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)"
                        : "linear-gradient(135deg, #dc2626 0%, #ea580c 100%)",
                  },
                }}
              >
                {isInstalling
                  ? t("oneClick.installing", "Installing...")
                  : t("oneClick.installNow", "⚡ 1-Click Install")}
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<TerminalIcon />}
                  onClick={() =>
                    navigate(`/one-click/${selectedServer!._id}/${app.id}`)
                  }
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                >
                  {t("oneClick.manage", "Manage")}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={
                    isUninstalling ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <DeleteIcon />
                    )
                  }
                  onClick={() => startUninstall(app.id)}
                  disabled={isUninstalling}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                  }}
                >
                  {isUninstalling
                    ? t("oneClick.uninstalling", "Removing...")
                    : t("oneClick.uninstall", "Uninstall")}
                </Button>
              </>
            )}

            <Tooltip title={t("oneClick.viewDocs", "View Documentation")}>
              <IconButton
                size="small"
                onClick={() => window.open(app.docs, "_blank")}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <SEO
        title={t("oneClick.title", "1-Click Install")}
        description={t(
          "oneClick.description",
          "Install CLIProxyAPI and OpenClaw with one click",
        )}
      />

      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <RocketLaunchIcon sx={{ fontSize: 28, color: "primary.main" }} />
          <Typography variant="h5" fontWeight={700}>
            {t("oneClick.title", "1-Click Install")}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 5.5 }}>
          {t(
            "oneClick.subtitle",
            "Install powerful AI tools on your server with a single click — no manual setup needed",
          )}
        </Typography>
      </Box>

      {/* Status bar */}
      {selectedServer && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 3,
          }}
        >
          <Chip
            size="small"
            label={selectedServer.name}
            color={selectedServer.status === "online" ? "success" : "default"}
            variant="outlined"
          />
          <Tooltip title={t("oneClick.refresh", "Refresh Status")}>
            <IconButton
              size="small"
              onClick={checkStatuses}
              disabled={checking}
            >
              {checking ? (
                <CircularProgress size={14} />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* No server warning */}
      {!selectedServer && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          {t(
            "oneClick.noServers",
            "No active server selected. Please select a server from the top navigation bar.",
          )}
        </Alert>
      )}

      {/* App cards */}
      {selectedServer && (
        <Box
          sx={{
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            alignItems: "stretch",
          }}
        >
          {apps.map((app) => renderAppCard(app))}
        </Box>
      )}

      {/* Install Log Drawer */}
      <Drawer
        anchor="right"
        open={logOpen}
        onClose={() => {
          if (!installing && !uninstalling) setLogOpen(false);
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 520 },
            bgcolor: isDark ? "#0d1117" : "#fafafa",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Drawer header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TerminalIcon fontSize="small" />
              <Typography fontWeight={700} fontSize={15}>
                {uninstalling
                  ? t("oneClick.uninstallLog", "Uninstallation Log")
                  : t("oneClick.installLog", "Installation Log")}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setLogOpen(false)}
              disabled={!!installing || !!uninstalling}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Progress bar */}
          {currentStep && installing && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" fontWeight={600}>
                  {currentStep.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentStep.step}/{currentStep.total}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(currentStep.step / currentStep.total) * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
                }}
              />
            </Box>
          )}

          {/* Log content */}
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              p: 2,
              fontFamily:
                "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
              fontSize: 12,
              lineHeight: 1.7,
              bgcolor: isDark ? "#0d1117" : "#1e1e1e",
              color: isDark ? "#c9d1d9" : "#d4d4d4",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {logLines.map((line, i) => {
              const isErrorLine =
                line.type === "stderr" &&
                /error|fail|fatal|denied|exit code|cannot|not found|refused/i.test(
                  line.text,
                );
              const getColor = () => {
                if (line.text.includes("━━━")) return "#60a5fa";
                if (line.text.includes("✅")) return "#4ade80";
                if (line.text.includes("❌") || isErrorLine) return "#f87171";
                if (line.type === "stderr") return "#d4a574"; // amber for non-error stderr
                return "inherit";
              };
              return (
                <Box
                  key={i}
                  component="span"
                  sx={{
                    color: getColor(),
                    fontWeight: line.text.includes("━━━") ? 700 : 400,
                  }}
                >
                  {line.text}
                </Box>
              );
            })}
            <div ref={logEndRef} />
          </Box>
        </Box>
      </Drawer>

      {/* OAuth Dialog */}
      <Dialog
        open={oauthOpen}
        onClose={() => !oauthLoading && setOauthOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: isDark ? "#1e1e1e" : "#fff",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
          {oauthProvider?.toUpperCase()} Authentication
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stepper
            activeStep={oauthStep}
            orientation="vertical"
            sx={{ "& .MuiStepLabel-label": { fontWeight: 500 } }}
          >
            <Step>
              <StepLabel>Initialize Login</StepLabel>
            </Step>
            <Step>
              <StepLabel>Browser Authentication</StepLabel>
            </Step>
            <Step>
              <StepLabel>Complete</StepLabel>
            </Step>
          </Stepper>

          <Box sx={{ mt: 4, minHeight: 180 }}>
            {oauthLoading && oauthStep === 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 2,
                }}
              >
                <CircularProgress size={32} />
                <Typography color="text.secondary">
                  Generating secure login URL via proxy...
                </Typography>
              </Box>
            )}

            {oauthStep === 1 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Alert severity="info" icon={false} sx={{ borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    Step 1: Open Login Link
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Click the button below to open the provider's login page in
                    your browser. Complete the login process.
                  </Typography>
                  <Button
                    href={oauthUrl}
                    target="_blank"
                    variant="contained"
                    endIcon={<OpenInNewIcon />}
                    disableElevation
                  >
                    Open Login Page
                  </Button>
                </Alert>

                <Alert severity="warning" icon={false} sx={{ borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                    Step 2: Paste Callback URL
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    After logging in, your browser will try to redirect to a
                    `127.0.0.1` (localhost) address and show an error like "Site
                    cannot be reached".
                    <strong> This is expected!</strong> Copy that entire broken
                    URL from your browser's address bar and paste it below.
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="http://127.0.0.1:xxx/?state=...&code=..."
                    value={oauthCallbackUrl}
                    onChange={(e) => setOauthCallbackUrl(e.target.value)}
                  />
                </Alert>
              </Box>
            )}

            {oauthStep === 2 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 2,
                }}
              >
                <CheckCircleIcon color="success" sx={{ fontSize: 64 }} />
                <Typography variant="h6">Authentication Successful!</Typography>
                <Typography color="text.secondary" align="center">
                  Your CLIProxyAPI instance is now securely authenticated with{" "}
                  {oauthProvider}. You can start making API requests.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          {oauthStep !== 2 ? (
            <>
              <Button
                onClick={() => setOauthOpen(false)}
                disabled={oauthLoading}
                color="inherit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitOauthCallback}
                disabled={oauthStep !== 1 || !oauthCallbackUrl || oauthLoading}
                variant="contained"
                disableElevation
              >
                {oauthLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Verify & Complete"
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setOauthOpen(false)}
              variant="contained"
              disableElevation
            >
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OneClickInstall;
