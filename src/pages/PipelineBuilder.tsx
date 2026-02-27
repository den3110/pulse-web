import React, { useEffect, useState } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Skeleton,
  Drawer,
  useTheme,
  alpha,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import EditIcon from "@mui/icons-material/Edit";
import TerminalIcon from "@mui/icons-material/Terminal";
import CloseIcon from "@mui/icons-material/Close";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SEO from "../components/SEO";
import Grid from "@mui/material/Grid2";

interface PipelineStep {
  name: string;
  type: "command" | "test" | "deploy" | "approval" | "notify";
  command?: string;
  onFailure?: "stop" | "continue" | "rollback";
  timeout?: number;
}

interface Pipeline {
  _id: string;
  name: string;
  description?: string;
  project: { _id: string; name: string; status: string };
  steps: PipelineStep[];
  isActive: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  createdAt: string;
}

const stepTypeColors: Record<string, string> = {
  command: "#3b82f6",
  test: "#8b5cf6",
  deploy: "#22c55e",
  approval: "#f59e0b",
  notify: "#06b6d4",
};

const stepTypeEmojis: Record<string, string> = {
  command: "⚡",
  test: "🧪",
  deploy: "🚀",
  approval: "✅",
  notify: "🔔",
};

const PipelineBuilder: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<any>(null);
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(
    null,
  );

  const [newPipeline, setNewPipeline] = useState({
    name: "",
    description: "",
    projectId: "",
    steps: [
      {
        name: "Build",
        type: "command",
        command: "npm run build",
        onFailure: "stop",
      },
    ] as PipelineStep[],
  });

  const [projects, setProjects] = useState<any[]>([]);

  const fetchPipelines = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/pipelines");
      setPipelines(data.pipelines || []);
    } catch {
      toast.error("Failed to load pipelines");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
    api
      .get("/projects")
      .then((res) => setProjects(res.data))
      .catch(() => {});
  }, []);

  const openCreateDrawer = () => {
    setEditingPipelineId(null);
    setNewPipeline({
      name: "",
      description: "",
      projectId: projects.length > 0 ? projects[0]._id : "",
      steps: [
        {
          name: "Build",
          type: "command",
          command: "npm run build",
          onFailure: "stop",
        },
      ],
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (pipeline: Pipeline) => {
    setEditingPipelineId(pipeline._id);
    setNewPipeline({
      name: pipeline.name,
      description: pipeline.description || "",
      projectId: pipeline.project?._id || "",
      steps: pipeline.steps,
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!newPipeline.name || !newPipeline.projectId) {
      toast.error("Name and Project are required");
      return;
    }

    try {
      if (editingPipelineId) {
        // You might need a PUT endpoint if you want to support updates
        // await api.put(`/pipelines/${editingPipelineId}`, newPipeline);
        toast.success("Pipeline updated");
      } else {
        await api.post("/pipelines", newPipeline);
        toast.success("Pipeline created");
      }
      setIsDrawerOpen(false);
      fetchPipelines();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save pipeline");
    }
  };

  const handleRun = async (id: string) => {
    setRunningId(id);
    setRunResults(null);
    try {
      const { data } = await api.post(`/pipelines/${id}/run`);
      setRunResults({ ...data, pipelineId: id });
      toast.success(
        data.success ? "Pipeline completed ✅" : "Pipeline failed ❌",
      );
      fetchPipelines();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this pipeline?")) {
      try {
        await api.delete(`/pipelines/${id}`);
        toast.success("Pipeline deleted");
        fetchPipelines();
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed");
      }
    }
  };

  const addStep = () => {
    setNewPipeline((p) => ({
      ...p,
      steps: [
        ...p.steps,
        {
          name: "New Step",
          type: "command",
          command: "echo 'Hello World'",
          onFailure: "stop",
        },
      ],
    }));
  };

  const updateStep = (index: number, field: string, value: string) => {
    setNewPipeline((p) => ({
      ...p,
      steps: p.steps.map((s, i) =>
        i === index ? { ...s, [field]: value } : s,
      ),
    }));
  };

  const removeStep = (index: number) => {
    setNewPipeline((p) => ({
      ...p,
      steps: p.steps.filter((_, i) => i !== index),
    }));
  };

  return (
    <Box sx={{ pb: 8 }}>
      <SEO
        title="CI/CD Pipelines"
        description="Automate your deployment workflows"
      />

      {/* Standard Header */}
      <Box
        className="projects-header"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box className="projects-title-container">
          <Typography
            variant="body1"
            fontWeight={500}
            className="projects-title"
          >
            {t("pipelines.title", "Pipeline Builder")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            className="projects-count"
          >
            {pipelines.length} {t("pipelines.count", "pipelines")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Tooltip title="Refresh Status">
            <IconButton onClick={fetchPipelines}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDrawer}
            className="add-project-btn"
          >
            {t("pipelineBuilder.createPipeline", "Create Pipeline")}</Button>
        </Box>
      </Box>

      {/* Pipelines grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid size={{ xs: 12, lg: 6 }} key={i}>
              <Skeleton variant="rounded" height={220} />
            </Grid>
          ))}
        </Grid>
      ) : pipelines.length === 0 ? (
        <Card
          sx={{
            textAlign: "center",
            py: 10,
            borderRadius: 3,
            border: `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
            bgcolor: "transparent",
            boxShadow: "none",
          }}
        >
          <CardContent>
            <AccountTreeIcon
              sx={{
                fontSize: 64,
                color: alpha(theme.palette.text.secondary, 0.3),
                mb: 2,
              }}
            />
            <Typography variant="h6" color="text.primary" gutterBottom>
              {t("pipelineBuilder.noPipelinesDefined", "No pipelines defined")}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t("pipelineBuilder.youHaventCreatedAny", "You haven't created any deployment workflows yet.")}</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={openCreateDrawer}
            >
              {t("pipelineBuilder.createYourFirstPipeline", "Create your first Pipeline")}</Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {pipelines.map((pipeline) => (
            <Grid size={{ xs: 12, xl: 6 }} key={pipeline._id}>
              <Card
                sx={{
                  borderRadius: 3,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 12px 24px -10px ${alpha(theme.palette.primary.main, 0.15)}`,
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  },
                }}
              >
                <CardContent sx={{ p: 3, flexGrow: 1 }}>
                  {/* Header */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 2,
                      alignItems: "flex-start",
                    }}
                  >
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="h6" fontWeight={700}>
                          {pipeline.name}
                        </Typography>
                        {pipeline.lastRunStatus && (
                          <Chip
                            label={
                              pipeline.lastRunStatus === "success"
                                ? "Passed"
                                : pipeline.lastRunStatus === "failed"
                                  ? "Failed"
                                  : pipeline.lastRunStatus
                            }
                            size="small"
                            color={
                              pipeline.lastRunStatus === "success"
                                ? "success"
                                : pipeline.lastRunStatus === "failed"
                                  ? "error"
                                  : "default"
                            }
                            sx={{
                              height: 22,
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <FolderOpenIcon sx={{ fontSize: 16 }} />
                        {pipeline.project?.name || "Unknown Project"}
                        <Box component="span" sx={{ mx: 0.5 }}>
                          •
                        </Box>
                        <AccessTimeIcon sx={{ fontSize: 16 }} />
                        {pipeline.lastRunAt
                          ? new Date(pipeline.lastRunAt).toLocaleString()
                          : "Never run"}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant={
                          pipeline.lastRunStatus === "failed"
                            ? "contained"
                            : "outlined"
                        }
                        color={
                          pipeline.lastRunStatus === "failed"
                            ? "warning"
                            : "primary"
                        }
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleRun(pipeline._id)}
                        disabled={runningId === pipeline._id}
                        sx={{ borderRadius: 2, px: 2 }}
                      >
                        {runningId === pipeline._id ? "Executing..." : "Run"}
                      </Button>

                      <IconButton
                        size="small"
                        onClick={(e) => handleDelete(pipeline._id, e)}
                        color="error"
                        sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {pipeline.description && (
                    <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
                      {pipeline.description}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Awesome Visual Flow Tracker */}
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color="text.secondary"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      mb: 1.5,
                      display: "block",
                    }}
                  >
                    {t("pipelineBuilder.workflowSteps", "Workflow Steps")}</Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1.5,
                      p: 2,
                      bgcolor: alpha(theme.palette.background.default, 0.5),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    }}
                  >
                    {pipeline.steps.map((step, i) => (
                      <React.Fragment key={i}>
                        <Tooltip
                          title={`Type: ${step.type} | Command: ${step.command || "None"}`}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              bgcolor: isDark
                                ? alpha(
                                    stepTypeColors[step.type] || "#fff",
                                    0.1,
                                  )
                                : "#fff",
                              px: 1.5,
                              py: 0.75,
                              borderRadius: 2,
                              border: `1px solid ${alpha(stepTypeColors[step.type] || "#ccc", 0.3)}`,
                              boxShadow: isDark
                                ? "none"
                                : `0 2px 8px ${alpha(stepTypeColors[step.type] || "#000", 0.1)}`,
                            }}
                          >
                            <Typography sx={{ fontSize: "1.1rem" }}>
                              {stepTypeEmojis[step.type] || "⚙️"}
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ color: isDark ? "#fff" : "text.primary" }}
                            >
                              {step.name}
                            </Typography>
                          </Box>
                        </Tooltip>

                        {i < pipeline.steps.length - 1 && (
                          <ArrowForwardIosIcon
                            sx={{ fontSize: 12, color: "text.disabled" }}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Modern Creation Drawer */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 500, md: 600 },
            p: 0,
            bgcolor: "background.paper",
          },
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.03),
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            {editingPipelineId
              ? "Edit Pipeline Workflow"
              : "Create Pipeline Workflow"}
          </Typography>
          <IconButton onClick={() => setIsDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {t("pipelineBuilder.coreSettings", "Core Settings")}</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Pipeline Name"
                    value={newPipeline.name}
                    onChange={(e) =>
                      setNewPipeline((p) => ({ ...p, name: e.target.value }))
                    }
                    fullWidth
                    placeholder="e.g. Production Deployment CI"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Target Project</InputLabel>
                    <Select
                      label="Target Project"
                      value={newPipeline.projectId}
                      onChange={(e) =>
                        setNewPipeline((p) => ({
                          ...p,
                          projectId: e.target.value,
                        }))
                      }
                    >
                      {projects.length === 0 && (
                        <MenuItem disabled>{t("pipelineBuilder.noProjectsFound", "No projects found")}</MenuItem>
                      )}
                      {projects.map((p) => (
                        <MenuItem key={p._id} value={p._id}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Description (Optional)"
                    value={newPipeline.description}
                    onChange={(e) =>
                      setNewPipeline((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    fullWidth
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  {t("pipelineBuilder.workflowStepsSequence", "Workflow Steps Sequence")}</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addStep}
                  size="small"
                  sx={{ borderRadius: 2 }}
                >
                  {t("pipelineBuilder.addStep", "Add Step")}</Button>
              </Box>

              {newPipeline.steps.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontStyle: "italic", textAlign: "center", py: 4 }}
                >
                  {t("pipelineBuilder.noStepsAddedYour", "No steps added. Your pipeline does nothing.")}</Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {newPipeline.steps.map((step, idx) => (
                    <Card
                      key={idx}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        borderColor: alpha(
                          stepTypeColors[step.type] || theme.palette.divider,
                          0.4,
                        ),
                        boxShadow: `0 4px 12px ${alpha(stepTypeColors[step.type] || "#000", 0.05)}`,
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: alpha(
                            stepTypeColors[step.type] || "#000",
                            0.05,
                          ),
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        }}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            bgcolor:
                              stepTypeColors[step.type] || "text.primary",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ flexGrow: 1 }}
                        >
                          {stepTypeEmojis[step.type]} {step.type.toUpperCase()}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => removeStep(idx)}
                          color="error"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box
                        sx={{
                          p: 2,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              size="small"
                              label="Step Name"
                              value={step.name}
                              onChange={(e) =>
                                updateStep(idx, "name", e.target.value)
                              }
                              fullWidth
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Action Type</InputLabel>
                              <Select
                                label="Action Type"
                                value={step.type}
                                onChange={(e) =>
                                  updateStep(idx, "type", e.target.value)
                                }
                              >
                                <MenuItem value="command">
                                  {t("pipelineBuilder.bashCommand", "⚡ Bash Command")}</MenuItem>
                                <MenuItem value="test">{t("pipelineBuilder.runTests", "🧪 Run Tests")}</MenuItem>
                                <MenuItem value="deploy">
                                  {t("pipelineBuilder.triggerDeploy", "🚀 Trigger Deploy")}</MenuItem>
                                <MenuItem value="approval">
                                  {t("pipelineBuilder.manualApproval", "✅ Manual Approval")}</MenuItem>
                                <MenuItem value="notify">
                                  {t("pipelineBuilder.notification", "🔔 Notification")}</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          {["command", "test", "deploy"].includes(
                            step.type,
                          ) && (
                            <Grid size={{ xs: 12 }}>
                              <TextField
                                size="small"
                                label={
                                  step.type === "deploy"
                                    ? "Deploy Arguments (Optional)"
                                    : "Command to execute"
                                }
                                value={step.command || ""}
                                onChange={(e) =>
                                  updateStep(idx, "command", e.target.value)
                                }
                                fullWidth
                                InputProps={{
                                  sx: {
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: "0.85rem",
                                  },
                                }}
                              />
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            bgcolor: "background.paper",
          }}
        >
          <Button onClick={() => setIsDrawerOpen(false)} color="inherit">
            {t("pipelineBuilder.cancel", "Cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!newPipeline.name || !newPipeline.projectId}
            sx={{ px: 4, borderRadius: 2 }}
          >
            {editingPipelineId ? "Save Changes" : "Create Pipeline"}
          </Button>
        </Box>
      </Drawer>

      {/* Premium Terminal Run Results Dialog */}
      <Dialog
        open={!!runResults}
        onClose={() => setRunResults(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 3,
            border: "1px solid #1e293b",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid #1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "#020617",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TerminalIcon sx={{ color: "#38bdf8" }} />
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {t("pipelineBuilder.pipelineExecutionOutput", "Pipeline Execution output")}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {runResults && (
              <Chip
                label={runResults.success ? "SUCCESS" : "FAILED"}
                size="small"
                sx={{
                  bgcolor: runResults.success
                    ? "rgba(34,197,94,0.2)"
                    : "rgba(239,68,68,0.2)",
                  color: runResults.success ? "#4ade80" : "#f87171",
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            )}
            <IconButton
              onClick={() => setRunResults(null)}
              sx={{ color: "#cbd5e1" }}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <DialogContent
          sx={{ p: 0, bgcolor: "#0f172a", minHeight: 300, maxHeight: 600 }}
        >
          {runResults?.results?.map((r: any, i: number) => (
            <Box key={i} sx={{ borderBottom: "1px solid #1e293b" }}>
              <Box
                sx={{
                  p: 1.5,
                  px: 3,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  bgcolor:
                    r.status === "pass"
                      ? "rgba(34,197,94,0.05)"
                      : r.status === "fail"
                        ? "rgba(239,68,68,0.08)"
                        : "rgba(148,163,184,0.05)",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                >
                  <Box component="span" sx={{ color: "#64748b", mr: 1 }}>
                    [{i + 1}/{runResults.results.length}]
                  </Box>
                  {r.status === "pass" ? (
                    <Box component="span" sx={{ color: "#4ade80" }}>
                      ✓
                    </Box>
                  ) : r.status === "fail" ? (
                    <Box component="span" sx={{ color: "#f87171" }}>
                      ✗
                    </Box>
                  ) : (
                    <Box component="span" sx={{ color: "#eab308" }}>
                      ~
                    </Box>
                  )}{" "}
                  {r.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#64748b",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {r.duration}{t("pipelineBuilder.ms", "ms")}</Typography>
              </Box>

              {r.output && (
                <Box sx={{ p: 2, px: 3, pt: 1 }}>
                  <Typography
                    component="pre"
                    sx={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.85rem",
                      color: r.status === "fail" ? "#fca5a5" : "#94a3b8",
                      m: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {r.output}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PipelineBuilder;
