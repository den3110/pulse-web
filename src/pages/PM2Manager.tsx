import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import api from "../services/api";
import { connectSocket } from "../services/socket";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Switch,
  FormControlLabel,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useServer } from "../contexts/ServerContext";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import DnsIcon from "@mui/icons-material/Dns";
import SaveIcon from "@mui/icons-material/Save";
import TerminalIcon from "@mui/icons-material/Terminal";
import MemoryIcon from "@mui/icons-material/Memory";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"; // Imported Icon
import ServerFileSelectorDialog from "../components/ServerFileSelectorDialog"; // Imported Component

interface PM2Process {
  pm_id: number;
  name: string;
  status: string;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  mode: string;
  pid: number;
  interpreter: string;
  script: string;
  cwd: string;
  watching: boolean;
  instances: number;
}

interface Server {
  _id: string;
  name: string;
  host: string;
  status: string;
}

const statusColors: Record<
  string,
  "success" | "error" | "warning" | "default" | "info"
> = {
  online: "success",
  stopping: "warning",
  stopped: "default",
  errored: "error",
  launching: "info",
};

const formatMemory = (bytes: number): string => {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatUptime = (timestamp: number): string => {
  if (!timestamp) return "-";
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 0) return "-";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

const PM2Manager: React.FC<{ hideHeader?: boolean }> = ({
  hideHeader = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();

  const { selectedServer } = useServer();
  // const [servers, setServers] = useState<Server[]>([]);
  // const [selectedServer, setSelectedServer] = useState<string>("");
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Start dialog
  const [startOpen, setStartOpen] = useState(false);
  const [fileSelectorOpen, setFileSelectorOpen] = useState(false); // Added State
  const [startForm, setStartForm] = useState({
    script: "",
    name: "",
    interpreter: "node",
    instances: 1,
    cwd: "",
    args: "",
    maxMemory: "",
    watch: false,
  });
  const [startLoading, setStartLoading] = useState(false);

  // Logs dialog
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsTarget, setLogsTarget] = useState<string>("");
  const [logContent, setLogContent] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [logLines, setLogLines] = useState(100);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Fetch servers
  // Fetch servers handled globally
  // useEffect(() => {
  //   const fetchServers = async () => { ... };
  //   fetchServers();
  // }, []);

  const fetchProcesses = useCallback(
    async (showSpinner = false) => {
      if (!selectedServer?._id) return;
      if (showSpinner) setLoading(true);
      try {
        const { data } = await api.get(`/pm2/${selectedServer?._id}/processes`);
        setProcesses(data);
      } catch (err: any) {
        // Only toast on manual / first fetch, not background refresh
        if (showSpinner) {
          toast.error(
            err.response?.data?.message || "Failed to load PM2 processes",
          );
        }
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [selectedServer?._id],
  );

  useEffect(() => {
    fetchProcesses(true);
  }, [fetchProcesses]);

  // Socket.IO real-time updates + fallback poll
  useEffect(() => {
    if (!selectedServer?._id) return;

    const socket = connectSocket();
    socket.emit("join:pm2", selectedServer?._id);

    const handleProcesses = (data: {
      serverId: string;
      processes: PM2Process[];
    }) => {
      if (data.serverId === selectedServer?._id) {
        setProcesses(data.processes);
      }
    };

    socket.on("pm2:processes", handleProcesses);

    // Fallback: poll every 30s in case socket misses something
    const fallback = setInterval(() => fetchProcesses(false), 30000);

    return () => {
      socket.emit("leave:pm2", selectedServer?._id);
      socket.off("pm2:processes", handleProcesses);
      clearInterval(fallback);
    };
  }, [selectedServer?._id, fetchProcesses]);

  const handleAction = useCallback(
    async (
      nameOrId: string,
      action: "stop" | "restart" | "reload" | "delete",
    ) => {
      setActionLoading(`${nameOrId}-${action}`);
      try {
        const { data } = await api.post(
          `/pm2/${selectedServer?._id}/${nameOrId}/${action}`,
        );
        if (data.success) {
          toast.success(
            `${action.charAt(0).toUpperCase() + action.slice(1)} successful`,
          );
          fetchProcesses();
        } else {
          toast.error(data.output || `${action} failed`);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || `${action} failed`);
      } finally {
        setActionLoading(null);
      }
    },
    [selectedServer?._id, fetchProcesses],
  );

  const handleBulkAction = useCallback(
    async (
      action: "restart-all" | "stop-all" | "save" | "startup" | "flush",
    ) => {
      setActionLoading(action);
      try {
        const { data } = await api.post(
          `/pm2/${selectedServer?._id}/${action}`,
        );
        if (data.success) {
          toast.success(
            action === "save"
              ? "Process list saved!"
              : action === "startup"
                ? "Startup script generated!"
                : action === "flush"
                  ? "All logs flushed!"
                  : `${action.replace("-", " ")} successful`,
          );
          if (action !== "save" && action !== "startup" && action !== "flush") {
            fetchProcesses();
          }
        } else {
          toast.error(data.output || `${action} failed`);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || `${action} failed`);
      } finally {
        setActionLoading(null);
      }
    },
    [selectedServer?._id, fetchProcesses],
  );

  const handleStart = useCallback(async () => {
    if (!startForm.script.trim()) {
      toast.error("Script path is required");
      return;
    }
    setStartLoading(true);
    try {
      const { data } = await api.post(`/pm2/${selectedServer?._id}/start`, {
        script: startForm.script,
        name: startForm.name || undefined,
        interpreter: startForm.interpreter || undefined,
        instances: startForm.instances > 1 ? startForm.instances : undefined,
        cwd: startForm.cwd || undefined,
        args: startForm.args || undefined,
        maxMemory: startForm.maxMemory || undefined,
        watch: startForm.watch || undefined,
      });
      if (data.success) {
        toast.success("Process started!");
        setStartOpen(false);
        setStartForm({
          script: "",
          name: "",
          interpreter: "node",
          instances: 1,
          cwd: "",
          args: "",
          maxMemory: "",
          watch: false,
        });
        fetchProcesses();
      } else {
        toast.error(data.output || "Start failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Start failed");
    } finally {
      setStartLoading(false);
    }
  }, [selectedServer?._id, startForm, fetchProcesses]);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleCloseLogs = useCallback(() => {
    setLogsOpen(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const handleViewLogs = useCallback(
    async (nameOrId: string) => {
      setLogsTarget(nameOrId);
      setLogsOpen(true);
      setLogContent("");
      setLogLoading(true);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      if (!selectedServer?._id) return;

      const token = localStorage.getItem("accessToken");
      const API_URL = import.meta.env.VITE_API_URL || "";
      // Use relative URL for proxy
      const url = `${API_URL}/api/pm2/${selectedServer._id}/${nameOrId}/logs/stream?token=${token}`;

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setLogLoading(false);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.log) {
            setLogContent((prev) => (prev ? prev + "\n" + data.log : data.log));
            // Auto-scroll could be nice, but simple binding is fine for now
          }
        } catch (e) {}
      };

      es.onerror = (err) => {
        // console.error("SSE Error:", err);
        es.close();
        setLogLoading(false);
      };
    },
    [selectedServer?._id],
  );

  const handleFlushLogs = useCallback(
    async (nameOrId: string) => {
      try {
        const { data } = await api.post(
          `/pm2/${selectedServer?._id}/${nameOrId}/flush`,
        );
        if (data.success) {
          toast.success("Logs flushed!");
        } else {
          toast.error(data.output || "Flush failed");
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Flush failed");
      }
    },
    [selectedServer?._id],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await handleAction(deleteTarget, "delete");
    setDeleteTarget(null);
  }, [deleteTarget, handleAction]);

  const onlineCount = useMemo(
    () => processes.filter((p) => p.status === "online").length,
    [processes],
  );
  const totalMemory = useMemo(
    () => processes.reduce((sum, p) => sum + (p.memory || 0), 0),
    [processes],
  );
  const totalCpu = useMemo(
    () => processes.reduce((sum, p) => sum + (p.cpu || 0), 0),
    [processes],
  );

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsOpen && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logsOpen, logContent]);

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
              {t("pm2.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("pm2.subtitle")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SaveIcon />}
              onClick={() => handleBulkAction("save")}
              disabled={!selectedServer?._id || actionLoading === "save"}
            >
              {t("pm2.save")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="warning"
              startIcon={<RestartAltIcon />}
              onClick={() => handleBulkAction("restart-all")}
              disabled={!selectedServer?._id || actionLoading === "restart-all"}
            >
              {t("pm2.restartAll")}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setStartOpen(true)}
              disabled={!selectedServer?._id}
            >
              {t("pm2.startNew")}
            </Button>
          </Box>
        </Box>
      )}

      {/* Server Selector + Summary */}
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
              {processes.length > 0 && (
                <>
                  <Chip
                    label={`${onlineCount}/${processes.length} ${t("pm2.status.online").toLowerCase()}`}
                    size="small"
                    color={
                      onlineCount === processes.length ? "success" : "warning"
                    }
                    icon={<MemoryIcon sx={{ fontSize: "16px !important" }} />}
                  />
                  <Chip
                    label={`${t("pm2.cpu")}: ${totalCpu.toFixed(1)}%`}
                    size="small"
                    variant="outlined"
                    color={totalCpu > 80 ? "error" : "default"}
                  />
                  <Chip
                    label={`${t("pm2.memory")}: ${formatMemory(totalMemory)}`}
                    size="small"
                    variant="outlined"
                  />
                </>
              )}
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={() => fetchProcesses(true)}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ ml: { sm: "auto" }, display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="text"
                onClick={() => handleBulkAction("stop-all")}
                disabled={!selectedServer?._id || actionLoading === "stop-all"}
                sx={{ fontSize: 12, textTransform: "none" }}
                startIcon={<StopIcon sx={{ fontSize: 14 }} />}
              >
                {t("pm2.stopAll")}
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => handleBulkAction("flush")}
                disabled={!selectedServer?._id || actionLoading === "flush"}
                sx={{ fontSize: 12, textTransform: "none" }}
                startIcon={<CleaningServicesIcon sx={{ fontSize: 14 }} />}
              >
                {t("pm2.flushAll")}
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => handleBulkAction("startup")}
                disabled={!selectedServer?._id || actionLoading === "startup"}
                sx={{ fontSize: 12, textTransform: "none" }}
                startIcon={<PowerSettingsNewIcon sx={{ fontSize: 14 }} />}
              >
                Startup
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Process List */}
      <Card>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            <TerminalIcon
              sx={{ fontSize: 18, mr: 1, verticalAlign: "text-bottom" }}
            />
            {t("pm2.processes")} ({processes.length})
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[0, 1, 2, 3].map((i) => (
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
                      <Skeleton variant="rounded" width={40} height={20} />
                    </Box>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Skeleton variant="text" width={60} height={16} />
                      <Skeleton variant="text" width={70} height={16} />
                      <Skeleton variant="text" width={30} height={16} />
                      <Skeleton variant="text" width={40} height={16} />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {[0, 1, 2, 3, 4].map((j) => (
                      <Skeleton
                        key={j}
                        variant="circular"
                        width={28}
                        height={28}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : !selectedServer?._id ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <DnsIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {t("pm2.selectServer")}
              </Typography>
            </Box>
          ) : processes.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <TerminalIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="body1" color="text.secondary">
                {t("pm2.noProcesses")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("pm2.noProcessesHint")}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setStartOpen(true)}
              >
                {t("pm2.startNew")}
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {processes.map((proc) => (
                <Box
                  key={proc.pm_id}
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
                  {/* Process info */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor:
                          proc.status === "online"
                            ? "#22c55e"
                            : proc.status === "errored"
                              ? "#ef4444"
                              : proc.status === "stopping"
                                ? "#eab308"
                                : "#6b7280",
                        flexShrink: 0,
                        boxShadow:
                          proc.status === "online"
                            ? "0 0 8px rgba(34,197,94,0.5)"
                            : "none",
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
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
                          }}
                        >
                          {proc.name}
                        </Typography>
                        <Chip
                          label={t(`pm2.status.${proc.status}`) || proc.status}
                          size="small"
                          color={statusColors[proc.status] || "default"}
                          sx={{ fontSize: 10, height: 20 }}
                        />
                        <Chip
                          label={proc.mode}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 10, height: 20 }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 10 }}
                        >
                          id:{proc.pm_id} pid:{proc.pid}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 2,
                          mt: 0.5,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 11 }}
                        >
                          {t("pm2.cpu")}:{" "}
                          <strong
                            style={{
                              color:
                                proc.cpu > 50
                                  ? "#eab308"
                                  : proc.cpu > 80
                                    ? "#ef4444"
                                    : "#22c55e",
                            }}
                          >
                            {proc.cpu.toFixed(1)}%
                          </strong>
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 11 }}
                        >
                          {t("pm2.memory")}:{" "}
                          <strong>{formatMemory(proc.memory)}</strong>
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 11 }}
                        >
                          ↻ {proc.restarts}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 11 }}
                        >
                          ⏱ {formatUptime(proc.uptime)}
                        </Typography>
                        {proc.watching && (
                          <Chip
                            label="watching"
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ fontSize: 9, height: 16 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.5,
                      flexShrink: 0,
                    }}
                  >
                    {proc.status === "online" ? (
                      <Tooltip title="Stop">
                        <span>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleAction(proc.name, "stop")}
                            disabled={actionLoading === `${proc.name}-stop`}
                          >
                            {actionLoading === `${proc.name}-stop` ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <StopIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Restart">
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleAction(proc.name, "restart")}
                            disabled={actionLoading === `${proc.name}-restart`}
                          >
                            {actionLoading === `${proc.name}-restart` ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <PlayArrowIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    <Tooltip title="Restart">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleAction(proc.name, "restart")}
                          disabled={actionLoading === `${proc.name}-restart`}
                        >
                          {actionLoading === `${proc.name}-restart` ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <RestartAltIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="View Logs">
                      <IconButton
                        size="small"
                        onClick={() => handleViewLogs(proc.name)}
                      >
                        <DescriptionIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Flush Logs">
                      <IconButton
                        size="small"
                        onClick={() => handleFlushLogs(proc.name)}
                      >
                        <CleaningServicesIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(proc.name)}
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

      {/* Start Process Dialog */}
      <Dialog
        open={startOpen}
        onClose={() => setStartOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PlayArrowIcon sx={{ color: "primary.main" }} />
            {t("pm2.startNew")}
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
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <TextField
              label={t("pm2.scriptPath")}
              value={startForm.script}
              onChange={(e) =>
                setStartForm({ ...startForm, script: e.target.value })
              }
              size="small"
              fullWidth
              placeholder="Select a script..."
              helperText="Path to the script file to run"
              required
              InputProps={{
                readOnly: false, // Allow manual edit if needed, or keep true if strictly browse
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={() => setFileSelectorOpen(true)}
                    edge="end"
                  >
                    <InsertDriveFileIcon />
                  </IconButton>
                ),
              }}
            />
          </Box>

          <TextField
            label={t("pm2.processName")}
            value={startForm.name}
            onChange={(e) =>
              setStartForm({ ...startForm, name: e.target.value })
            }
            size="small"
            fullWidth
            placeholder="e.g. my-api"
            helperText="Optional name for the process"
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Interpreter</InputLabel>
              <Select
                value={startForm.interpreter}
                label="Interpreter"
                onChange={(e) =>
                  setStartForm({ ...startForm, interpreter: e.target.value })
                }
              >
                <MenuItem value="node">Node.js</MenuItem>
                <MenuItem value="python3">Python 3</MenuItem>
                <MenuItem value="python">Python</MenuItem>
                <MenuItem value="bash">Bash</MenuItem>
                <MenuItem value="none">None (binary)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Instances"
              type="number"
              value={startForm.instances}
              onChange={(e) =>
                setStartForm({
                  ...startForm,
                  instances: parseInt(e.target.value) || 1,
                })
              }
              size="small"
              sx={{ width: 120 }}
              inputProps={{ min: 1, max: 16 }}
              helperText="1=fork, >1=cluster"
            />
          </Box>
          <TextField
            label="Working Directory"
            value={startForm.cwd}
            onChange={(e) =>
              setStartForm({ ...startForm, cwd: e.target.value })
            }
            size="small"
            fullWidth
            placeholder="/home/user/myapp"
          />
          <TextField
            label="Arguments"
            value={startForm.args}
            onChange={(e) =>
              setStartForm({ ...startForm, args: e.target.value })
            }
            size="small"
            fullWidth
            placeholder="--port 3000 --env production"
          />
          <TextField
            label="Max Memory Restart"
            value={startForm.maxMemory}
            onChange={(e) =>
              setStartForm({ ...startForm, maxMemory: e.target.value })
            }
            size="small"
            fullWidth
            placeholder="e.g. 300M, 1G"
            helperText="Auto-restart when memory exceeds this limit"
          />
          <FormControlLabel
            control={
              <Switch
                checked={startForm.watch}
                onChange={(e) =>
                  setStartForm({ ...startForm, watch: e.target.checked })
                }
              />
            }
            label="Watch for file changes"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStartOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            startIcon={
              startLoading ? (
                <Skeleton variant="circular" width={16} height={16} />
              ) : (
                <PlayArrowIcon />
              )
            }
            onClick={handleStart}
            disabled={startLoading || !startForm.script.trim()}
          >
            {t("pm2.start")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Selector Dialog */}
      <ServerFileSelectorDialog
        open={fileSelectorOpen}
        onClose={() => setFileSelectorOpen(false)}
        onSelect={(filePath) => {
          setStartForm({ ...startForm, script: filePath });
          // Auto-guess interpreter based on extension if not set or default
          if (filePath.endsWith(".py"))
            setStartForm((prev) => ({
              ...prev,
              script: filePath,
              interpreter: "python3",
            }));
          else if (filePath.endsWith(".sh"))
            setStartForm((prev) => ({
              ...prev,
              script: filePath,
              interpreter: "bash",
            }));
          else if (filePath.endsWith(".js") || filePath.endsWith(".ts"))
            setStartForm((prev) => ({
              ...prev,
              script: filePath,
              interpreter: "node",
            }));
        }}
        serverId={selectedServer?._id || ""}
        title="Select Script"
        allowedExtensions={[
          ".js",
          ".ts",
          ".py",
          ".sh",
          ".json",
          ".mjs",
          ".cjs",
        ]}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ color: "error.main", fontWeight: 700 }}>
          ⚠️ {t("pm2.deleteProcess")}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteTarget}</strong>?
            This will stop and remove it from PM2.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            You can restart it later by starting a new process.
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
        onClose={handleCloseLogs}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DescriptionIcon sx={{ color: "primary.main" }} />
              Logs: {logsTarget}
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select
                  value={logLines}
                  onChange={(e) => {
                    setLogLines(e.target.value as number);
                  }}
                  size="small"
                  sx={{ fontSize: 12 }}
                >
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                  <MenuItem value={200}>200</MenuItem>
                  <MenuItem value={500}>500</MenuItem>
                </Select>
              </FormControl>
              <Button
                size="small"
                onClick={() => handleViewLogs(logsTarget)}
                startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
                sx={{ fontSize: 12, textTransform: "none" }}
              >
                Reload
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {logLoading ? (
            <Box sx={{ py: 2 }}>
              <Skeleton variant="text" width="100%" height={20} />
              <Skeleton variant="text" width="90%" height={20} />
              <Skeleton variant="text" width="95%" height={20} />
              <Skeleton variant="text" width="80%" height={20} />
              <Skeleton variant="text" width="85%" height={20} />
            </Box>
          ) : (
            <Box
              ref={logRef}
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
          <Button onClick={handleCloseLogs}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PM2Manager;
