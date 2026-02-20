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
  Menu,
  CircularProgress,
  Tooltip,
  LinearProgress,
  Collapse,
} from "@mui/material";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import ComputerIcon from "@mui/icons-material/Computer";
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
import Drawer from "@mui/material/Drawer";
import Skeleton from "@mui/material/Skeleton";
import InputAdornment from "@mui/material/InputAdornment";
import { useTheme } from "@mui/material/styles";
import { useServer, Server } from "../contexts/ServerContext";
import SEO from "../components/SEO";

interface ServerStats {
  cpu: string;
  memory: { total: string; used: string; free: string; percent: string };
  disk: { total: string; used: string; free: string; percent: string };
  uptime: string;
  loadAvg: string;
}

interface SortableServerGridItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableServerGridItem({ id, children }: SortableServerGridItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  return (
    <Grid
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      size={{ xs: 12, sm: 6, lg: 4 }}
    >
      {children}
    </Grid>
  );
}

const Servers: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // const theme = useTheme(); // This line was commented out or missing context, assuming it's not needed for this change.
  // Server state from context
  // Assuming useServer is a custom hook that provides server context
  const {
    servers: contextServers,
    loading,
    refreshServers,
    setServers: setContextServers,
  } = useServer();

  // Local state for DnD
  const [servers, setServers] = useState<Server[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Sync local state with context when context updates
  useEffect(() => {
    setServers(contextServers);
  }, [contextServers]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);

    if (active.id !== over?.id) {
      setServers((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Optimistic update
        setContextServers(newItems);

        // Persist to backend
        const ids = newItems.map((s) => s._id);
        api.reorderServers(ids).catch((err) => {
          console.error("Failed to reorder servers:", err);
          toast.error(t("common.reorderFailed"));
          refreshServers(); // Revert on failure
        });

        return newItems;
      });
    }
  };

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

  // Removed local fetchServers and useEffect since we sync with context

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
      refreshServers();
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
      refreshServers();
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
        refreshServers();
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Test failed");
      } finally {
        setTesting(null);
      }
    },
    [refreshServers],
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
      setStatsMap((prev) => ({ ...prev, [id]: data.stats || data }));
    } catch (error: any) {
      toast.error(
        `Failed to get stats: ${error.response?.data?.message || error.message}`,
      );
      setExpandedStats((prev) => ({ ...prev, [id]: false }));
    } finally {
      setStatsLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const parsePercent = useCallback((s: string | number | undefined | null) => {
    if (!s) return 0;
    const str = String(s);
    return parseFloat(str.replace("%", "")) || 0;
  }, []);

  if (loading)
    return (
      <Box sx={{ p: 0 }}>
        <Skeleton
          variant="rectangular"
          height={40}
          width="100%"
          sx={{ mb: 3, borderRadius: 1, maxWidth: 300 }}
        />
        <Grid container spacing={2.5}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={i}>
              <Card variant="outlined" sx={{ height: "100%", p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box>
                      <Skeleton variant="text" width={120} height={24} />
                      <Skeleton variant="text" width={80} height={16} />
                    </Box>
                  </Box>
                  <Skeleton variant="circular" width={24} height={24} />
                </Box>
                <Skeleton
                  variant="rectangular"
                  height={60}
                  sx={{ mb: 2, borderRadius: 1 }}
                />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Skeleton variant="text" width={60} height={20} />
                  <Skeleton variant="text" width={60} height={20} />
                  <Skeleton variant="text" width={60} height={20} />
                </Box>
              </Card>
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
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          mb: 3,
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box>
          <Typography variant="body1" fontWeight={500}>
            {t("servers.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("servers.subtitle")}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredServers.map((s) => s._id)}
            strategy={rectSortingStrategy}
          >
            <Grid container spacing={2.5}>
              {filteredServers.map((server) => (
                <SortableServerGridItem key={server._id} id={server._id}>
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
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
                          {new Date(server.lastCheckedAt).toLocaleString(
                            "vi-VN",
                          )}
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
                              <CircularProgress size={16} color="inherit" />
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
                              <CircularProgress size={16} color="inherit" />
                            ) : expandedStats[server._id] ? (
                              <ExpandLessIcon />
                            ) : (
                              <ExpandMoreIcon />
                            )
                          }
                          onClick={() => fetchStats(server._id)}
                          disabled={
                            statsLoading[server._id] ||
                            server.status === "offline"
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
                        <IconButton
                          size="small"
                          onClick={() => openEdit(server)}
                        >
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
                                  {statsMap[server._id]?.cpu || "0%"}
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={parsePercent(statsMap[server._id]?.cpu)}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: "rgba(255,255,255,0.05)",
                                  "& .MuiLinearProgress-bar": {
                                    bgcolor:
                                      parsePercent(statsMap[server._id]?.cpu) >
                                      80
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
                                  {statsMap[server._id]?.memory?.used || "?"} /{" "}
                                  {statsMap[server._id]?.memory?.total || "?"} (
                                  {statsMap[server._id]?.memory?.percent ||
                                    "0%"}
                                  )
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={parsePercent(
                                  statsMap[server._id]?.memory?.percent,
                                )}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: "rgba(255,255,255,0.05)",
                                  "& .MuiLinearProgress-bar": {
                                    bgcolor:
                                      parsePercent(
                                        statsMap[server._id]?.memory?.percent,
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
                                  {statsMap[server._id]?.disk?.used || "?"} /{" "}
                                  {statsMap[server._id]?.disk?.total || "?"} (
                                  {statsMap[server._id]?.disk?.percent || "0%"})
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={parsePercent(
                                  statsMap[server._id]?.disk?.percent,
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
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                ⏱ {statsMap[server._id]?.uptime || "?"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Load: {statsMap[server._id]?.loadAvg || "?"}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Collapse>
                    </CardContent>
                  </Card>
                </SortableServerGridItem>
              ))}
            </Grid>
          </SortableContext>
        </DndContext>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        open={showModal}
        onClose={() => setShowModal(false)}
        anchor="right"
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ width: { xs: "100%", sm: 400 }, p: 3, pt: 4 }}
          role="presentation"
        >
          <Typography variant="h6" gutterBottom>
            {editing ? t("servers.editServer") : t("servers.addServer")}
          </Typography>

          <TextField
            label={t("common.name")}
            placeholder="My VPS"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            fullWidth
            sx={{ mb: 2.5, mt: 1 }}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mb: 2.5,
            }}
          >
            <TextField
              label={t("servers.host")}
              placeholder="192.168.1.100"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={t("common.paste") || "Paste"}>
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
              label={t("servers.port")}
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
              mb: 2.5,
            }}
          >
            <TextField
              label={t("servers.username")}
              placeholder="root"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>{t("servers.authType")}</InputLabel>
              <Select
                value={form.authType}
                label={t("servers.authType")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    authType: e.target.value as "password" | "key",
                  })
                }
              >
                <MenuItem value="password">{t("servers.password")}</MenuItem>
                <MenuItem value="key">{t("servers.privateKey")}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {form.authType === "password" ? (
            <TextField
              label={t("servers.password")}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              sx={{ mb: 3 }}
            />
          ) : (
            <TextField
              label={t("servers.privateKey")}
              multiline
              rows={8}
              placeholder="-----BEGIN RSA PRIVATE KEY-----"
              value={form.privateKey}
              onChange={(e) => setForm({ ...form, privateKey: e.target.value })}
              fullWidth
              sx={{
                mb: 3,
                "& textarea": {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                },
              }}
            />
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button onClick={() => setShowModal(false)} variant="outlined">
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained">
              {editing ? t("common.update") : t("common.add")}
            </Button>
          </Box>
        </Box>
      </Drawer>

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
