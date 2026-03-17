import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
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
  IconButton,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import FolderIcon from "@mui/icons-material/Folder";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import SearchIcon from "@mui/icons-material/Search";
import Skeleton from "@mui/material/Skeleton";
import InputAdornment from "@mui/material/InputAdornment";
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

import SEO from "../components/SEO";
import ProjectCard, {
  type Project,
  type Server,
} from "../components/ProjectCard";
import ProjectFormDrawer from "../components/ProjectFormDrawer";
import { useThemeMode } from "../contexts/ThemeContext";
import EndUserSites from "./EndUserSites";

interface SortableProjectGridItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableProjectGridItem = memo(function SortableProjectGridItem({
  id,
  children,
}: SortableProjectGridItemProps) {
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
    zIndex: isDragging ? 999 : ("auto" as any),
  };

  return (
    <Grid
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      size={{ xs: 12, sm: 6, lg: 4 }}
      className="project-grid-item"
    >
      {children}
    </Grid>
  );
});

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();
  const { interfaceMode } = useThemeMode();

  const [projects, setProjects] = useState<Project[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  // Check URL params for ?add=true from Command Palette
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("add") === "true") {
      setEditing(null);
      setShowModal(true);
      // Clean up the URL
      navigate("/projects", { replace: true });
    }
  }, [location.search, navigate]);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmStop, setConfirmStop] = useState<Project | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, string>>(
    {},
  );

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredProjects = useMemo(
    () =>
      projects.filter((p) => {
        const matchSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.server?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === "all" || p.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [projects, searchQuery, statusFilter],
  );

  const fetchData = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api.get("/projects"),
        api.get("/servers"),
      ]);
      setProjects(p.data);
      setServers(s.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

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

    if (active.id !== over?.id) {
      setProjects((items) => {
        const oldIndex = items.findIndex((item) => item._id === active.id);
        const newIndex = items.findIndex((item) => item._id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        const ids = newItems.map((p) => p._id);
        api.reorderProjects(ids).catch((err) => {
          console.error("Failed to reorder projects", err);
          toast.error(t("common.reorderFailed") || "Reorder failed");
          fetchData();
        });
        return newItems;
      });
    }
  };

  // Socket.io integration for realtime updates
  useEffect(() => {
    let socket: any;

    const setupSocket = async () => {
      try {
        const { connectSocket } = await import("../services/socket");
        socket = await connectSocket();

        projects.forEach((p) => {
          socket.emit("join:project", p._id);
        });

        socket.on("deployment:status", (data: any) => {
          if (data.projectId) {
            setProjects((prev) =>
              prev.map((p) =>
                p._id === data.projectId
                  ? {
                      ...p,
                      status: data.status,
                      lastDeployedAt:
                        data.timestamp || new Date().toISOString(),
                    }
                  : p,
              ),
            );

            if (
              ["running", "stopped", "failed", "success"].includes(data.status)
            ) {
              fetchData();
            }
          }
        });
      } catch (err) {
        console.error("Socket setup failed", err);
      }
    };

    if (projects.length > 0) {
      setupSocket();
    }

    return () => {
      if (socket) {
        socket.off("deployment:status");
      }
    };
  }, [projects.length]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((p: Project) => {
    setEditing(p);
    setShowModal(true);
  }, []);

  // End-user mode: render simplified sites view (MUST be after all hooks)
  if (interfaceMode === "enduser") {
    return <EndUserSites />;
  }

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/projects/${confirmDelete._id}`, {
        data: { password: deletePassword },
      });
      toast.success("Deleted!");
      setConfirmDelete(null);
      setDeletePassword("");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete project");
    }
  };

  const handleDeploy = useCallback(
    async (projectId: string) => {
      try {
        await api.post(`/deployments/${projectId}/deploy`);
        toast.success("Deployment started! 🚀");
        navigate(`/projects/${projectId}/deploy`);
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Deploy failed");
      }
    },
    [navigate],
  );

  const handleToggleSecret = useCallback(
    async (projectId: string) => {
      if (visibleSecrets[projectId]) {
        setVisibleSecrets((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
        return;
      }
      try {
        const { data } = await api.get(`/projects/${projectId}/webhook-url`);
        setVisibleSecrets((prev) => ({
          ...prev,
          [projectId]: data.webhookSecret,
        }));
      } catch {
        toast.error("Failed to get webhook secret");
      }
    },
    [visibleSecrets],
  );

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
        title={t("seo.projects.title")}
        description={t("seo.projects.description")}
      />

      {/* Header */}
      <Box
        className="projects-header"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 4,
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box className="projects-title-container">
          <Typography
            variant="h4"
            fontWeight={800}
            className="projects-title"
            sx={{
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(to right, #fff, #a0a0a0)"
                  : "linear-gradient(to right, #000, #444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
              mb: 0.5,
            }}
          >
            {t("projects.title")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            className="projects-count"
            sx={{ fontWeight: 500 }}
          >
            {t("projects.count", { count: projects.length })}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          className="add-project-btn"
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            textTransform: "none",
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(var(--primary-main-channel), 0.2)",
            "&:hover": {
              boxShadow: "0 6px 16px rgba(var(--primary-main-channel), 0.3)",
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s",
          }}
        >
          {t("projects.addProject")}
        </Button>
      </Box>

      {/* Search & Filter Bar */}
      <Box
        className="projects-filter-bar"
        sx={{
          display: "flex",
          gap: 1.5,
          mb: 4,
          flexWrap: "wrap",
          alignItems: "center",
          p: 2,
          borderRadius: 4,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
              : "rgba(255,255,255,0.5)",
          backdropFilter: "blur(20px)",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.05)",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 4px 20px rgba(0,0,0,0.2)"
              : "0 4px 20px rgba(0,0,0,0.03)",
        }}
      >
        <TextField
          className="projects-search-input"
          autoComplete="off"
          size="small"
          placeholder={t("projects.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(0,0,0,0.2)"
                  : "rgba(255,255,255,0.8)",
              "& fieldset": { border: "none" },
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
            },
          }}
          sx={{ minWidth: { xs: "100%", sm: 280 } }}
        />

        <Box
          sx={{
            width: "1px",
            height: 28,
            bgcolor: "divider",
            mx: 1,
            display: { xs: "none", sm: "block" },
          }}
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flex: 1 }}>
          {["all", "running", "stopped", "failed", "idle"].map((s) => (
            <Chip
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              size="small"
              onClick={() => setStatusFilter(s)}
              className={`filter-chip filter-${s}`}
              sx={{
                fontWeight: 600,
                borderRadius: 2,
                px: 1,
                py: 2,
                cursor: "pointer",
                transition: "all 0.2s",
                border: "1px solid",
                borderColor:
                  statusFilter === s ? "primary.main" : "transparent",
                bgcolor:
                  statusFilter === s
                    ? "rgba(var(--primary-main-channel), 0.1)"
                    : (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.04)",
                color: statusFilter === s ? "primary.main" : "text.secondary",
                "&:hover": {
                  bgcolor:
                    statusFilter === s
                      ? "rgba(var(--primary-main-channel), 0.15)"
                      : (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.08)",
                  transform: "translateY(-1px)",
                },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <Card
          className="no-projects-card"
          sx={{
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
                : "linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px dashed",
            borderColor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.15)"
                : "rgba(0,0,0,0.15)",
            borderRadius: 4,
            boxShadow: "none",
          }}
        >
          <CardContent sx={{ textAlign: "center", py: 10 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 3,
              }}
            >
              <FolderIcon
                sx={{ fontSize: 40, color: "text.disabled" }}
                className="no-projects-icon"
              />
            </Box>
            <Typography
              variant="h5"
              fontWeight={600}
              gutterBottom
              className="no-projects-title"
            >
              {t("projects.noProjects")}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 400, mx: "auto" }}
              className="no-projects-desc"
            >
              {t("projects.addFirst")}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              className="add-project-btn-empty"
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(var(--primary-main-channel), 0.2)",
              }}
            >
              {t("projects.addProject")}
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
            items={filteredProjects.map((p) => p._id)}
            strategy={rectSortingStrategy}
          >
            <Grid
              container
              spacing={{ xs: 2, md: 2.5 }}
              className="projects-grid"
            >
              {filteredProjects.map((project) => (
                <SortableProjectGridItem key={project._id} id={project._id}>
                  <ProjectCard
                    project={project}
                    visibleSecret={visibleSecrets[project._id]}
                    onEdit={openEdit}
                    onDelete={setConfirmDelete}
                    onStop={setConfirmStop}
                    onDeploy={handleDeploy}
                    onToggleSecret={handleToggleSecret}
                  />
                </SortableProjectGridItem>
              ))}
            </Grid>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit Project Drawer — form state is fully local inside this component */}
      <ProjectFormDrawer
        open={showModal}
        editing={editing}
        servers={servers}
        onClose={() => setShowModal(false)}
        onSaved={fetchData}
      />

      {/* Confirm Delete Dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => {
          setConfirmDelete(null);
          setDeletePassword("");
        }}
        className="delete-dialog"
      >
        <DialogTitle className="delete-dialog-title">
          {t("projects.deleteProject")}
        </DialogTitle>
        <DialogContent className="delete-dialog-content">
          <Typography>
            {t("projects.deleteConfirm", { name: confirmDelete?.name })}
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {t("projects.deleteWarning")}
          </Typography>
          <TextField
            label="Enter password to confirm"
            type="password"
            autoComplete="new-password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            fullWidth
            autoFocus
            size="small"
            sx={{ mt: 2 }}
            className="input-delete-password"
          />
        </DialogContent>
        <DialogActions className="delete-dialog-actions">
          <Button
            onClick={() => {
              setConfirmDelete(null);
              setDeletePassword("");
            }}
            className="btn-cancel-delete"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={!deletePassword}
            startIcon={<DeleteForeverIcon />}
            className="btn-confirm-delete"
          >
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Stop Dialog */}
      <Dialog
        open={!!confirmStop}
        onClose={() => setConfirmStop(null)}
        className="stop-dialog"
      >
        <DialogTitle className="stop-dialog-title">
          {t("projects.stopProject")}
        </DialogTitle>
        <DialogContent className="stop-dialog-content">
          <Typography>
            {t("projects.stopConfirm", { name: confirmStop?.name })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("projects.stopWarning")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }} className="stop-dialog-actions">
          <Button
            onClick={() => setConfirmStop(null)}
            className="btn-cancel-stop"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!confirmStop) return;
              try {
                await api.post(`/deployments/${confirmStop._id}/stop`);
                toast.success("Stopped");
                fetchData();
              } catch (err: any) {
                toast.error(err.response?.data?.message || "Stop failed");
              }
              setConfirmStop(null);
            }}
            className="btn-confirm-stop"
          >
            {t("common.stop")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Projects;
