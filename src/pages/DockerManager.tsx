import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Drawer,
  Skeleton,
  useTheme,
  Autocomplete,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import InfoIcon from "@mui/icons-material/Info";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import SearchIcon from "@mui/icons-material/Search";
import SEO from "../components/SEO";
import { useServer } from "../contexts/ServerContext";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearInterval(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
  size: string;
  networks: string;
  command: string;
}

interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

interface ContainerStats {
  containerId: string;
  name: string;
  cpuPercent: string;
  memUsage: string;
  memPercent: string;
  netIO: string;
  blockIO: string;
  pids: string;
}

const stateColor: Record<string, "success" | "error" | "warning" | "default"> =
  {
    running: "success",
    exited: "error",
    paused: "warning",
    restarting: "warning",
    created: "default",
    dead: "error",
  };

const DockerManager: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { selectedServer } = useServer();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [images, setImages] = useState<DockerImage[]>([]);
  const [stats, setStats] = useState<ContainerStats[]>([]);
  const [dockerInfo, setDockerInfo] = useState<{
    installed: boolean;
    version?: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [logDrawer, setLogDrawer] = useState<{
    open: boolean;
    containerId: string;
    name: string;
    logs: string;
    loading: boolean;
  }>({ open: false, containerId: "", name: "", logs: "", loading: false });
  const [inspectDrawer, setInspectDrawer] = useState<{
    open: boolean;
    name: string;
    data: any;
    loading: boolean;
  }>({ open: false, name: "", data: null, loading: false });
  const [pullDialog, setPullDialog] = useState(false);
  const [pullImage, setPullImage] = useState("");
  const debouncedPullImage = useDebounce(pullImage, 500);
  const [pullSuggestions, setPullSuggestions] = useState<any[]>([]);
  const [pullSearchLoading, setPullSearchLoading] = useState(false);

  const [pulling, setPulling] = useState(false);
  const [pullLogs, setPullLogs] = useState<string[]>([]);
  const [runDialog, setRunDialog] = useState(false);
  const [runConfig, setRunConfig] = useState({
    image: "",
    name: "",
    restartPolicy: "always",
    ports: [] as { hostPort: string; containerPort: string }[],
    env: [] as { key: string; value: string }[],
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleRunContainer = async () => {
    setActionLoading("running");
    try {
      await api.post(`/docker/${serverId}/containers/run`, runConfig);
      toast.success("Container started successfully");
      setRunDialog(false);
      fetchData();
      setTab(0); // Switch to containers tab
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to start container");
    } finally {
      setActionLoading(null);
    }
  };
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    action: "remove_container" | "remove_image" | "";
    name: string;
  }>({ open: false, id: "", action: "", name: "" });

  const serverId = selectedServer?._id;

  const fetchData = useCallback(async () => {
    if (!serverId) return;
    setLoading(true);
    try {
      const [infoRes, containersRes, imagesRes] = await Promise.all([
        api.get(`/docker/${serverId}/info`),
        api.get(`/docker/${serverId}/containers`),
        api.get(`/docker/${serverId}/images`),
      ]);
      setDockerInfo(infoRes.data);
      setContainers(containersRes.data.containers || []);
      setImages(imagesRes.data.images || []);

      // Fetch stats for running containers
      try {
        const statsRes = await api.get(`/docker/${serverId}/stats`);
        setStats(statsRes.data.stats || []);
      } catch {
        // no running containers
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("Server not found");
      } else {
        setDockerInfo({ installed: false });
      }
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (!serverId) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [serverId, fetchData]);

  // Fetch Docker Hub suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedPullImage || debouncedPullImage.length < 2) {
        setPullSuggestions([]);
        return;
      }
      // If it contains a slash or colon, it might be a specific registry or tag;
      // We still search, but Docker Hub search works best with plain names.
      setPullSearchLoading(true);
      try {
        const { data } = await api.get(
          `/docker/search?query=${debouncedPullImage}`,
        );
        setPullSuggestions(data.results || []);
      } catch (error) {
        console.error("Search error", error);
        setPullSuggestions([]);
      } finally {
        setPullSearchLoading(false);
      }
    };
    fetchSuggestions();
  }, [debouncedPullImage]);

  const handleAction = async (containerId: string, action: string) => {
    setActionLoading(`${containerId}-${action}`);
    try {
      await api.post(`/docker/${serverId}/containers/${containerId}/${action}`);
      toast.success(`Container ${action} successful`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const openLogs = async (containerId: string, name: string) => {
    setLogDrawer({
      open: true,
      containerId,
      name,
      logs: "",
      loading: true,
    });
    try {
      const { data } = await api.get(
        `/docker/${serverId}/containers/${containerId}/logs?tail=300`,
      );
      setLogDrawer((prev) => ({
        ...prev,
        logs: data.logs || "No logs",
        loading: false,
      }));
    } catch {
      setLogDrawer((prev) => ({
        ...prev,
        logs: "Failed to load logs",
        loading: false,
      }));
    }
  };

  const openInspect = async (containerId: string, name: string) => {
    setInspectDrawer({ open: true, name, data: null, loading: true });
    try {
      const { data } = await api.get(
        `/docker/${serverId}/containers/${containerId}/inspect`,
      );
      setInspectDrawer((prev) => ({
        ...prev,
        data: data.data,
        loading: false,
      }));
    } catch {
      setInspectDrawer((prev) => ({
        ...prev,
        data: { error: "Failed to inspect" },
        loading: false,
      }));
    }
  };

  const openImageInspect = async (imageId: string, name: string) => {
    setInspectDrawer({ open: true, name, data: null, loading: true });
    try {
      const { data } = await api.get(
        `/docker/${serverId}/images/${imageId}/inspect`,
      );
      setInspectDrawer((prev) => ({
        ...prev,
        data: data.data,
        loading: false,
      }));
    } catch {
      setInspectDrawer((prev) => ({
        ...prev,
        data: { error: "Failed to inspect image" },
        loading: false,
      }));
    }
  };

  const handlePullImage = async () => {
    if (!pullImage.trim()) return;
    setPulling(true);
    setPullLogs([]);

    const token = localStorage.getItem("accessToken");
    const API_URL = import.meta.env.VITE_API_URL || "";

    try {
      const response = await fetch(`${API_URL}/api/docker/${serverId}/pull`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: pullImage }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          const lines = text.split("\n").filter((l) => l.trim());
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.line) {
                  setPullLogs((prev) => [...prev, json.line]);
                }
              } catch {}
            }
            if (line.startsWith("event: complete")) {
              toast.success("Image pulled successfully!");
              fetchData();
            }
            if (line.startsWith("event: error")) {
              toast.error("Pull failed");
            }
          }
        }
      }
    } catch (error: any) {
      toast.error("Pull failed");
    } finally {
      setPulling(false);
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    try {
      await api.delete(`/docker/${serverId}/images/${imageId}`);
      toast.success("Image removed");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Remove failed");
    }
  };

  const filteredContainers = containers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.image.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredImages = images.filter(
    (img) =>
      img.repository.toLowerCase().includes(search.toLowerCase()) ||
      img.tag.toLowerCase().includes(search.toLowerCase()),
  );

  const getStats = (containerId: string) =>
    stats.find(
      (s) =>
        s.containerId === containerId || containerId.startsWith(s.containerId),
    );

  if (!serverId) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <SEO title="Docker" description="Docker Container Manager" />
        <ViewInArIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          {t(
            "docker.selectServer",
            "Select a server to manage Docker containers",
          )}
        </Typography>
      </Box>
    );
  }

  if (loading && !dockerInfo) {
    return (
      <Box>
        <SEO title="Docker" description="Docker Container Manager" />
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={70} sx={{ mb: 1.5 }} />
        ))}
      </Box>
    );
  }

  if (dockerInfo && !dockerInfo.installed) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <SEO title="Docker" description="Docker Container Manager" />
        <ViewInArIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {t("docker.notInstalled", "Docker is not installed on this server")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            "docker.notInstalledHint",
            "Install Docker to manage containers from here.",
          )}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <SEO title="Docker" description="Docker Container Manager" />

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            🐳 {t("docker.title", "Docker Manager")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("docker.subtitle", "Manage Docker containers and images")}
            {dockerInfo?.version && (
              <Chip
                label={`v${dockerInfo.version}`}
                size="small"
                variant="outlined"
                sx={{ ml: 1, fontSize: 10, height: 20 }}
              />
            )}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder={t("common.search", "Search...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon
                  sx={{ fontSize: 18, mr: 0.5, color: "text.secondary" }}
                />
              ),
            }}
            sx={{
              width: 200,
              "& .MuiOutlinedInput-root": { height: 36 },
            }}
          />
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => setPullDialog(true)}
            size="small"
          >
            {t("docker.pullImage", "Pull Image")}
          </Button>
          <Tooltip title={t("common.refresh", "Refresh")}>
            <IconButton onClick={fetchData} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          label={`${t("docker.containers", "Containers")} (${containers.length})`}
        />
        <Tab label={`${t("docker.images", "Images")} (${images.length})`} />
      </Tabs>

      {/* Containers Tab */}
      {tab === 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filteredContainers.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  {t("docker.noContainers", "No containers found")}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            filteredContainers.map((container) => {
              const cs = getStats(container.id);
              return (
                <Card
                  key={container.id}
                  sx={{
                    transition: "all 0.2s",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.02)",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Name + Status */}
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            fontWeight={600}
                            sx={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 13,
                            }}
                          >
                            {container.name}
                          </Typography>
                          <Chip
                            label={container.state}
                            size="small"
                            color={stateColor[container.state] || "default"}
                            variant="outlined"
                            sx={{ fontSize: 10, height: 20 }}
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                          }}
                        >
                          {container.image}
                        </Typography>
                      </Box>

                      {/* Ports */}
                      {container.ports && (
                        <Box sx={{ minWidth: 120 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ fontSize: 10 }}
                          >
                            {t("dockerManager.ports", "Ports")}</Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 10,
                              wordBreak: "break-all",
                            }}
                          >
                            {container.ports.length > 50
                              ? container.ports.substring(0, 50) + "..."
                              : container.ports}
                          </Typography>
                        </Box>
                      )}

                      {/* Stats */}
                      {cs && (
                        <Box
                          sx={{
                            display: "flex",
                            gap: 2,
                            minWidth: 180,
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ fontSize: 10 }}
                            >
                              {t("dockerManager.cPU", "CPU")}</Typography>
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              sx={{ fontSize: 11 }}
                            >
                              {cs.cpuPercent}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              sx={{ fontSize: 10 }}
                            >
                              {t("dockerManager.mEM", "MEM")}</Typography>
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              sx={{ fontSize: 11 }}
                            >
                              {cs.memUsage}
                            </Typography>
                          </Box>
                        </Box>
                      )}

                      {/* Status text */}
                      <Box sx={{ minWidth: 100 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 10 }}
                        >
                          {container.status}
                        </Typography>
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        {container.state !== "running" && (
                          <Tooltip title="Start">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                handleAction(container.id, "start")
                              }
                              disabled={
                                actionLoading === `${container.id}-start`
                              }
                            >
                              {actionLoading === `${container.id}-start` ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <PlayArrowIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                        {container.state === "running" && (
                          <Tooltip title="Stop">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleAction(container.id, "stop")}
                              disabled={
                                actionLoading === `${container.id}-stop`
                              }
                            >
                              {actionLoading === `${container.id}-stop` ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <StopIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Restart">
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleAction(container.id, "restart")
                            }
                            disabled={
                              actionLoading === `${container.id}-restart`
                            }
                          >
                            {actionLoading === `${container.id}-restart` ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <RestartAltIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Logs">
                          <IconButton
                            size="small"
                            onClick={() =>
                              openLogs(container.id, container.name)
                            }
                          >
                            <DescriptionIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Inspect">
                          <IconButton
                            size="small"
                            onClick={() =>
                              openInspect(container.id, container.name)
                            }
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                id: container.id,
                                action: "remove_container",
                                name: container.name,
                              })
                            }
                            disabled={
                              actionLoading === `${container.id}-remove`
                            }
                          >
                            {actionLoading === `${container.id}-remove` ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <DeleteIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      )}

      {/* Images Tab */}
      {tab === 1 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filteredImages.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  {t("docker.noImages", "No images found")}
                </Typography>
              </CardContent>
            </Card>
          ) : (
            filteredImages.map((img) => (
              <Card
                key={`${img.repository}:${img.tag}-${img.id}`}
                sx={{
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.02)",
                  },
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13,
                        }}
                      >
                        {img.repository}
                      </Typography>
                      <Chip
                        label={img.tag}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10, height: 18, mt: 0.5 }}
                      />
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ fontSize: 10 }}
                      >
                        {t("dockerManager.size", "Size")}</Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {img.size}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ fontSize: 10 }}
                      >
                        {t("dockerManager.iD", "ID")}</Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                        }}
                      >
                        {img.id.substring(0, 12)}
                      </Typography>
                    </Box>
                    <Tooltip title="Inspect Image">
                      <IconButton
                        size="small"
                        onClick={() =>
                          openImageInspect(
                            img.id,
                            `${img.repository}:${img.tag}`,
                          )
                        }
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Run Container">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setRunConfig({
                            image: `${img.repository}:${img.tag}`,
                            name: "",
                            restartPolicy: "always",
                            ports: [],
                            env: [],
                          });
                          setRunDialog(true);
                        }}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove Image">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          setConfirmDialog({
                            open: true,
                            id: img.id,
                            action: "remove_image",
                            name: `${img.repository}:${img.tag}`,
                          })
                        }
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}

      {/* Container Logs Drawer */}
      <Drawer
        anchor="right"
        open={logDrawer.open}
        onClose={() => setLogDrawer((prev) => ({ ...prev, open: false }))}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "100%", md: 600 },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            {t("dockerManager.logs", "📋 Logs:")}{logDrawer.name}
          </Typography>
          {logDrawer.loading ? (
            <CircularProgress />
          ) : (
            <Box
              sx={{
                bgcolor: "#0d1117",
                color: "#c9d1d9",
                p: 2,
                borderRadius: 1,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                lineHeight: 1.6,
                maxHeight: "calc(100vh - 120px)",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {logDrawer.logs}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Container Inspect Drawer */}
      <Drawer
        anchor="right"
        open={inspectDrawer.open}
        onClose={() => setInspectDrawer((prev) => ({ ...prev, open: false }))}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "100%", md: 600 },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            {t("dockerManager.inspect", "🔍 Inspect:")}{inspectDrawer.name}
          </Typography>
          {inspectDrawer.loading ? (
            <CircularProgress />
          ) : (
            <Box
              sx={{
                bgcolor: "#0d1117",
                color: "#c9d1d9",
                p: 2,
                borderRadius: 1,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                lineHeight: 1.6,
                maxHeight: "calc(100vh - 120px)",
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {JSON.stringify(inspectDrawer.data, null, 2)}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Pull Image Dialog */}
      <Dialog
        open={pullDialog}
        onClose={() => !pulling && setPullDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <DownloadIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          {t("docker.pullImage", "Pull Image")}
        </DialogTitle>
        <DialogContent>
          <Autocomplete
            freeSolo
            options={pullSuggestions.map((s) => s.repo_name)}
            loading={pullSearchLoading}
            disabled={pulling}
            inputValue={pullImage}
            onInputChange={(e, newInputValue) => {
              setPullImage(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label={t("docker.imageName", "Image Name")}
                placeholder="e.g. nginx:latest, redis:7-alpine"
                sx={{ mt: 1 }}
                helperText={t(
                  "docker.pullHelper",
                  "Enter a public image from Docker Hub (e.g. ubuntu:20.04) or a full registry URL (e.g. ghcr.io/user/image:tag).",
                )}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {pullSearchLoading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
          />
          {pullLogs.length > 0 && (
            <Box
              sx={{
                mt: 2,
                bgcolor: "#0d1117",
                color: "#c9d1d9",
                p: 2,
                borderRadius: 1,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                lineHeight: 1.6,
                maxHeight: 200,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {pullLogs.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPullDialog(false)} disabled={pulling}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handlePullImage}
            disabled={pulling || !pullImage.trim()}
            startIcon={
              pulling ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DownloadIcon />
              )
            }
          >
            {pulling
              ? t("docker.pulling", "Pulling...")
              : t("docker.pull", "Pull")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{t("common.confirm", "Confirm Action")}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>
            {t(
              "docker.confirmRemove",
              "Are you sure you want to remove {{name}}?",
              { name: confirmDialog.name },
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (confirmDialog.action === "remove_container") {
                handleAction(confirmDialog.id, "remove");
              } else if (confirmDialog.action === "remove_image") {
                handleRemoveImage(confirmDialog.id);
              }
              setConfirmDialog({ ...confirmDialog, open: false });
            }}
          >
            {t("common.delete", "Delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Run Container Dialog */}
      <Dialog
        open={runDialog}
        onClose={() => setRunDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <PlayArrowIcon
            sx={{ mr: 1, verticalAlign: "middle" }}
            color="primary"
          />
          {t("dockerManager.runContainer", "Run Container:")}{runConfig.image}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
            <TextField
              label="Container Name (Optional)"
              value={runConfig.name}
              onChange={(e) =>
                setRunConfig({ ...runConfig, name: e.target.value })
              }
              fullWidth
            />

            <TextField
              select
              label="Restart Policy"
              value={runConfig.restartPolicy}
              onChange={(e) =>
                setRunConfig({ ...runConfig, restartPolicy: e.target.value })
              }
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="no">No</option>
              <option value="always">Always</option>
              <option value="on-failure">On Failure</option>
              <option value="unless-stopped">Unless Stopped</option>
            </TextField>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("dockerManager.portMappings", "Port Mappings")}</Typography>
              {runConfig.ports.map((port, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 2, mb: 1 }}>
                  <TextField
                    label="Host Port"
                    size="small"
                    value={port.hostPort}
                    onChange={(e) => {
                      const newPorts = [...runConfig.ports];
                      newPorts[idx].hostPort = e.target.value;
                      setRunConfig({ ...runConfig, ports: newPorts });
                    }}
                  />
                  <TextField
                    label="Container Port"
                    size="small"
                    value={port.containerPort}
                    onChange={(e) => {
                      const newPorts = [...runConfig.ports];
                      newPorts[idx].containerPort = e.target.value;
                      setRunConfig({ ...runConfig, ports: newPorts });
                    }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => {
                      const newPorts = runConfig.ports.filter(
                        (_, i) => i !== idx,
                      );
                      setRunConfig({ ...runConfig, ports: newPorts });
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                onClick={() =>
                  setRunConfig({
                    ...runConfig,
                    ports: [
                      ...runConfig.ports,
                      { hostPort: "", containerPort: "" },
                    ],
                  })
                }
              >
                {t("dockerManager.addPort", "+ Add Port")}</Button>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {t("dockerManager.environmentVariables", "Environment Variables")}</Typography>
              {runConfig.env.map((env, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 2, mb: 1 }}>
                  <TextField
                    label="Key"
                    size="small"
                    value={env.key}
                    onChange={(e) => {
                      const newEnv = [...runConfig.env];
                      newEnv[idx].key = e.target.value;
                      setRunConfig({ ...runConfig, env: newEnv });
                    }}
                  />
                  <TextField
                    label="Value"
                    size="small"
                    value={env.value}
                    fullWidth
                    onChange={(e) => {
                      const newEnv = [...runConfig.env];
                      newEnv[idx].value = e.target.value;
                      setRunConfig({ ...runConfig, env: newEnv });
                    }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => {
                      const newEnv = runConfig.env.filter((_, i) => i !== idx);
                      setRunConfig({ ...runConfig, env: newEnv });
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                onClick={() =>
                  setRunConfig({
                    ...runConfig,
                    env: [...runConfig.env, { key: "", value: "" }],
                  })
                }
              >
                {t("dockerManager.addEnvVar", "+ Add Env Var")}</Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRunDialog(false)}
            disabled={actionLoading === "running"}
          >
            {t("dockerManager.cancel", "Cancel")}</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRunContainer}
            disabled={actionLoading === "running"}
            startIcon={
              actionLoading === "running" ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PlayArrowIcon />
              )
            }
          >
            {t("dockerManager.run", "Run")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DockerManager;
