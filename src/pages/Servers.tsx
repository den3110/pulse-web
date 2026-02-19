import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  LinearProgress,
  Collapse,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PowerIcon from "@mui/icons-material/Power";
import DnsIcon from "@mui/icons-material/Dns";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import TerminalIcon from "@mui/icons-material/Terminal";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import Skeleton from "@mui/material/Skeleton";
import InputAdornment from "@mui/material/InputAdornment";
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
}

interface ServerStats {
  cpu: string;
  memory: { total: string; used: string; free: string; percent: string };
  disk: { total: string; used: string; free: string; percent: string };
  uptime: string;
  loadAvg: string;
}

const Servers: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, ServerStats>>({});
  const [statsLoading, setStatsLoading] = useState<Record<string, boolean>>({});
  const [expandedStats, setExpandedStats] = useState<Record<string, boolean>>(
    {},
  );
  const [confirmDelete, setConfirmDelete] = useState<Server | null>(null);
  const [form, setForm] = useState({
    name: "",
    host: "",
    port: 22,
    username: "root",
    authType: "password" as "password" | "key",
    password: "",
    privateKey: "",
  });

  // F4: Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "online" | "offline"
  >("all");

  const filteredServers = useMemo(
    () =>
      servers.filter((s) => {
        const matchSearch =
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.host.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === "all" || s.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [servers, searchQuery, statusFilter],
  );

  const fetchServers = useCallback(async () => {
    try {
      const { data } = await api.get("/servers");
      setServers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      name: "",
      host: "",
      port: 22,
      username: "root",
      authType: "password",
      password: "",
      privateKey: "",
    });
    setEditing(null);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);
  const openEdit = (s: Server) => {
    setForm({
      name: s.name,
      host: s.host,
      port: s.port,
      username: s.username,
      authType: s.authType,
      password: "",
      privateKey: "",
    });
    setEditing(s);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/servers/${editing._id}`, form);
        toast.success("Server updated!");
      } else {
        await api.post("/servers", form);
        toast.success("Server added!");
      }
      setShowModal(false);
      resetForm();
      fetchServers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/servers/${confirmDelete._id}`);
      toast.success("Deleted!");
      setConfirmDelete(null);
      fetchServers();
    } catch (error: any) {
      toast.error("Failed to delete server");
    }
  };

  const handleTest = useCallback(
    async (id: string) => {
      setTesting(id);
      try {
        const { data } = await api.post(`/servers/${id}/test`);
        data.success
          ? toast.success("Connected! 🎉")
          : toast.error(`Failed: ${data.message}`);
        fetchServers();
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Test failed");
      } finally {
        setTesting(null);
      }
    },
    [fetchServers],
  );

  const fetchStats = async (id: string) => {
    if (expandedStats[id]) {
      setExpandedStats((prev) => ({ ...prev, [id]: false }));
      return;
    }
    setStatsLoading((prev) => ({ ...prev, [id]: true }));
    setExpandedStats((prev) => ({ ...prev, [id]: true }));
    try {
      const { data } = await api.get(`/servers/${id}/stats`);
      setStatsMap((prev) => ({ ...prev, [id]: data }));
    } catch (error: any) {
      toast.error(
        `Failed to get stats: ${error.response?.data?.message || error.message}`,
      );
      setExpandedStats((prev) => ({ ...prev, [id]: false }));
    } finally {
      setStatsLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const parsePercent = useCallback(
    (s: string) => parseFloat(s.replace("%", "")) || 0,
    [],
  );

  if (loading)
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton
          variant="rectangular"
          height={40}
          sx={{ mb: 2, borderRadius: 1 }}
        />
        <Grid container spacing={2.5}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={i}>
              <Skeleton
                variant="rectangular"
                height={180}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );

  return (
    <Box>
      <SEO
        title={t("seo.servers.title")}
        description={t("seo.servers.description")}
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="body1" fontWeight={500}>
            {t("servers.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("servers.count", { count: servers.length })}
          </Typography>
        </Box>
        <Button
          id="add-server-btn"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          {t("servers.addServer")}
        </Button>
      </Box>

      {/* F4: Search & Filter Bar */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          mb: 2.5,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          placeholder={t("servers.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 220 }}
        />
        {["all", "online", "offline"].map((s) => (
          <Chip
            key={s}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            size="small"
            color={statusFilter === s ? "primary" : "default"}
            variant={statusFilter === s ? "filled" : "outlined"}
            onClick={() => setStatusFilter(s as any)}
          />
        ))}
      </Box>

      {filteredServers.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <DnsIcon sx={{ fontSize: 56, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {t("servers.noServers")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t("servers.addFirst")}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
            >
              {t("servers.addServer")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {filteredServers.map((server) => (
            <Grid key={server._id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card
                sx={{
                  height: "100%",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <DnsIcon sx={{ color: "primary.main" }} />
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            color: "primary.light",
                            textDecoration: "underline",
                          },
                          transition: "color 0.2s",
                        }}
                        onClick={() => navigate(`/servers/${server._id}`)}
                      >
                        {server.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={server.status}
                      size="small"
                      color={
                        server.status === "online"
                          ? "success"
                          : server.status === "offline"
                            ? "error"
                            : "default"
                      }
                      variant="outlined"
                    />
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: "text.secondary",
                      }}
                    >
                      {server.username}@{server.host}:{server.port}
                    </Typography>
                    <Tooltip title="Copy">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            `${server.username}@${server.host}`,
                          );
                          toast.success("Copied!");
                        }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {server.lastCheckedAt && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 2 }}
                    >
                      {t("serverDetail.lastChecked")}:{" "}
                      {new Date(server.lastCheckedAt).toLocaleString("vi-VN")}
                    </Typography>
                  )}

                  {/* Action buttons */}
                  <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={
                        testing === server._id ? (
                          <Skeleton variant="circular" width={14} height={14} />
                        ) : (
                          <PowerIcon />
                        )
                      }
                      onClick={() => handleTest(server._id)}
                      disabled={testing === server._id}
                    >
                      {t("servers.testConnection")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        statsLoading[server._id] ? (
                          <Skeleton variant="circular" width={14} height={14} />
                        ) : expandedStats[server._id] ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )
                      }
                      onClick={() => fetchStats(server._id)}
                      disabled={
                        statsLoading[server._id] || server.status === "offline"
                      }
                    >
                      {t("servers.stats")}
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => navigate(`/servers/${server._id}`)}
                    >
                      <TerminalIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => openEdit(server)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setConfirmDelete(server)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Stats Panel */}
                  <Collapse in={expandedStats[server._id]}>
                    {statsMap[server._id] && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          bgcolor: "rgba(0,0,0,0.2)",
                          borderRadius: 2,
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {/* CPU */}
                        <Box sx={{ mb: 1.5 }}>
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
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {statsMap[server._id].cpu}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={parsePercent(statsMap[server._id].cpu)}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: "rgba(255,255,255,0.05)",
                              "& .MuiLinearProgress-bar": {
                                bgcolor:
                                  parsePercent(statsMap[server._id].cpu) > 80
                                    ? "error.main"
                                    : "primary.main",
                              },
                            }}
                          />
                        </Box>
                        {/* RAM */}
                        <Box sx={{ mb: 1.5 }}>
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
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {statsMap[server._id].memory.used} /{" "}
                              {statsMap[server._id].memory.total} (
                              {statsMap[server._id].memory.percent})
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={parsePercent(
                              statsMap[server._id].memory.percent,
                            )}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: "rgba(255,255,255,0.05)",
                              "& .MuiLinearProgress-bar": {
                                bgcolor:
                                  parsePercent(
                                    statsMap[server._id].memory.percent,
                                  ) > 85
                                    ? "error.main"
                                    : "success.main",
                              },
                            }}
                          />
                        </Box>
                        {/* Disk */}
                        <Box sx={{ mb: 1.5 }}>
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
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {statsMap[server._id].disk.used} /{" "}
                              {statsMap[server._id].disk.total} (
                              {statsMap[server._id].disk.percent})
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={parsePercent(
                              statsMap[server._id].disk.percent,
                            )}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: "rgba(255,255,255,0.05)",
                              "& .MuiLinearProgress-bar": {
                                bgcolor: "warning.main",
                              },
                            }}
                          />
                        </Box>
                        {/* Uptime & Load */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            ⏱ {statsMap[server._id].uptime}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Load: {statsMap[server._id].loadAvg}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editing ? "Edit Server" : "Add Server"}</DialogTitle>
          <DialogContent sx={{ pt: "16px !important" }}>
            <TextField
              label="Server Name"
              placeholder="My VPS"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Host / IP"
                placeholder="192.168.1.100"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Paste from Clipboard">
                        <IconButton
                          edge="end"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) setForm({ ...form, host: text });
                            } catch (error) {
                              toast.error("Failed to read clipboard");
                            }
                          }}
                        >
                          <ContentPasteIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="SSH Port"
                type="number"
                value={form.port}
                onChange={(e) =>
                  setForm({ ...form, port: parseInt(e.target.value) })
                }
              />
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
                mb: 2,
              }}
            >
              <TextField
                label="Username"
                placeholder="root"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
              <FormControl fullWidth size="small">
                <InputLabel>Auth Type</InputLabel>
                <Select
                  value={form.authType}
                  label="Auth Type"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      authType: e.target.value as "password" | "key",
                    })
                  }
                >
                  <MenuItem value="password">Password</MenuItem>
                  <MenuItem value="key">SSH Key</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {form.authType === "password" ? (
              <TextField
                label="Password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            ) : (
              <TextField
                label="Private Key"
                multiline
                rows={4}
                placeholder="-----BEGIN RSA PRIVATE KEY-----"
                value={form.privateKey}
                onChange={(e) =>
                  setForm({ ...form, privateKey: e.target.value })
                }
                sx={{
                  "& textarea": {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  },
                }}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editing ? "Update" : "Add Server"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete Server</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{confirmDelete?.name}</strong> ({confirmDelete?.host})?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            This action cannot be undone. All associated projects may stop
            working.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Servers;
