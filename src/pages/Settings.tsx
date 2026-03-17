import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  IconButton,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import WebhookIcon from "@mui/icons-material/Webhook";
import TerminalIcon from "@mui/icons-material/Terminal";
import NotificationsIcon from "@mui/icons-material/Notifications";
import InfoIcon from "@mui/icons-material/Info";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import PaletteIcon from "@mui/icons-material/Palette";
import SecurityIcon from "@mui/icons-material/Security";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SEO from "../components/SEO";
import { useThemeMode } from "../contexts/ThemeContext";
import CheckIcon from "@mui/icons-material/Check";
import { TeamSettingsCard } from "../components/TeamSettingsCard";

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

export const glassCardStyle = {
  background: (theme: any) =>
    theme.palette.mode === "dark"
      ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
      : "linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)",
  backdropFilter: "blur(20px)",
  border: "1px solid",
  borderColor: (theme: any) =>
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.05)"
      : "rgba(0,0,0,0.05)",
  borderRadius: 4,
  boxShadow: (theme: any) =>
    theme.palette.mode === "dark"
      ? "0 4px 20px rgba(0,0,0,0.2)"
      : "0 4px 20px rgba(0,0,0,0.02)",
};

const Settings: React.FC = () => {
  const { user, fetchUser, oauthLogin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [confirmGithubDisconnect, setConfirmGithubDisconnect] = useState(false);

  // Danger Zone
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [s3DialogOpen, setS3DialogOpen] = useState(false);

  // 2FA State
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    qrCodeUrl: string;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState("");

  const [settings, setSettings] = useState({
    defaultInstallCmd: "npm install",
    defaultBuildCmd: "npm run build",
    defaultStartCmd: "npm start",
    pollingInterval: "60",
    s3Storage: {
      enabled: false,
      accessKeyId: "",
      secretAccessKey: "",
      endpoint: "",
      region: "",
      bucketName: "",
    },
  });

  const [alertPreferences, setAlertPreferences] = useState({
    slackWebhookUrl: "",
    discordWebhookUrl: "",
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
    fetchAlertPreferences();

    // Check for GitHub OAuth code or error
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (code) {
      // Immediately remove code from URL to prevent double-call from React StrictMode
      window.history.replaceState({}, document.title, window.location.pathname);
      handleGitHubCallback(code);
    } else if (error) {
      if (error === "access_denied") {
        toast.error(
          t("settings.githubAccessDenied", "GitHub connection denied by user"),
        );
      } else {
        toast.error(errorDescription || "GitHub connection failed");
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGitHubCallback = async (code: string) => {
    const toastId = toast.loading("Connecting to GitHub...");
    try {
      if (user) {
        // User is already logged in, so we are linking the account
        await api.post("/auth/github", { code });
        toast.success("GitHub connected successfully!", { id: toastId });
        fetchUser();
      } else {
        // User is not logged in, treating this as an OAuth login flow
        const redirectUri = window.location.origin + "/settings";
        const response = await api.post("/auth/github/callback", {
          code,
          redirectUri,
        });
        oauthLogin(
          response.data.user,
          response.data.accessToken,
          response.data.refreshToken,
        );
        toast.success("Logged in successfully!", { id: toastId });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to process GitHub connection",
        { id: toastId },
      );
    }
  };

  const handleGithubDisconnect = async () => {
    try {
      await api.delete("/auth/github");
      toast.success(
        t("settings.githubDisconnected", "GitHub disconnected successfully"),
      );
      setConfirmGithubDisconnect(false);
      fetchUser();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to disconnect GitHub",
      );
    }
  };

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

  const fetchAlertPreferences = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data.alertPreferences) {
        setAlertPreferences(res.data.alertPreferences);
      }
    } catch (err) {
      console.error(err);
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
      // Save alert preferences
      await api.put("/auth/alerts", alertPreferences);
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

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await api.delete("/auth/me");
      toast.success("Account deleted successfully.");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete account.");
      setDeleteLoading(false);
      setConfirmDeleteAccount(false);
    }
  };

  const start2FASetup = async () => {
    setTwoFactorLoading(true);
    try {
      const { data } = await api.post("/auth/2fa/generate");
      setTwoFactorSetup(data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to start 2FA setup");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const submitVerifyAndEnable2FA = async () => {
    if (!twoFactorCode) {
      toast.error(
        t("settings.enterTwoFactorCode", "Please enter the verification code"),
      );
      return;
    }
    setTwoFactorLoading(true);
    try {
      await api.post("/auth/2fa/verify", { code: twoFactorCode });
      toast.success(
        t("settings.twoFactorEnabled", "2FA has been successfully enabled"),
      );
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to verify 2FA code");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const submitDisable2FA = async () => {
    if (!disable2FAPassword) {
      toast.error("Please enter your password");
      return;
    }
    setTwoFactorLoading(true);
    try {
      await api.post("/auth/2fa/disable", { password: disable2FAPassword });
      toast.success(
        t("settings.twoFactorDisabled", "2FA has been successfully disabled"),
      );
      setShowDisable2FADialog(false);
      setDisable2FAPassword("");
      fetchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to disable 2FA");
    } finally {
      setTwoFactorLoading(false);
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
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
          alignItems: "stretch",
          maxWidth: 1400,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Card
            key={i}
            sx={{ ...glassCardStyle, height: "100%", boxShadow: "none" }}
          >
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
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
        gap: 3,
        alignItems: "stretch",
        maxWidth: 1400,
      }}
    >
      <SEO
        title={t("seo.settings.title")}
        description={t("seo.settings.description")}
      />

      {/* Appearance */}
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
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
                  "#f97316", // Orange (Default)
                  "#fb923c", // Amber
                  "#3b82f6", // Blue
                  "#0ea5e9", // Sky
                  "#10b981", // Emerald
                  "#d946ef", // Fuchsia
                  "#f43f5e", // Rose
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
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
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

      {/* Team Settings */}
      <TeamSettingsCard />

      {/* Multi-channel Alerts (Premium) */}
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={sectionStyle}>
              <WebhookIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" fontSize={16} fontWeight={600}>
                {t("settings.alertsTitle", "Deployment Webhooks")}
              </Typography>
            </Box>
            <Chip
              label={t("settings.alertsProBadge", "PRO Feature")}
              size="small"
              sx={{
                background: `linear-gradient(45deg, ${theme.palette.warning.main}, ${theme.palette.error.main})`,
                color: "white",
                fontWeight: "bold",
                fontSize: 10,
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t(
              "settings.alertsDesc",
              "Receive real-time notifications about your deployments in Slack or Discord.",
            )}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("settings.discordWebhook", "Discord Webhook URL")}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="https://discord.com/api/webhooks/..."
                value={alertPreferences.discordWebhookUrl}
                onChange={(e) =>
                  setAlertPreferences({
                    ...alertPreferences,
                    discordWebhookUrl: e.target.value,
                  })
                }
                helperText={t(
                  "settings.discordWebhookHint",
                  "Get from Discord channel Integrations > Webhooks",
                )}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("settings.slackWebhook", "Slack Webhook URL")}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="https://hooks.slack.com/services/..."
                value={alertPreferences.slackWebhookUrl}
                onChange={(e) =>
                  setAlertPreferences({
                    ...alertPreferences,
                    slackWebhookUrl: e.target.value,
                  })
                }
                helperText={t(
                  "settings.slackWebhookHint",
                  "Get from Slack channel integrations",
                )}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* GitHub Integration */}
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <img
              src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
              alt="GitHub"
              width={24}
              height={24}
              style={{
                filter: theme.palette.mode === "dark" ? "invert(1)" : "none",
              }}
            />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              GitHub Integration
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography fontWeight={600}>
                {user?.githubUsername
                  ? `Connected as ${user.githubUsername}`
                  : "Not connected"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.githubUsername
                  ? "Your account is linked to GitHub."
                  : "Connect your GitHub account to import repositories and enable auto-deployments."}
              </Typography>
            </Box>
            {user?.githubUsername ? (
              <Button
                variant="outlined"
                color="error"
                sx={{ textTransform: "none" }}
                onClick={() => setConfirmGithubDisconnect(true)}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                variant="contained"
                sx={{
                  bgcolor: "#24292e",
                  color: "white",
                  textTransform: "none",
                  "&:hover": { bgcolor: "#1b1f23" },
                }}
                onClick={async () => {
                  try {
                    const res = await api.get("/auth/github/auth-url");
                    if (res.data.url) {
                      window.location.href = res.data.url;
                    }
                  } catch (error) {
                    toast.error("Failed to get GitHub Auth URL");
                  }
                }}
              >
                Connect GitHub
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card sx={{ ...glassCardStyle, mb: 3 }}>
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

      {/* Two-Factor Authentication */}
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <SecurityIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" fontSize={16} fontWeight={600}>
                {t("settings.twoFactorAuth")}
              </Typography>
            </Box>

            {user?.isTwoFactorEnabled ? (
              <Button
                variant="outlined"
                color="error"
                sx={{ textTransform: "none" }}
                onClick={() => setShowDisable2FADialog(true)}
              >
                {t("settings.disable2fa", "Disable 2FA")}
              </Button>
            ) : !twoFactorSetup ? (
              <Button
                variant="contained"
                sx={{ textTransform: "none" }}
                onClick={start2FASetup}
                disabled={twoFactorLoading}
              >
                {t("settings.enable2fa", "Enable 2FA")}
              </Button>
            ) : null}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography fontWeight={600} gutterBottom>
              {user?.isTwoFactorEnabled
                ? t("settings.twoFactorEnabled")
                : t("settings.twoFactorDisabled", "2FA is Disabled")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(
                "settings.twoFactorDesc",
                "Secure your account with 2FA using an authenticator app.",
              )}
            </Typography>
          </Box>

          <Dialog
            open={!!twoFactorSetup}
            onClose={() => {
              setTwoFactorSetup(null);
              setTwoFactorCode("");
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pb: 1,
              }}
            >
              {t("settings.setup2fa")}
              <IconButton
                onClick={() => {
                  setTwoFactorSetup(null);
                  setTwoFactorCode("");
                }}
                size="small"
                sx={{ color: "text.secondary", mr: -1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography
                variant="body2"
                color="text.secondary"
                paragraph
                sx={{ mt: 1 }}
              >
                {t("settings.scanQrCode")}
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "white",
                    borderRadius: 2,
                    display: "inline-block",
                  }}
                >
                  <img
                    src={twoFactorSetup?.qrCodeUrl}
                    alt="QR Code"
                    width={200}
                    height={200}
                    style={{ display: "block" }}
                  />
                </Box>
              </Box>

              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t("settings.cantScanQr")} {t("settings.enterKeyManually")}
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "action.hover",
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "monospace", letterSpacing: 1 }}
                  >
                    {twoFactorSetup?.secret}
                  </Typography>
                  <Button
                    size="small"
                    color="inherit"
                    sx={{ minWidth: "auto", p: 0.5 }}
                    onClick={() => {
                      if (twoFactorSetup?.secret) {
                        navigator.clipboard.writeText(twoFactorSetup.secret);
                        toast.success(
                          t("common.copied", "Copied to clipboard"),
                        );
                      }
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="body2" color="text.secondary" paragraph>
                {t("settings.verify2faCode")}
              </Typography>

              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <TextField
                  fullWidth
                  label={t("auth.twoFactorCode")}
                  placeholder="123456"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  size="small"
                  inputProps={{ maxLength: 6 }}
                />
                <Button
                  variant="contained"
                  onClick={submitVerifyAndEnable2FA}
                  disabled={twoFactorLoading || twoFactorCode.length < 6}
                  sx={{ minWidth: 150 }}
                >
                  {twoFactorLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    t("settings.verifyAndEnable")
                  )}
                </Button>
              </Box>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Notifications Configuration */}
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
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
      <Card sx={{ ...glassCardStyle, height: "100%", mb: 3 }}>
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
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
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
            POST {import.meta.env.VITE_API_URL || window.location.origin}
            /api/webhook/{"<projectId>"}
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
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
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

      {/* S3 Storage Settings */}
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={sectionStyle}>
            <SecurityIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" fontSize={16} fontWeight={600}>
              Remote Backup Storage (S3)
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure an S3-compatible service (AWS, Cloudflare R2, MinIO, DO
            Spaces) to automatically upload database backups.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.s3Storage?.enabled || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      s3Storage: {
                        ...(settings.s3Storage || {
                          accessKeyId: "",
                          secretAccessKey: "",
                          endpoint: "",
                          region: "",
                          bucketName: "",
                        }),
                        enabled: e.target.checked,
                      },
                    })
                  }
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" fontWeight={600}>
                  Enable S3 Automation
                </Typography>
              }
            />

            {settings.s3Storage?.enabled && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setS3DialogOpen(true)}
              >
                Configure S3 Credentials
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box
        sx={{
          gridColumn: { lg: "span 2" },
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
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

      <Divider sx={{ gridColumn: { lg: "span 2" }, my: 1 }} />

      {/* System Info */}
      <Card sx={{ ...glassCardStyle, height: "100%" }}>
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
          ...glassCardStyle,
          height: "100%",
          borderColor: "error.dark",
          boxShadow: (theme: any) =>
            theme.palette.mode === "dark"
              ? "0 4px 20px rgba(239, 68, 68, 0.15)"
              : "0 4px 20px rgba(239, 68, 68, 0.05)",
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

          <Box sx={{ mb: 3 }}>
            <Typography fontWeight={600}>Clear Deployment History</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t("settings.clearHistoryDesc")}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={() => setConfirmClear(true)}
              sx={{ mt: 1 }}
            >
              {t("settings.clearHistory")}
            </Button>
          </Box>

          <Divider sx={{ my: 3, borderColor: "error.main", opacity: 0.2 }} />

          <Box>
            <Typography fontWeight={600}>Delete Account</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </Typography>
            <Button
              variant="contained"
              color="error"
              sx={{ mt: 1, textTransform: "none" }}
              onClick={() => setConfirmDeleteAccount(true)}
            >
              Delete Account
            </Button>
          </Box>
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

      {/* GitHub Disconnect Confirmation Dialog */}
      <Dialog
        open={confirmGithubDisconnect}
        onClose={() => setConfirmGithubDisconnect(false)}
      >
        <DialogTitle>{t("settings.githubDisconnectTitle")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {t("settings.githubDisconnectConfirm")}
          </Typography>
          <Alert severity="warning">
            {t("settings.githubDisconnectWarning")}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmGithubDisconnect(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleGithubDisconnect}
          >
            {t("common.disconnect")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog
        open={showDisable2FADialog}
        onClose={() => {
          setShowDisable2FADialog(false);
          setDisable2FAPassword("");
        }}
      >
        <DialogTitle>{t("settings.disable2fa")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {t(
              "settings.enterPasswordToDisable",
              "Enter your password to disable 2FA.",
            )}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label={t("auth.password")}
            type="password"
            fullWidth
            variant="outlined"
            value={disable2FAPassword}
            onChange={(e) => setDisable2FAPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setShowDisable2FADialog(false);
              setDisable2FAPassword("");
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!disable2FAPassword || twoFactorLoading}
            onClick={submitDisable2FA}
          >
            {twoFactorLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              t("settings.confirmDisable", "Disable")
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* S3 configuration Dialog */}
      <Dialog
        open={s3DialogOpen}
        onClose={() => setS3DialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SecurityIcon color="primary" /> Remote Backup Storage (S3)
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Endpoint URL (Optional)"
              value={settings.s3Storage?.endpoint || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  s3Storage: {
                    ...(settings.s3Storage as any),
                    endpoint: e.target.value,
                  },
                })
              }
              size="small"
              fullWidth
              helperText="Leave empty for default AWS S3"
              placeholder="e.g. https://s3.eu-central-1.wasabisys.com"
            />
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <TextField
                label="Region"
                value={settings.s3Storage?.region || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    s3Storage: {
                      ...(settings.s3Storage as any),
                      region: e.target.value,
                    },
                  })
                }
                size="small"
                fullWidth
                placeholder="e.g. us-east-1 (or 'auto' for R2)"
              />
              <TextField
                label="Bucket Name"
                value={settings.s3Storage?.bucketName || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    s3Storage: {
                      ...(settings.s3Storage as any),
                      bucketName: e.target.value,
                    },
                  })
                }
                size="small"
                fullWidth
              />
            </Box>
            <TextField
              label="Access Key ID"
              value={settings.s3Storage?.accessKeyId || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  s3Storage: {
                    ...(settings.s3Storage as any),
                    accessKeyId: e.target.value,
                  },
                })
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Secret Access Key"
              type="password"
              value={settings.s3Storage?.secretAccessKey || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  s3Storage: {
                    ...(settings.s3Storage as any),
                    secretAccessKey: e.target.value,
                  },
                })
              }
              size="small"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setS3DialogOpen(false)}>Close</Button>
          <Button
            onClick={() => {
              setS3DialogOpen(false);
              saveSettings();
            }}
            variant="contained"
          >
            Save & Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog
        open={confirmDeleteAccount}
        onClose={() => setConfirmDeleteAccount(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: "error.main" }}>Delete Account</DialogTitle>
        <DialogContent>
          <Typography>
            Are you absolutely sure you want to delete your account? This action
            is irreversible and you will lose access to all your servers and
            projects.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDeleteAccount(false)}
            color="inherit"
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Delete My Account"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
