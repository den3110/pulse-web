import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import TerminalIcon from "@mui/icons-material/Terminal";
import FolderIcon from "@mui/icons-material/Folder";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import StopIcon from "@mui/icons-material/Stop";
import toast from "react-hot-toast";

import DragHandleIcon from "@mui/icons-material/DragHandle";

interface Server {
  _id: string;
  name: string;
  host: string;
  status: string;
}

interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  branch: string;
  server: Server;
  deployPath: string;
  repoFolder?: string;
  outputPath?: string;
  buildOutputDir?: string;
  buildCommand: string;
  installCommand: string;
  startCommand: string;
  stopCommand: string;
  status: string;
  autoDeploy: boolean;
  processManager: "nohup" | "pm2";
  environment?: "node" | "python" | "static" | "docker-compose";
  lastDeployedAt?: string;
  envVars?: Record<string, string>;
}

const statusColor: Record<string, "success" | "error" | "warning" | "default"> =
  {
    running: "success",
    stopped: "error",
    failed: "error",
    deploying: "warning",
    building: "warning",
    idle: "default",
  };

interface ProjectCardProps {
  project: Project;
  visibleSecret: string | undefined;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onStop: (project: Project) => void;
  onDeploy: (projectId: string) => void;
  onToggleSecret: (projectId: string) => void;
}

const ProjectCard = memo(function ProjectCard({
  project,
  visibleSecret,
  onEdit,
  onDelete,
  onStop,
  onDeploy,
  onToggleSecret,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isActive = [
    "running",
    "deploying",
    "building",
    "cloning",
    "installing",
    "starting",
  ].includes(project.status);

  const webhookUrl = `${import.meta.env.VITE_API_URL || window.location.origin}/api/webhook/${project._id}`;
  const displayText = visibleSecret ? visibleSecret : webhookUrl;

  return (
    <Card
      className={`project-card project-status-${project.status}`}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        maxWidth: "100%",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        background: (theme: any) =>
          theme.palette.mode === "dark"
            ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
            : "linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
        backdropFilter: "blur(20px)",
        border: "1px solid",
        borderColor: (theme: any) =>
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.05)",
        borderRadius: 4,
        "&:hover": {
          transform: "translateY(-6px) scale(1.02)",
          boxShadow: (theme: any) =>
            theme.palette.mode === "dark"
              ? `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px -5px rgba(255,255,255,0.05)`
              : "0 20px 40px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)",
          borderColor: (theme: any) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.1)",
        },
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2.5, md: 3 },
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
        className="project-card-content"
      >
        {/* Header */}
        <Box
          className="project-card-header"
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box
            className="project-identity"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 0,
              flex: 1,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: (theme: any) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid",
                borderColor: (theme: any) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.08)",
                flexShrink: 0,
              }}
            >
              <FolderIcon
                sx={{ color: "primary.main" }}
                className="project-icon"
              />
            </Box>
            <Box sx={{ minWidth: 0, overflow: "hidden" }}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                className="project-name"
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    color: "primary.main",
                  },
                  transition: "color 0.2s",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: { xs: 15, md: 17 },
                  lineHeight: 1.2,
                }}
                onClick={() => navigate(`/projects/${project._id}/deploy`)}
              >
                {project.name}
              </Typography>
              <Typography
                variant="body2"
                className="project-repo-url"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "text.secondary",
                  fontSize: { xs: 10, md: 11 },
                  mt: 0.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {project.repoUrl}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={project.status}
            size="small"
            color={statusColor[project.status] || "default"}
            className={`project-status-chip status-${project.status}`}
            sx={{
              fontWeight: 600,
              borderRadius: 1.5,
              height: 24,
              px: 1,
              fontSize: 11,
              textTransform: "capitalize",
              border: "none",
              ml: 1,
              bgcolor: (theme) => {
                const color = statusColor[project.status] || "default";
                if (color === "success")
                  return theme.palette.mode === "dark"
                    ? "rgba(16, 185, 129, 0.1)"
                    : "rgba(16, 185, 129, 0.1)";
                if (color === "error")
                  return theme.palette.mode === "dark"
                    ? "rgba(239, 68, 68, 0.1)"
                    : "rgba(239, 68, 68, 0.1)";
                if (color === "warning")
                  return theme.palette.mode === "dark"
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(245, 158, 11, 0.1)";
                return theme.palette.mode === "dark"
                  ? "rgba(150, 150, 150, 0.1)"
                  : "action.hover";
              },
              color: (theme) => {
                const color = statusColor[project.status] || "default";
                if (color === "success")
                  return theme.palette.mode === "dark"
                    ? "#10b981"
                    : "success.dark";
                if (color === "error")
                  return theme.palette.mode === "dark"
                    ? "#ef4444"
                    : "error.dark";
                if (color === "warning")
                  return theme.palette.mode === "dark"
                    ? "#f59e0b"
                    : "warning.dark";
                return "text.secondary";
              },
            }}
          />
        </Box>

        {/* Tags */}
        <Box
          className="project-tags"
          sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}
        >
          <Chip
            label={project.branch}
            size="small"
            className="project-branch-chip"
            sx={{
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
            }}
          />
          <Chip
            label={project.server?.name || "No server"}
            size="small"
            className={`project-server-chip server-${project.server?.status}`}
            sx={{
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 1.5,
              bgcolor:
                project.server?.status === "online"
                  ? "rgba(16, 185, 129, 0.1)"
                  : (theme: any) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
              color:
                project.server?.status === "online"
                  ? "#10b981"
                  : "text.primary",
            }}
          />
          {project.autoDeploy && (
            <Tooltip title="Auto-deploy enabled — checks for new commits every 60s">
              <Chip
                icon={
                  <AutoFixHighIcon
                    sx={{ fontSize: "14px !important", color: "inherit" }}
                  />
                }
                label="Auto-deploy"
                size="small"
                className="project-autodeploy-chip"
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 1.5,
                  bgcolor: "rgba(14, 165, 233, 0.1)",
                  color: "#0ea5e9",
                  "& .MuiChip-icon": { color: "inherit" },
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Deploy Path */}
        <Typography
          variant="body2"
          className="project-deploy-path"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "text.secondary",
            fontSize: 11,
            mb: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          📁 {project.deployPath}
        </Typography>

        {/* Last Deployed */}
        {project.lastDeployedAt && (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            className="project-last-deployed"
            sx={{ mb: 1.5, fontStyle: "italic", opacity: 0.8 }}
          >
            {t("deploy.lastDeployed")}:{" "}
            {new Date(project.lastDeployedAt).toLocaleString("vi-VN")}
          </Typography>
        )}

        {/* Webhook Box */}
        <Box
          className="project-webhook-box"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mb: 2,
            p: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(0,0,0,0.2)"
                : "rgba(0,0,0,0.02)",
            borderRadius: 2,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Box
            className="webhook-content"
            sx={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box component="span" sx={{ fontSize: 13, opacity: 0.8 }}>
              {visibleSecret ? "🔑" : "🔗"}
            </Box>
            <Typography
              variant="caption"
              className="webhook-text"
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "text.primary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: 500,
              }}
            >
              {displayText}
            </Typography>
          </Box>
          <Tooltip title={visibleSecret ? "Copy Secret" : "Copy URL"}>
            <IconButton
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(displayText);
                toast.success(
                  visibleSecret ? "Secret Key copied!" : "Webhook URL copied!",
                );
              }}
              sx={{
                p: 0.5,
                color: "text.secondary",
                ml: 0.5,
                "&:hover": {
                  color: "primary.main",
                  bgcolor: "rgba(var(--primary-main-channel), 0.1)",
                },
              }}
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={visibleSecret ? "Show URL" : "Show Secret Key"}>
            <IconButton
              size="small"
              onClick={() => onToggleSecret(project._id)}
              sx={{
                p: 0.5,
                color: visibleSecret ? "primary.main" : "text.secondary",
                "&:hover": {
                  color: visibleSecret ? "primary.dark" : "warning.main",
                  bgcolor: visibleSecret
                    ? "rgba(var(--primary-main-channel), 0.1)"
                    : "rgba(245, 158, 11, 0.1)",
                },
              }}
            >
              <Box
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  border: "1px solid currentColor",
                  borderRadius: 1,
                  px: 0.5,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {visibleSecret ? "URL" : "KEY"}
              </Box>
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Action Buttons */}
        <Box
          className="project-actions"
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "nowrap",
            alignItems: "center",
            pt: 2,
            borderTop: "1px dashed",
            borderColor: (theme: any) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.1)",
          }}
        >
          {isActive ? (
            <>
              <Button
                size="small"
                variant="contained"
                color="info"
                startIcon={<TerminalIcon />}
                onClick={() => navigate(`/projects/${project._id}/deploy`)}
                className="action-btn-console"
                sx={{ borderRadius: 1.5, flex: 1 }}
              >
                Console
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={() => onStop(project)}
                disabled={project.status !== "running"}
                className="action-btn-stop"
                sx={{ borderRadius: 1.5 }}
              >
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                variant="contained"
                startIcon={<RocketLaunchIcon />}
                onClick={() => onDeploy(project._id)}
                className="action-btn-deploy"
                sx={{ borderRadius: 1.5, flex: 1 }}
              >
                {t("common.deploy")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<TerminalIcon />}
                onClick={() => navigate(`/projects/${project._id}/deploy`)}
                className="action-btn-logs"
                sx={{ borderRadius: 1.5 }}
              >
                Logs
              </Button>
            </>
          )}

          {/* Divider */}
          <Box sx={{ width: "1px", height: 24, bgcolor: "divider", mx: 0.5 }} />

          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => onEdit(project)}
              className="action-btn-edit"
              sx={{
                bgcolor: (theme: any) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
                "&:hover": {
                  bgcolor: (theme: any) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(project)}
              className="action-btn-delete"
              sx={{
                bgcolor: "rgba(239, 68, 68, 0.1)",
                "&:hover": { bgcolor: "rgba(239, 68, 68, 0.2)" },
              }}
            >
              <DeleteForeverIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Drag to reorder">
            <IconButton
              size="small"
              className="drag-handle"
              sx={{
                cursor: "grab",
                "&:active": { cursor: "grabbing" },
                opacity: 0.5,
              }}
            >
              <DragHandleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
});

export default ProjectCard;
export type { Project, Server };
