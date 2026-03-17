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
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Paper,
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
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import TerminalIcon from "@mui/icons-material/Terminal";
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

  // Visual Builder State — multi-block
  interface BuilderBlock {
    domains: string;
    type: "proxy" | "static";
    proxyPass: string;
    websockets: boolean;
    rootPath: string;
    indexFiles: string;
    cors: boolean;
    maxBodySize: string;
    ssl: boolean;
    gzip: boolean;
    securityHeaders: boolean;
    connectTimeout: string;
    readTimeout: string;
    sendTimeout: string;
  }
  const defaultBlock = (): BuilderBlock => ({
    domains: "",
    type: "proxy",
    proxyPass: "",
    websockets: false,
    rootPath: "",
    indexFiles: "index.html index.htm",
    cors: false,
    maxBodySize: "",
    ssl: false,
    gzip: false,
    securityHeaders: false,
    connectTimeout: "",
    readTimeout: "",
    sendTimeout: "",
  });

  const [editorTab, setEditorTab] = useState(0);
  const [builderBlocks, setBuilderBlocks] = useState<BuilderBlock[]>([
    defaultBlock(),
  ]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  const updateBlock = (idx: number, patch: Partial<BuilderBlock>) => {
    setBuilderBlocks((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    );
  };

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

  // SSL
  const [sslOpen, setSslOpen] = useState(false);
  const [sslTarget, setSslTarget] = useState("");
  const [sslDomain, setSslDomain] = useState("");
  const [sslEmail, setSslEmail] = useState("");
  const [sslLoading, setSslLoading] = useState(false);

  // Install state
  const [nginxInstalled, setNginxInstalled] = useState<boolean | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const installLogRef = React.useRef<HTMLDivElement>(null);

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
      checkInstalled();
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

  const checkInstalled = useCallback(async () => {
    if (!selectedServer?._id) return;
    try {
      const { data } = await api.get(
        `/nginx/${selectedServer._id}/check-installed`,
      );
      setNginxInstalled(data.installed);
    } catch {
      setNginxInstalled(null);
    }
  }, [selectedServer?._id]);

  const handleInstall = useCallback(async () => {
    if (!selectedServer?._id) return;
    setInstalling(true);
    setInstallLogs([]);

    try {
      const token = localStorage.getItem("accessToken");
      const baseUrl = import.meta.env.VITE_API_URL || "";
      const url = `${baseUrl}/api/nginx/${selectedServer._id}/install`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.line) {
                  setInstallLogs((prev) => [...prev, parsed.line]);
                }
                if (parsed.message) {
                  setInstallLogs((prev) => [...prev, parsed.message]);
                }
              } catch {}
            }
            if (line.startsWith("event: complete")) {
              setNginxInstalled(true);
              toast.success(t("nginx.installSuccess") || "Nginx installed!");
              fetchConfigs();
              fetchStatus();
            }
            if (line.startsWith("event: error")) {
              toast.error(t("nginx.installFailed") || "Install failed");
            }
          }
        }
      }
    } catch (err: any) {
      setInstallLogs((prev) => [
        ...prev,
        `❌ Error: ${err.message || "Connection failed"}`,
      ]);
      toast.error("Install failed");
    } finally {
      setInstalling(false);
    }
  }, [selectedServer?._id, fetchConfigs, fetchStatus, t]);

  // Auto-scroll install log
  useEffect(() => {
    if (installLogRef.current) {
      installLogRef.current.scrollTop = installLogRef.current.scrollHeight;
    }
  }, [installLogs]);

  const resetBuilderState = useCallback(() => {
    setEditorTab(0);
    setBuilderBlocks([defaultBlock()]);
    setShowPreview(false);
    setPreviewContent("");
  }, []);

  const handleOpenEditor = useCallback(
    async (filename: string) => {
      setEditorFilename(filename);
      setEditorOpen(true);
      setEditorLoading(true);
      setIsNewFile(false);
      setTestOutput(null);
      setEditorTab(1); // Default to Raw Editor for existing files
      resetBuilderState();
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
    [selectedServer?._id, resetBuilderState],
  );

  const handleCreateNew = useCallback(() => {
    setEditorFilename("");
    setEditorContent(DEFAULT_TEMPLATE);
    setEditorOpen(true);
    setEditorLoading(false);
    setIsNewFile(true);
    setTestOutput(null);
    resetBuilderState();
  }, [resetBuilderState]);

  // Build blocks payload from state for API call
  const buildBlocksPayload = () =>
    builderBlocks.map((b) => ({
      domains: b.domains
        .split(",")
        .map((d: string) => d.trim())
        .filter(Boolean),
      type: b.type,
      proxyPass: b.type === "proxy" ? b.proxyPass || undefined : undefined,
      websockets: b.type === "proxy" ? b.websockets || undefined : undefined,
      rootPath: b.type === "static" ? b.rootPath || undefined : undefined,
      indexFiles: b.type === "static" ? b.indexFiles || undefined : undefined,
      cors: b.cors || undefined,
      maxBodySize: b.maxBodySize || undefined,
      ssl: b.ssl || undefined,
      gzip: b.gzip || undefined,
      securityHeaders: b.securityHeaders || undefined,
      proxyConnectTimeout: b.connectTimeout || undefined,
      proxyReadTimeout: b.readTimeout || undefined,
      proxySendTimeout: b.sendTimeout || undefined,
    }));

  // Validate all blocks
  const validateBlocks = (): string | null => {
    for (let i = 0; i < builderBlocks.length; i++) {
      const b = builderBlocks[i];
      if (!b.domains.trim())
        return `Block ${i + 1}: At least one domain is required`;
      if (b.type === "proxy" && !b.proxyPass.trim())
        return `Block ${i + 1}: Proxy Pass URL is required`;
      if (b.type === "static" && !b.rootPath.trim())
        return `Block ${i + 1}: Root Path is required`;
    }
    return null;
  };

  const handleSave = useCallback(async () => {
    setEditorSaving(true);
    try {
      if (editorTab === 0) {
        const error = validateBlocks();
        if (error) {
          toast.error(error);
          setEditorSaving(false);
          return;
        }
        await api.post(`/nginx/${selectedServer?._id}/generate-config`, {
          blocks: buildBlocksPayload(),
        });
        toast.success("Nginx config generated and saved!");
      } else {
        // Raw Editor save
        if (!editorFilename.trim()) {
          toast.error("Filename is required in Raw mode");
          setEditorSaving(false);
          return;
        }
        await api.post(
          `/nginx/${selectedServer?._id}/configs/${editorFilename}`,
          {
            content: editorContent,
          },
        );
        toast.success("Config saved!");
      }
      fetchConfigs();
      setEditorOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setEditorSaving(false);
    }
  }, [
    selectedServer?._id,
    editorFilename,
    editorContent,
    editorTab,
    builderBlocks,
    fetchConfigs,
  ]);

  const handleSaveAndReload = useCallback(async () => {
    setEditorSaveReloading(true);
    try {
      if (editorTab === 0) {
        const error = validateBlocks();
        if (error) {
          toast.error(error);
          setEditorSaveReloading(false);
          return;
        }
        const { data } = await api.post(
          `/nginx/${selectedServer?._id}/generate-config`,
          { blocks: buildBlocksPayload() },
        );
        if (data.success) {
          toast.success("Config generated & nginx reloaded!");
          fetchConfigs();
          fetchStatus();
          setEditorOpen(false);
        } else {
          toast.error(data.output || "Generate & reload failed");
          setTestOutput(data);
        }
      } else {
        // Raw Editor save
        if (!editorFilename.trim()) {
          toast.error("Filename is required");
          setEditorSaveReloading(false);
          return;
        }
        const { data } = await api.post(
          `/nginx/${selectedServer?._id}/configs/${editorFilename}/save-reload`,
          { content: editorContent },
        );
        if (data.success) {
          toast.success("Config saved & nginx reloaded!");
          fetchConfigs();
          fetchStatus();
          setEditorOpen(false);
        } else {
          toast.error(data.output || "Save & reload failed");
          setTestOutput(data);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setEditorSaveReloading(false);
    }
  }, [
    selectedServer?._id,
    editorFilename,
    editorContent,
    editorTab,
    builderBlocks,
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

  const handleSslProvision = async () => {
    if (!sslDomain || !sslEmail) {
      toast.error("Domain and Email are required");
      return;
    }
    setSslLoading(true);
    try {
      const { data } = await api.post(`/nginx/${selectedServer?._id}/ssl`, {
        domain: sslDomain,
        email: sslEmail,
      });
      if (data.success) {
        toast.success(`SSL provisioned for ${sslDomain}!`);
        setSslOpen(false);
        fetchConfigs(); // Refresh configs since certbot modified them
      } else {
        toast.error(data.message || "SSL Provision failed");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to provision SSL",
      );
    } finally {
      setSslLoading(false);
    }
  };

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
          ) : nginxInstalled === false ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <DownloadIcon
                sx={{ fontSize: 56, color: "warning.main", mb: 2 }}
              />
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                {t("nginx.notInstalled") || "Nginx is not installed"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3, maxWidth: 400, mx: "auto" }}
              >
                {t("nginx.notInstalledDesc") ||
                  "Nginx was not found on this server. Click the button below to install it automatically."}
              </Typography>
              <Button
                variant="contained"
                color="warning"
                startIcon={
                  installing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <DownloadIcon />
                  )
                }
                onClick={handleInstall}
                disabled={installing}
                sx={{ mb: 3, px: 4, py: 1.2, fontWeight: 600 }}
              >
                {installing
                  ? t("nginx.installing") || "Installing..."
                  : t("nginx.installNginx") || "Install Nginx"}
              </Button>

              {/* Install Log Terminal */}
              {installLogs.length > 0 && (
                <Box
                  ref={installLogRef}
                  sx={{
                    mt: 2,
                    mx: "auto",
                    maxWidth: 700,
                    maxHeight: 400,
                    overflow: "auto",
                    bgcolor: "#0d1117",
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.1)",
                    textAlign: "left",
                    p: 2,
                    "&::-webkit-scrollbar": { width: 6 },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: "rgba(255,255,255,0.15)",
                      borderRadius: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                      pb: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <TerminalIcon sx={{ fontSize: 16, color: "#4caf50" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        color: "#4caf50",
                        fontWeight: 600,
                      }}
                    >
                      Installation Log
                    </Typography>
                    {installing && (
                      <CircularProgress
                        size={12}
                        sx={{ ml: "auto", color: "#4caf50" }}
                      />
                    )}
                  </Box>
                  {installLogs.map((line, i) => (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontSize: "0.75rem",
                        lineHeight: 1.6,
                        color: line.startsWith("❌")
                          ? "#f44336"
                          : line.startsWith("✅")
                            ? "#4caf50"
                            : line.startsWith("⚠️")
                              ? "#ff9800"
                              : line.startsWith("───")
                                ? "rgba(255,255,255,0.2)"
                                : "rgba(255,255,255,0.75)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {line}
                    </Typography>
                  ))}
                </Box>
              )}
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
                    <Tooltip title={`Test ${config.name}`}>
                      <IconButton
                        size="small"
                        color="info"
                        onClick={async () => {
                          try {
                            const { data } = await api.post(
                              `/nginx/${selectedServer?._id}/test/${config.name}`,
                            );
                            if (data.success) {
                              toast.success(`✅ ${config.name} — syntax OK`);
                            } else {
                              toast.error(`❌ ${config.name} — test failed`);
                            }
                            setTestOutput(data);
                          } catch (err: any) {
                            toast.error(
                              err.response?.data?.message || "Test failed",
                            );
                          }
                        }}
                      >
                        <BugReportIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
                    <Tooltip title="Provision SSL">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => {
                          setSslTarget(config.name);
                          setSslDomain(
                            config.name === "default"
                              ? ""
                              : config.name.replace(".conf", ""),
                          );
                          setSslOpen(true);
                        }}
                      >
                        <LockOutlinedIcon fontSize="small" />
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
          {/* Tabs — always shown */}
          <Tabs
            value={editorTab}
            onChange={(e, val) => setEditorTab(val)}
            sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Visual Builder" />
            <Tab label="Raw Editor" />
          </Tabs>

          {editorTab === 0 ? (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, py: 1 }}
            >
              {builderBlocks.map((block, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    position: "relative",
                    borderColor: "divider",
                  }}
                >
                  {/* Block header */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      🧩 Server Block {idx + 1}
                    </Typography>
                    {builderBlocks.length > 1 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          setBuilderBlocks((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                  {/* Domain */}
                  <TextField
                    label="Domain(s)"
                    value={block.domains}
                    onChange={(e) =>
                      updateBlock(idx, { domains: e.target.value })
                    }
                    size="small"
                    fullWidth
                    placeholder="e.g. app.example.com, api.example.com"
                    helperText={
                      idx === 0
                        ? "Comma separated. The first domain is used as config filename."
                        : "Comma separated."
                    }
                    autoFocus={idx === 0}
                  />

                  {/* Config Type */}
                  <FormControl size="small" fullWidth>
                    <InputLabel>Config Type</InputLabel>
                    <Select
                      value={block.type}
                      label="Config Type"
                      onChange={(e) =>
                        updateBlock(idx, {
                          type: e.target.value as "proxy" | "static",
                        })
                      }
                    >
                      <MenuItem value="proxy">🔀 Reverse Proxy</MenuItem>
                      <MenuItem value="static">📁 Static Site</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Proxy fields */}
                  {block.type === "proxy" && (
                    <>
                      <TextField
                        label="Proxy Pass (Upstream URL)"
                        value={block.proxyPass}
                        onChange={(e) =>
                          updateBlock(idx, { proxyPass: e.target.value })
                        }
                        size="small"
                        fullWidth
                        placeholder="e.g. http://localhost:3000"
                        helperText="The local app URL to forward traffic to"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={block.websockets}
                            onChange={(e) =>
                              updateBlock(idx, { websockets: e.target.checked })
                            }
                            color="primary"
                          />
                        }
                        label="Enable WebSocket Support"
                      />
                    </>
                  )}

                  {/* Static fields */}
                  {block.type === "static" && (
                    <>
                      <TextField
                        label="Root Path"
                        value={block.rootPath}
                        onChange={(e) =>
                          updateBlock(idx, { rootPath: e.target.value })
                        }
                        size="small"
                        fullWidth
                        placeholder="e.g. /var/www/mysite/dist"
                      />
                      <TextField
                        label="Index Files"
                        value={block.indexFiles}
                        onChange={(e) =>
                          updateBlock(idx, { indexFiles: e.target.value })
                        }
                        size="small"
                        fullWidth
                        placeholder="index.html index.htm"
                      />
                    </>
                  )}

                  {/* SSL & Security */}
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    🔒 SSL & Security
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={block.ssl}
                        onChange={(e) =>
                          updateBlock(idx, { ssl: e.target.checked })
                        }
                        color="primary"
                      />
                    }
                    label="HTTPS / SSL (auto-redirect HTTP → HTTPS)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={block.securityHeaders}
                        onChange={(e) =>
                          updateBlock(idx, {
                            securityHeaders: e.target.checked,
                          })
                        }
                        color="primary"
                      />
                    }
                    label="Security Headers (X-Frame-Options, HSTS...)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={block.cors}
                        onChange={(e) =>
                          updateBlock(idx, { cors: e.target.checked })
                        }
                        color="primary"
                      />
                    }
                    label="Enable CORS (Access-Control-Allow-Origin: *)"
                  />

                  {/* Performance */}
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    ⚡ Performance
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={block.gzip}
                        onChange={(e) =>
                          updateBlock(idx, { gzip: e.target.checked })
                        }
                        color="primary"
                      />
                    }
                    label="Gzip Compression"
                  />
                  <TextField
                    label="Max Upload Size (client_max_body_size)"
                    value={block.maxBodySize}
                    onChange={(e) =>
                      updateBlock(idx, { maxBodySize: e.target.value })
                    }
                    size="small"
                    fullWidth
                    placeholder="e.g. 50M, 100M"
                  />

                  {/* Proxy Timeouts */}
                  {block.type === "proxy" && (
                    <>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{
                          color: "text.secondary",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        ⏱ Proxy Timeouts
                      </Typography>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <TextField
                          label="Connect"
                          value={block.connectTimeout}
                          onChange={(e) =>
                            updateBlock(idx, { connectTimeout: e.target.value })
                          }
                          size="small"
                          placeholder="60s"
                          helperText="proxy_connect_timeout"
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Read"
                          value={block.readTimeout}
                          onChange={(e) =>
                            updateBlock(idx, { readTimeout: e.target.value })
                          }
                          size="small"
                          placeholder="60s"
                          helperText="proxy_read_timeout"
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Send"
                          value={block.sendTimeout}
                          onChange={(e) =>
                            updateBlock(idx, { sendTimeout: e.target.value })
                          }
                          size="small"
                          placeholder="60s"
                          helperText="proxy_send_timeout"
                          sx={{ flex: 1 }}
                        />
                      </Box>
                    </>
                  )}
                </Paper>
              ))}

              {/* Add Block Button */}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() =>
                  setBuilderBlocks((prev) => [...prev, defaultBlock()])
                }
                sx={{ alignSelf: "flex-start", textTransform: "none" }}
              >
                Add Server Block
              </Button>

              {/* Preview Button */}
              <Button
                variant="outlined"
                size="small"
                sx={{ alignSelf: "flex-start", textTransform: "none" }}
                onClick={() => {
                  const allLines: string[] = [];
                  for (const b of builderBlocks) {
                    const doms = b.domains
                      .split(",")
                      .map((d: string) => d.trim())
                      .filter(Boolean);
                    const domStr = doms.join(" ") || "example.com";
                    if (b.ssl) {
                      allLines.push(
                        `server {\n    listen 80;\n    server_name ${domStr};\n    return 301 https://$host$request_uri;\n}\n`,
                      );
                    }
                    allLines.push(`server {`);
                    allLines.push(
                      b.ssl
                        ? `    listen 443 ssl http2;\n    server_name ${domStr};`
                        : `    listen 80;\n    server_name ${domStr};`,
                    );
                    if (b.maxBodySize)
                      allLines.push(
                        `    client_max_body_size ${b.maxBodySize};`,
                      );
                    if (b.gzip)
                      allLines.push(`    gzip on;\n    gzip_vary on;`);
                    if (b.securityHeaders)
                      allLines.push(
                        `    add_header X-Frame-Options "SAMEORIGIN" always;`,
                      );
                    if (b.cors)
                      allLines.push(
                        `    add_header 'Access-Control-Allow-Origin' '*' always;`,
                      );
                    if (b.type === "proxy" && b.proxyPass) {
                      allLines.push(
                        `    location / {\n        proxy_pass ${b.proxyPass};`,
                      );
                      if (b.websockets)
                        allLines.push(
                          `        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";`,
                        );
                      allLines.push(
                        `        proxy_set_header Host $host;\n    }`,
                      );
                    } else if (b.type === "static" && b.rootPath) {
                      allLines.push(
                        `    root ${b.rootPath};\n    index ${b.indexFiles || "index.html"};\n    location / {\n        try_files $uri $uri/ /index.html;\n    }`,
                      );
                    }
                    allLines.push(`}\n`);
                  }
                  setPreviewContent(allLines.join("\n"));
                  setShowPreview(!showPreview);
                }}
              >
                {showPreview ? "Hide Preview" : "👁 Preview Config"}
              </Button>

              {showPreview && previewContent && (
                <Box
                  sx={{
                    bgcolor: "#0d1117",
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.1)",
                    p: 2,
                    maxHeight: 300,
                    overflow: "auto",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: "#c9d1d9",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    "&::-webkit-scrollbar": { width: 6 },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: "rgba(255,255,255,0.15)",
                      borderRadius: 3,
                    },
                  }}
                >
                  {previewContent}
                </Box>
              )}
            </Box>
          ) : (
            <>
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
                  height={isMobile ? "calc(100dvh - 200px)" : "50vh"}
                />
              )}
            </>
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

      {/* SSL Provision Dialog */}
      <Dialog
        open={sslOpen}
        onClose={() => setSslOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LockOutlinedIcon color="info" />
          Provision SSL Certificate
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "8px !important",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Pulse will automatically instruct Let's Encrypt (`certbot`) to
            generate a free SSL certificate and attach it to{" "}
            <strong>{sslTarget}</strong>.
          </Typography>
          <TextField
            label="Domain Name"
            size="small"
            fullWidth
            value={sslDomain}
            onChange={(e) => setSslDomain(e.target.value)}
            placeholder="e.g. app.mycompany.com"
            autoFocus
          />
          <TextField
            label="Email Address"
            type="email"
            size="small"
            fullWidth
            value={sslEmail}
            onChange={(e) => setSslEmail(e.target.value)}
            placeholder="e.g. admin@mycompany.com"
            helperText="Required by Let's Encrypt for urgent renewal notices"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSslOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSslProvision}
            variant="contained"
            color="info"
            disabled={sslLoading || !sslDomain || !sslEmail}
            startIcon={
              sslLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <LockOutlinedIcon />
              )
            }
          >
            Agree & Provision SSL
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NginxManager;
