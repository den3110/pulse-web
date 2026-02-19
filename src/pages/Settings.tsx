import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Skeleton,
  CircularProgress,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  useTheme,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import TuneIcon from "@mui/icons-material/Tune";
import WebhookIcon from "@mui/icons-material/Webhook";
import TerminalIcon from "@mui/icons-material/Terminal";
import NotificationsIcon from "@mui/icons-material/Notifications";
import InfoIcon from "@mui/icons-material/Info";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import PaletteIcon from "@mui/icons-material/Palette";
import SEO from "../components/SEO";
import { useThemeMode } from "../contexts/ThemeContext";
import CheckIcon from "@mui/icons-material/Check";

interface SystemInfo {
  version: string;
  nodeVersion: string;
  uptime: number;
  platform: string;
  hostname: string;
  memory: { total: number; free: number; used: number };
  stats: {
    servers: number;
    projects: number;
    deployments: number;
    autoDeployProjects: number;
  };
}

const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatBytes = (bytes: number): string => {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
};

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    sidebarPosition,
    setSidebarPosition,
    mobileLayout,
    setMobileLayout,
    primaryColor,
    setPrimaryColor,
  } = useThemeMode();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearDays, setClearDays] = useState(30);

  const [settings, setSettings] = useState({
    defaultInstallCmd: "npm install",
    defaultBuildCmd: "npm run build",
    defaultStartCmd: "npm start",
    pollingInterval: "60",
  });

  /* ─── Notification Config State ─── */
  const [notifConfig, setNotifConfig] = useState({
    discord: { enabled: false, webhookUrl: "" },
    slack: { enabled: false, webhookUrl: "" },
    telegram: { enabled: false, botToken: "", chatId: "" },
    events: {
      deploymentStarted: true,
      deploymentSuccess: true,
      deploymentFailed: true,
      serverOffline: true,
      serverOnline: true,
    },
  });

  useEffect(() => {
    fetchSettings();
    fetchSystemInfo();
    fetchNotificationSettings();
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      const { data } = await api.get("/settings/notifications");
      if (data) setNotifConfig(data);
    } catch (err) {
      console.error("Failed to load notification settings", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/settings");
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const res = await api.get("/settings/system-info");
      setSystemInfo(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Save legacy settings
      await api.put("/settings", settings);
      // Save new notification settings
      await api.put("/settings/notifications", notifConfig);
      toast.success("Settings saved!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async (type: string) => {
    try {
      await api.post("/settings/notifications/test", { type });
      toast.success("Test notification sent! 🔔");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send test");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await api.put("/auth/password", { currentPassword, newPassword });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await api.delete(`/settings/clear-history?days=${clearDays}`);
      toast.success(res.data.message);
      setConfirmClear(false);
      fetchSystemInfo();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const sectionStyle = {
    display: "flex",
    alignItems: "center",
    gap: 1,
    mb: 2,
  };

  if (settingsLoading) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto" }}>
        {[0, 1, 2].map((i) => (
          <Card key={i} sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
              <Skeleton
                variant="rounded"
                width="100%"
                height={40}
                sx={{ mb: 1.5 }}
              />
              <Skeleton variant="rounded" width="100%" height={40} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      <SEO
        title={t("seo.settings.title")}
        description={t("seo.settings.description")}
      />

      {/* Appearance */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <PaletteIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              {t("settings.appearance")}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Sidebar Position */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("settings.sidebarPosition")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {(["left", "right"] as const).map((pos) => (
                  <Chip
                    key={pos}
                    label={t(`settings.positions.${pos}`)}
                    onClick={() => setSidebarPosition(pos)}
                    color={sidebarPosition === pos ? "primary" : "default"}
                    variant={sidebarPosition === pos ? "filled" : "outlined"}
                    sx={{ textTransform: "capitalize", minWidth: 80 }}
                  />
                ))}
              </Box>
            </Box>

            {/* Mobile Layout */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("settings.mobileLayout")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {(["drawer", "bottom"] as const).map((layout) => (
                  <Chip
                    key={layout}
                    label={t(`settings.layouts.${layout}`)}
                    onClick={() => setMobileLayout(layout)}
                    color={mobileLayout === layout ? "primary" : "default"}
                    variant={mobileLayout === layout ? "filled" : "outlined"}
                    sx={{ textTransform: "capitalize", minWidth: 100 }}
                  />
                ))}
              </Box>
            </Box>

            {/* Primary Color */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("settings.primaryColor")}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {[
                  "#6366f1", // Indigo (Default)
                  "#3b82f6", // Blue
                  "#0ea5e9", // Sky
                  "#10b981", // Emerald
                  "#8b5cf6", // Violet
                  "#d946ef", // Fuchsia
                  "#f43f5e", // Rose
                  "#f97316", // Orange
                ].map((color) => (
                  <Box
                    key={color}
                    onClick={() => setPrimaryColor(color)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      bgcolor: color,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        primaryColor === color
                          ? "0 0 0 2px white, 0 0 0 4px " + color
                          : "none",
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "scale(1.1)",
                      },
                    }}
                  >
                    {primaryColor === color && (
                      <CheckIcon sx={{ color: "white", fontSize: 18 }} />
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <PersonIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              {t("settings.profile")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                fontSize: 24,
                fontWeight: 600,
                bgcolor: "primary.main",
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography fontWeight={600}>{user?.username}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                {user?.role}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <LockIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              {t("settings.changePassword")}
            </Typography>
          </Box>
          <form onSubmit={handlePasswordChange}>
            <TextField
              label={t("settings.currentPassword")}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              sx={{ mb: 2 }}
              fullWidth
            />
            <TextField
              label={t("settings.newPassword")}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              sx={{ mb: 2 }}
              fullWidth
              inputProps={{ minLength: 6 }}
            />
            <TextField
              label={t("settings.confirmNewPassword")}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              sx={{ mb: 2 }}
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : null
              }
            >
              {loading ? t("settings.updating") : t("settings.updatePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notifications Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <NotificationsIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              {t("settings.notificationChannels")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t("settings.notificationDesc")}
          </Typography>

          {/* Discord */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography fontWeight={600}>{t("settings.discord")}</Typography>
              <Switch
                checked={notifConfig.discord.enabled}
                onChange={(e) =>
                  setNotifConfig({
                    ...notifConfig,
                    discord: {
                      ...notifConfig.discord,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
            </Box>
            {notifConfig.discord.enabled && (
              <TextField
                fullWidth
                label={t("settings.webhookUrl")}
                placeholder="https://discord.com/api/webhooks/..."
                value={notifConfig.discord.webhookUrl}
                onChange={(e) =>
                  setNotifConfig({
                    ...notifConfig,
                    discord: {
                      ...notifConfig.discord,
                      webhookUrl: e.target.value,
                    },
                  })
                }
                size="small"
              />
            )}
          </Box>

          {/* Slack */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography fontWeight={600}>{t("settings.slack")}</Typography>
              <Switch
                checked={notifConfig.slack.enabled}
                onChange={(e) =>
                  setNotifConfig({
                    ...notifConfig,
                    slack: { ...notifConfig.slack, enabled: e.target.checked },
                  })
                }
              />
            </Box>
            {notifConfig.slack.enabled && (
              <TextField
                fullWidth
                label={t("settings.webhookUrl")}
                placeholder="https://hooks.slack.com/services/..."
                value={notifConfig.slack.webhookUrl}
                onChange={(e) =>
                  setNotifConfig({
                    ...notifConfig,
                    slack: { ...notifConfig.slack, webhookUrl: e.target.value },
                  })
                }
                size="small"
              />
            )}
          </Box>

          {/* Telegram */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography fontWeight={600}>{t("settings.telegram")}</Typography>
              <Switch
                checked={notifConfig.telegram.enabled}
                onChange={(e) =>
                  setNotifConfig({
                    ...notifConfig,
                    telegram: {
                      ...notifConfig.telegram,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
            </Box>
            {notifConfig.telegram.enabled && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  fullWidth
                  label={t("settings.botToken")}
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  value={notifConfig.telegram.botToken}
                  onChange={(e) =>
                    setNotifConfig({
                      ...notifConfig,
                      telegram: {
                        ...notifConfig.telegram,
                        botToken: e.target.value,
                      },
                    })
                  }
                  size="small"
                />
                <TextField
                  fullWidth
                  label={t("settings.chatId")}
                  placeholder="-1001234567890"
                  value={notifConfig.telegram.chatId}
                  onChange={(e) =>
                    setNotifConfig({
                      ...notifConfig,
                      telegram: {
                        ...notifConfig.telegram,
                        chatId: e.target.value,
                      },
                    })
                  }
                  size="small"
                  helperText={t("settings.telegramHelp")}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleTestNotification("telegram")}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Test Telegram
                </Button>
              </Box>
            )}
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 2, mt: 1 }}>
            {t("settings.triggerEvents")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={notifConfig.events.deploymentStarted}
                  onChange={(e) =>
                    setNotifConfig({
                      ...notifConfig,
                      events: {
                        ...notifConfig.events,
                        deploymentStarted: e.target.checked,
                      },
                    })
                  }
                />
              }
              label={t("settings.events.deployStart")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={notifConfig.events.deploymentSuccess}
                  onChange={(e) =>
                    setNotifConfig({
                      ...notifConfig,
                      events: {
                        ...notifConfig.events,
                        deploymentSuccess: e.target.checked,
                      },
                    })
                  }
                />
              }
              label={t("settings.events.deploySuccess")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={notifConfig.events.deploymentFailed}
                  onChange={(e) =>
                    setNotifConfig({
                      ...notifConfig,
                      events: {
                        ...notifConfig.events,
                        deploymentFailed: e.target.checked,
                      },
                    })
                  }
                />
              }
              label={t("settings.events.deployFailed")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={notifConfig.events.serverOffline}
                  onChange={(e) =>
                    setNotifConfig({
                      ...notifConfig,
                      events: {
                        ...notifConfig.events,
                        serverOffline: e.target.checked,
                      },
                    })
                  }
                />
              }
              label={t("settings.events.serverOffline")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={notifConfig.events.serverOnline}
                  onChange={(e) =>
                    setNotifConfig({
                      ...notifConfig,
                      events: {
                        ...notifConfig.events,
                        serverOnline: e.target.checked,
                      },
                    })
                  }
                />
              }
              label={t("settings.events.serverOnline")}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Git Polling */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <TuneIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              {t("settings.gitPolling")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("settings.pollingDesc")}
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t("settings.pollingInterval")}</InputLabel>
            <Select
              value={settings.pollingInterval}
              label={t("settings.pollingInterval")}
              onChange={(e) =>
                setSettings({ ...settings, pollingInterval: e.target.value })
              }
            >
              <MenuItem value="30">{t("settings.intervals.30s")}</MenuItem>
              <MenuItem value="60">{t("settings.intervals.1m")}</MenuItem>
              <MenuItem value="120">{t("settings.intervals.2m")}</MenuItem>
              <MenuItem value="300">{t("settings.intervals.5m")}</MenuItem>
              <MenuItem value="600">{t("settings.intervals.10m")}</MenuItem>
            </Select>
          </FormControl>
          <Alert
            severity="info"
            sx={{ "& .MuiAlert-message": { fontSize: 13 } }}
          >
            {t("settings.pollingInfo")}
          </Alert>
        </CardContent>
      </Card>

      {/* Webhook Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <WebhookIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              {t("settings.webhookIncoming")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("settings.webhookDesc")}
          </Typography>
          <Box
            sx={{
              bgcolor: "var(--terminal-bg)",
              p: 2,
              borderRadius: 2,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              wordBreak: "break-all",
              color: "#c9d1d9",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            POST {window.location.origin}/api/webhook/{"<projectId>"}
          </Box>
          <Alert
            severity="info"
            sx={{ mt: 2, "& .MuiAlert-message": { fontSize: 13 } }}
          >
            {t("settings.webhookInfo")}
          </Alert>
        </CardContent>
      </Card>

      {/* Default Commands */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <TerminalIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              {t("settings.deploymentDefaults")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Default commands used when creating new projects. You can override
            these per project.
          </Typography>
          <TextField
            label="Install Command"
            value={settings.defaultInstallCmd}
            onChange={(e) =>
              setSettings({ ...settings, defaultInstallCmd: e.target.value })
            }
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13 },
            }}
            fullWidth
          />
          <TextField
            label="Build Command"
            value={settings.defaultBuildCmd}
            onChange={(e) =>
              setSettings({ ...settings, defaultBuildCmd: e.target.value })
            }
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13 },
            }}
            fullWidth
          />
          <TextField
            label="Start Command"
            value={settings.defaultStartCmd}
            onChange={(e) =>
              setSettings({ ...settings, defaultStartCmd: e.target.value })
            }
            size="small"
            InputProps={{
              sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13 },
            }}
            fullWidth
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          size="large"
          onClick={saveSettings}
          disabled={loading}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : null
          }
          sx={{ px: 4 }}
        >
          {loading ? t("common.loading") : t("settings.saveSettings")}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* System Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <InfoIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              {t("settings.systemInfo")}
            </Typography>
          </Box>
          {systemInfo ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("settings.version")}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  v{systemInfo.version}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("settings.nodeVersion")}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {systemInfo.nodeVersion}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("settings.uptime")}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatUptime(systemInfo.uptime)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("settings.platform")}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {systemInfo.platform} ({systemInfo.hostname})
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("settings.memory")}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatBytes(systemInfo.memory.used)} /{" "}
                  {formatBytes(systemInfo.memory.total)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("settings.dbStats")}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  <Chip
                    label={t("settings.statsServers", {
                      count: systemInfo.stats.servers,
                    })}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                  />
                  <Chip
                    label={t("settings.statsProjects", {
                      count: systemInfo.stats.projects,
                    })}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                  />
                  <Chip
                    label={t("settings.statsDeploys", {
                      count: systemInfo.stats.deployments,
                    })}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                  />
                  <Chip
                    label={t("settings.statsAutoDeploy", {
                      count: systemInfo.stats.autoDeployProjects,
                    })}
                    size="small"
                    color="info"
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                  />
                </Box>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Box key={i}>
                  <Skeleton variant="text" width={80} height={16} />
                  <Skeleton variant="text" width={120} height={22} />
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card
        sx={{
          mb: 3,
          border: "1px solid",
          borderColor: "error.dark",
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <DeleteSweepIcon sx={{ color: "error.main" }} />
            <Typography
              variant="h6"
              fontSize={16}
              fontWeight={600}
              color="error"
            >
              {t("settings.dangerZone")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("settings.clearHistoryDesc")}
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={() => setConfirmClear(true)}
          >
            {t("settings.clearHistory")}
          </Button>
        </CardContent>
      </Card>

      {/* Clear History Dialog */}
      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>{t("settings.clearConfirmTitle")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {t("settings.deleteOlderThan")}
          </Typography>
          <FormControl fullWidth>
            <InputLabel>{t("settings.days")}</InputLabel>
            <Select
              value={clearDays}
              label={t("settings.days")}
              onChange={(e) => setClearDays(Number(e.target.value))}
            >
              <MenuItem value={7}>7 days</MenuItem>
              <MenuItem value={14}>14 days</MenuItem>
              <MenuItem value={30}>30 days</MenuItem>
              <MenuItem value={60}>60 days</MenuItem>
              <MenuItem value={90}>90 days</MenuItem>
            </Select>
          </FormControl>
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t("settings.cantUndo")}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmClear(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleClearHistory}
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
