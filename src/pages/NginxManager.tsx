import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  CircularProgress,
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
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useServer } from "../contexts/ServerContext";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SaveIcon from "@mui/icons-material/Save";
import BugReportIcon from "@mui/icons-material/BugReport";
import ReplayIcon from "@mui/icons-material/Replay";
import DescriptionIcon from "@mui/icons-material/Description";
import DnsIcon from "@mui/icons-material/Dns";
import CodeEditor from "../components/CodeEditor";

interface NginxConfig {
  name: string;
  enabled: boolean;
  size: string;
  modified: string;
}

interface Server {
  _id: string;
  name: string;
  host: string;
  status: string;
}

const DEFAULT_TEMPLATE = `server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}`;

const NginxManager: React.FC<{ hideHeader?: boolean }> = ({
  hideHeader = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();

  const { selectedServer } = useServer();
  // const [servers, setServers] = useState<Server[]>([]);
  // const [selectedServer, setSelectedServer] = useState<string>("");
  const [configs, setConfigs] = useState<NginxConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [nginxStatus, setNginxStatus] = useState<{
    active: boolean;
    output: string;
  } | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorFilename, setEditorFilename] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorSaveReloading, setEditorSaveReloading] = useState(false);
  const [isNewFile, setIsNewFile] = useState(false);

  // Test/Reload output
  const [testOutput, setTestOutput] = useState<{
    success: boolean;
    output: string;
  } | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Logs
  const [logsOpen, setLogsOpen] = useState(false);
  const [logType, setLogType] = useState<"access" | "error">("access");
  const [logContent, setLogContent] = useState("");
  const [logLoading, setLogLoading] = useState(false);

  // Fetch servers handled globally
  // useEffect(() => {
  //   const fetchServers = async () => { ... };
  //   fetchServers();
  // }, []);

  // Fetch configs + status when server changes
  useEffect(() => {
    if (selectedServer) {
      fetchConfigs();
      fetchStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServer]);

  const fetchConfigs = useCallback(async () => {
    if (!selectedServer?._id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/nginx/${selectedServer?._id}/configs`);
      setConfigs(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load configs");
    } finally {
      setLoading(false);
    }
  }, [selectedServer?._id]);

  const fetchStatus = useCallback(async () => {
    if (!selectedServer?._id) return;
    try {
      const { data } = await api.get(`/nginx/${selectedServer?._id}/status`);
      setNginxStatus(data);
    } catch {
      setNginxStatus(null);
    }
  }, [selectedServer?._id]);

  const handleOpenEditor = useCallback(
    async (filename: string) => {
      setEditorFilename(filename);
      setEditorOpen(true);
      setEditorLoading(true);
      setIsNewFile(false);
      setTestOutput(null);
      try {
        const { data } = await api.get(
          `/nginx/${selectedServer?._id}/configs/${filename}`,
        );
        setEditorContent(data.content);
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to load config");
        setEditorOpen(false);
      } finally {
        setEditorLoading(false);
      }
    },
    [selectedServer?._id],
  );

  const handleCreateNew = useCallback(() => {
    setEditorFilename("");
    setEditorContent(DEFAULT_TEMPLATE);
    setEditorOpen(true);
    setEditorLoading(false);
    setIsNewFile(true);
    setTestOutput(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorFilename.trim()) {
      toast.error("Filename is required");
      return;
    }
    setEditorSaving(true);
    try {
      await api.post(
        `/nginx/${selectedServer?._id}/configs/${editorFilename}`,
        {
          content: editorContent,
        },
      );
      toast.success("Config saved!");
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setEditorSaving(false);
    }
  }, [selectedServer?._id, editorFilename, editorContent, fetchConfigs]);

  const handleSaveAndReload = useCallback(async () => {
    if (!editorFilename.trim()) {
      toast.error("Filename is required");
      return;
    }
    setEditorSaveReloading(true);
    try {
      const { data } = await api.post(
        `/nginx/${selectedServer?._id}/configs/${editorFilename}/save-reload`,
        { content: editorContent },
      );
      if (data.success) {
        toast.success("Config saved & nginx reloaded!");
        fetchConfigs();
        fetchStatus();
      } else {
        toast.error(data.output || "Save & reload failed");
        setTestOutput(data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save & reload failed");
    } finally {
      setEditorSaveReloading(false);
    }
  }, [
    selectedServer?._id,
    editorFilename,
    editorContent,
    fetchConfigs,
    fetchStatus,
  ]);

  const handleTest = useCallback(async () => {
    try {
      const { data } = await api.post(`/nginx/${selectedServer?._id}/test`);
      setTestOutput(data);
      if (data.success) {
        toast.success("Nginx config test passed!");
      } else {
        toast.error("Nginx config test failed!");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Test failed");
    }
  }, [selectedServer?._id]);

  const handleReload = useCallback(async () => {
    try {
      const { data } = await api.post(`/nginx/${selectedServer?._id}/reload`);
      if (data.success) {
        toast.success("Nginx reloaded!");
        fetchStatus();
      } else {
        toast.error(data.output || "Reload failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Reload failed");
    }
  }, [selectedServer?._id, fetchStatus]);

  const handleToggle = useCallback(
    async (config: NginxConfig) => {
      try {
        if (config.enabled) {
          await api.post(
            `/nginx/${selectedServer?._id}/configs/${config.name}/disable`,
          );
          toast.success(`${config.name} disabled`);
        } else {
          await api.post(
            `/nginx/${selectedServer?._id}/configs/${config.name}/enable`,
          );
          toast.success(`${config.name} enabled`);
        }
        fetchConfigs();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Toggle failed");
      }
    },
    [selectedServer?._id, fetchConfigs],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/nginx/${selectedServer?._id}/configs/${deleteTarget}`);
      toast.success(`${deleteTarget} deleted`);
      setDeleteTarget(null);
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleViewLogs = useCallback(
    async (type: "access" | "error") => {
      setLogType(type);
      setLogsOpen(true);
      setLogLoading(true);
      try {
        const { data } = await api.get(
          `/nginx/${selectedServer?._id}/logs/${type}?lines=100`,
        );
        setLogContent(data.content);
      } catch (err: any) {
        setLogContent(err.response?.data?.message || "Failed to load logs");
      } finally {
        setLogLoading(false);
      }
    },
    [selectedServer?._id],
  );

  // selectedServerInfo removed

  return (
    <Box>
      {/* Header */}
      {!hideHeader && (
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            mb: 3,
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 2, sm: 0 },
          }}
        >
          <Box>
            <Typography variant="body1" fontWeight={500}>
              {t("nginx.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("nginx.subtitle", { server: selectedServer?.name })}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<BugReportIcon />}
              onClick={handleTest}
              disabled={!selectedServer?._id}
            >
              {t("nginx.test")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="warning"
              startIcon={<ReplayIcon />}
              onClick={handleReload}
              disabled={!selectedServer?._id}
            >
              {t("nginx.reload")}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleCreateNew}
              disabled={!selectedServer?._id}
            >
              {t("nginx.newConfig")}
            </Button>
          </Box>
        </Box>
      )}

      {/* Server Selector + Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: { xs: "stretch", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            {/* Server Selector Removed - Global */}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              {nginxStatus && (
                <Chip
                  label={
                    nginxStatus.active
                      ? t("nginx.nginxActive")
                      : t("nginx.nginxInactive")
                  }
                  size="small"
                  color={nginxStatus.active ? "success" : "error"}
                  icon={
                    nginxStatus.active ? (
                      <CheckCircleIcon sx={{ fontSize: "16px !important" }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: "16px !important" }} />
                    )
                  }
                />
              )}
              {/* selectedServerInfo removed */}
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={fetchConfigs}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ ml: { sm: "auto" }, display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="text"
                onClick={() => handleViewLogs("access")}
                disabled={!selectedServer?._id}
                sx={{ fontSize: 12, textTransform: "none" }}
              >
                {t("nginx.accessLog")}
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => handleViewLogs("error")}
                disabled={!selectedServer?._id}
                sx={{ fontSize: 12, textTransform: "none" }}
              >
                {t("nginx.errorLog")}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Config List */}
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            <DescriptionIcon
              sx={{ fontSize: 18, mr: 1, verticalAlign: "text-bottom" }}
            />
            {t("nginx.configFiles")} ({configs.length})
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.06)",
                    gap: 1.5,
                  }}
                >
                  <Skeleton variant="circular" width={8} height={8} />
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        mb: 0.5,
                      }}
                    >
                      <Skeleton variant="text" width={120} height={22} />
                      <Skeleton variant="rounded" width={52} height={20} />
                    </Box>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Skeleton variant="text" width={200} height={16} />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="circular" width={28} height={28} />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : !selectedServer?._id ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <DnsIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {t("nginx.selectServer")}
              </Typography>
            </Box>
          ) : configs.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <DescriptionIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="body1" color="text.secondary">
                {t("nginx.noConfigs")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nginx may not be installed or configs are in a different
                location
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
              >
                {t("nginx.createConfig")}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {configs.map((config) => (
                <Box
                  key={config.name}
                  sx={{
                    display: "flex",
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.2s",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 1.5, sm: 0 },
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.04)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <DescriptionIcon
                      sx={{
                        fontSize: 20,
                        color: config.enabled
                          ? "success.main"
                          : "text.secondary",
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            cursor: "pointer",
                            "&:hover": {
                              color: "primary.light",
                              textDecoration: "underline",
                            },
                          }}
                          onClick={() => handleOpenEditor(config.name)}
                        >
                          {config.name}
                        </Typography>
                        <Chip
                          label={
                            config.enabled
                              ? t("common.enabled")
                              : t("common.disabled")
                          }
                          size="small"
                          color={config.enabled ? "success" : "default"}
                          variant="outlined"
                          sx={{ fontSize: 10, height: 20 }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: 11 }}
                      >
                        {config.size} • {config.modified}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.5,
                      flexShrink: 0,
                    }}
                  >
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditor(config.name)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={config.enabled ? "Disable" : "Enable"}>
                      <IconButton
                        size="small"
                        color={config.enabled ? "warning" : "success"}
                        onClick={() => handleToggle(config)}
                      >
                        {config.enabled ? (
                          <StopIcon fontSize="small" />
                        ) : (
                          <PlayArrowIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(config.name)}
                        disabled={config.name === "default"}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                overflow: "hidden",
              }}
            >
              <DescriptionIcon sx={{ color: "primary.main", flexShrink: 0 }} />
              <Typography variant="h6" component="div" noWrap>
                {isNewFile ? t("nginx.newConfig") : editorFilename}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title="Test Nginx">
                <IconButton size="small" onClick={handleTest}>
                  <BugReportIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reload Nginx">
                <IconButton size="small" onClick={handleReload}>
                  <ReplayIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            pt: "8px !important",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {isNewFile && (
            <TextField
              label="Filename"
              value={editorFilename}
              onChange={(e) => setEditorFilename(e.target.value)}
              size="small"
              fullWidth
              placeholder="e.g. my-app.conf"
              helperText="Name of the config file (no path, no slashes)"
            />
          )}

          {editorLoading ? (
            <Box sx={{ py: 2 }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton
                  key={i}
                  variant="text"
                  width={`${85 + (i % 3) * 5}%`}
                  height={18}
                  sx={{ mb: 0.5 }}
                />
              ))}
            </Box>
          ) : (
            <CodeEditor
              value={editorContent}
              onChange={(val) => setEditorContent(val || "")}
              filename={
                editorFilename.endsWith(".conf")
                  ? editorFilename
                  : `${editorFilename}.conf`
              }
              height={isMobile ? "calc(100dvh - 200px)" : "60vh"}
            />
          )}

          {testOutput && (
            <Alert
              severity={testOutput.success ? "success" : "error"}
              sx={{
                "& .MuiAlert-message": {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                },
              }}
            >
              {testOutput.output}
            </Alert>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            display: { xs: "grid", sm: "flex" },
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))" }, // Strict equal columns
            gap: 1.5,
            justifyContent: "flex-end",
            "& > button": {
              ml: { xs: 0, sm: 1 }, // Reset margin on mobile
              width: { xs: "100%", sm: "auto" },
              minWidth: { sm: 100 },
            },
          }}
        >
          <Button
            onClick={() => setEditorOpen(false)}
            variant="outlined"
            color="inherit"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="outlined"
            onClick={handleTest}
            color="inherit"
            startIcon={<BugReportIcon />}
          >
            {t("nginx.test")}
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={
              editorSaving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={editorSaving || editorSaveReloading}
          >
            {t("common.save")}
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSaveAndReload}
            startIcon={
              editorSaveReloading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <ReplayIcon />
              )
            }
            disabled={editorSaving || editorSaveReloading}
          >
            Save & Reload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ color: "error.main", fontWeight: 700 }}>
          ⚠️ {t("nginx.deleteConfig")}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteTarget}</strong>?
            This will also disable it.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          📄 Nginx {logType === "access" ? "Access" : "Error"} Log
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Chip
              label="Access"
              size="small"
              color={logType === "access" ? "primary" : "default"}
              onClick={() => handleViewLogs("access")}
              sx={{ cursor: "pointer" }}
            />
            <Chip
              label="Error"
              size="small"
              color={logType === "error" ? "error" : "default"}
              onClick={() => handleViewLogs("error")}
              sx={{ cursor: "pointer" }}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {logLoading ? (
            <Box sx={{ py: 2 }}>
              <Skeleton variant="text" width="100%" height={18} />
              <Skeleton variant="text" width="90%" height={18} />
              <Skeleton variant="text" width="95%" height={18} />
              <Skeleton variant="text" width="80%" height={18} />
              <Skeleton variant="text" width="85%" height={18} />
            </Box>
          ) : (
            <Box
              sx={{
                bgcolor: "var(--terminal-bg)",
                p: 2,
                borderRadius: 2,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: { xs: 10, md: 12 },
                maxHeight: { xs: "60vh", md: 400 },
                overflow: "auto",
                color: "#c9d1d9",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {logContent || "No log content"}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              navigator.clipboard.writeText(logContent);
              toast.success("Copied!");
            }}
          >
            Copy
          </Button>
          <Button onClick={() => setLogsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NginxManager;
