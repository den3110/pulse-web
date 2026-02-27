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
  Tabs,
  Tab,
  Skeleton,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SEO from "../components/SEO";

interface Approval {
  _id: string;
  title: string;
  description?: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: { _id: string; username: string; email: string };
  reviewedBy?: { _id: string; username: string };
  reviewedAt?: string;
  reviewComment?: string;
  project: { _id: string; name: string };
  createdAt: string;
}

const statusConfig: Record<
  string,
  {
    color: "warning" | "success" | "error";
    icon: React.ReactElement;
    label: string;
  }
> = {
  pending: {
    color: "warning",
    icon: <HourglassEmptyIcon fontSize="small" />,
    label: "Pending",
  },
  approved: {
    color: "success",
    icon: <CheckCircleIcon fontSize="small" />,
    label: "Approved",
  },
  rejected: {
    color: "error",
    icon: <CancelIcon fontSize="small" />,
    label: "Rejected",
  },
};

const typeColors: Record<string, string> = {
  deploy: "#3b82f6",
  config_change: "#8b5cf6",
  rollback: "#f59e0b",
  delete: "#ef4444",
};

const ApprovalCenter: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [createDialog, setCreateDialog] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    id: string;
    action: string;
  }>({ open: false, id: "", action: "" });
  const [reviewComment, setReviewComment] = useState("");
  const [newApproval, setNewApproval] = useState({
    title: "",
    description: "",
    type: "deploy",
    projectId: "",
  });
  const [projects, setProjects] = useState<any[]>([]);

  const statuses = ["all", "pending", "approved", "rejected"];
  const currentStatus = statuses[tab];

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/approvals?status=${currentStatus}`);
      setApprovals(data.approvals || []);
    } catch {
      toast.error("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [tab]);

  useEffect(() => {
    api
      .get("/projects")
      .then((res) => setProjects(res.data))
      .catch(() => {});
  }, []);

  const handleCreateApproval = async () => {
    if (!newApproval.title || !newApproval.projectId) return;
    try {
      await api.post("/approvals", newApproval);
      toast.success("Approval request created");
      setCreateDialog(false);
      setNewApproval({
        title: "",
        description: "",
        type: "deploy",
        projectId: "",
      });
      fetchApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const handleReview = async () => {
    try {
      await api.post(`/approvals/${reviewDialog.id}/review`, {
        action: reviewDialog.action,
        comment: reviewComment,
      });
      toast.success(
        reviewDialog.action === "approve" ? "Approved ✅" : "Rejected ❌",
      );
      setReviewDialog({ open: false, id: "", action: "" });
      setReviewComment("");
      fetchApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/approvals/${id}`);
      toast.success("Deleted");
      fetchApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  return (
    <Box>
      <SEO title="Approvals" description="Deployment Approval Center" />

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
            ✅ {t("approvals.title", "Approval Center")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              "approvals.subtitle",
              "Review and manage deployment approval requests",
            )}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
            size="small"
          >
            {t("approvals.newRequest", "New Request")}
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchApprovals} size="small">
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
        <Tab label="All" />
        <Tab
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              Pending
              <Chip
                label={approvals.filter((a) => a.status === "pending").length}
                size="small"
                color="warning"
                sx={{ height: 18, fontSize: 10 }}
              />
            </Box>
          }
        />
        <Tab label="Approved" />
        <Tab label="Rejected" />
      </Tabs>

      {/* List */}
      {loading ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1.5 }} />
          ))}
        </Box>
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <HourglassEmptyIcon
              sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
            />
            <Typography color="text.secondary">
              {t("approvals.noApprovals", "No approval requests")}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {approvals.map((approval) => (
            <Card
              key={approval._id}
              sx={{
                transition: "all 0.2s",
                borderLeft: `3px solid ${typeColors[approval.type] || "#64748b"}`,
                "&:hover": { transform: "translateY(-1px)" },
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
                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        {approval.title}
                      </Typography>
                      <Chip
                        label={approval.type.replace("_", " ")}
                        size="small"
                        sx={{
                          fontSize: 10,
                          height: 18,
                          bgcolor: `${typeColors[approval.type] || "#64748b"}20`,
                          color: typeColors[approval.type] || "#64748b",
                        }}
                      />
                      <Chip
                        label={statusConfig[approval.status]?.label}
                        size="small"
                        color={statusConfig[approval.status]?.color}
                        variant="outlined"
                        sx={{ fontSize: 10, height: 20 }}
                      />
                    </Box>
                    {approval.description && (
                      <Typography variant="caption" color="text.secondary">
                        {approval.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Project */}
                  <Box sx={{ minWidth: 100 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ fontSize: 10 }}
                    >
                      {t("approvalCenter.project", "Project")}</Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {approval.project?.name || "—"}
                    </Typography>
                  </Box>

                  {/* Requester */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Avatar sx={{ width: 22, height: 22, fontSize: 10 }}>
                      {approval.requestedBy?.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Typography variant="caption" sx={{ fontSize: 11 }}>
                      {approval.requestedBy?.username}
                    </Typography>
                  </Box>

                  {/* Time */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: 10 }}
                  >
                    {new Date(approval.createdAt).toLocaleDateString()}
                  </Typography>

                  {/* Actions */}
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {approval.status === "pending" && (
                      <>
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() =>
                              setReviewDialog({
                                open: true,
                                id: approval._id,
                                action: "approve",
                              })
                            }
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setReviewDialog({
                                open: true,
                                id: approval._id,
                                action: "reject",
                              })
                            }
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(approval._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Review info */}
                {approval.reviewedBy && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block", fontSize: 10 }}
                  >
                    {t("approvalCenter.reviewedBy", "Reviewed by")}{approval.reviewedBy.username}
                    {approval.reviewComment && ` — "${approval.reviewComment}"`}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("approvalCenter.newApprovalRequest", "New Approval Request")}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "8px !important",
          }}
        >
          <TextField
            label="Title"
            value={newApproval.title}
            onChange={(e) =>
              setNewApproval((p) => ({ ...p, title: e.target.value }))
            }
            fullWidth
          />
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={newApproval.type}
              label="Type"
              onChange={(e) =>
                setNewApproval((p) => ({ ...p, type: e.target.value }))
              }
            >
              <MenuItem value="deploy">{t("approvalCenter.deploy", "Deploy")}</MenuItem>
              <MenuItem value="config_change">{t("approvalCenter.configChange", "Config Change")}</MenuItem>
              <MenuItem value="rollback">{t("approvalCenter.rollback", "Rollback")}</MenuItem>
              <MenuItem value="delete">{t("approvalCenter.delete", "Delete")}</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Target Project</InputLabel>
            <Select
              value={newApproval.projectId}
              label="Target Project"
              onChange={(e) =>
                setNewApproval((p) => ({ ...p, projectId: e.target.value }))
              }
            >
              {projects.length === 0 && (
                <MenuItem disabled value="">
                  {t("approvalCenter.noProjectsAvailable", "No projects available")}</MenuItem>
              )}
              {projects.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Description"
            value={newApproval.description}
            onChange={(e) =>
              setNewApproval((p) => ({ ...p, description: e.target.value }))
            }
            multiline
            rows={3}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>{t("approvalCenter.cancel", "Cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleCreateApproval}
            disabled={!newApproval.title || !newApproval.projectId}
          >
            {t("approvalCenter.create", "Create")}</Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialog.open}
        onClose={() => setReviewDialog({ open: false, id: "", action: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewDialog.action === "approve"
            ? "✅ Approve Request"
            : "❌ Reject Request"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Comment (optional)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setReviewDialog({ open: false, id: "", action: "" })}
          >
            {t("approvalCenter.cancel", "Cancel")}</Button>
          <Button
            variant="contained"
            color={reviewDialog.action === "approve" ? "success" : "error"}
            onClick={handleReview}
          >
            {reviewDialog.action === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalCenter;
