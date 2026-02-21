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
        overflow: "hidden",
        maxWidth: "100%",
        transition: "all 0.25s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        },
      }}
    >
      <CardContent
        sx={{ p: { xs: 2, md: 3 }, overflow: "hidden" }}
        className="project-card-content"
      >
        {/* Header */}
        <Box
          className="project-card-header"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Box
            className="project-identity"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minWidth: 0,
              flex: 1,
            }}
          >
            <FolderIcon
              sx={{ color: "primary.main", flexShrink: 0 }}
              className="project-icon"
            />
            <Typography
              variant="subtitle1"
              fontWeight={600}
              className="project-name"
              sx={{
                cursor: "pointer",
                "&:hover": {
                  color: "primary.light",
                  textDecoration: "underline",
                },
                transition: "color 0.2s",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: { xs: 14, md: 16 },
              }}
              onClick={() => navigate(`/projects/${project._id}/deploy`)}
            >
              {project.name}
            </Typography>
          </Box>
          <Chip
            label={project.status}
            size="small"
            color={statusColor[project.status] || "default"}
            variant="outlined"
            className={`project-status-chip status-${project.status}`}
          />
        </Box>

        {/* Repo URL */}
        <Typography
          variant="body2"
          className="project-repo-url"
          sx={{
            fontFamily: "'JetBrains Mono', monospace",
            color: "text.secondary",
            fontSize: { xs: 10, md: 12 },
            mb: 0.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.repoUrl}
        </Typography>

        {/* Tags */}
        <Box
          className="project-tags"
          sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}
        >
          <Chip
            label={project.branch}
            size="small"
            variant="outlined"
            className="project-branch-chip"
            sx={{ fontSize: 11 }}
          />
          <Chip
            label={project.server?.name || "No server"}
            size="small"
            variant="outlined"
            className={`project-server-chip server-${project.server?.status}`}
            color={project.server?.status === "online" ? "success" : "default"}
            sx={{ fontSize: 11 }}
          />
          {project.autoDeploy && (
            <Tooltip title="Auto-deploy enabled — checks for new commits every 60s">
              <Chip
                icon={<AutoFixHighIcon sx={{ fontSize: "14px !important" }} />}
                label="Auto-deploy"
                size="small"
                color="info"
                variant="outlined"
                className="project-autodeploy-chip"
                sx={{ fontSize: 11 }}
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
            sx={{ mb: 1 }}
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
            p: 1,
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(0,0,0,0.3)"
                : "action.hover",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
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
            <Box component="span" sx={{ fontSize: 14 }}>
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
              }}
            >
              {displayText}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => {
              navigator.clipboard.writeText(displayText);
              toast.success(
                visibleSecret ? "Secret Key copied!" : "Webhook URL copied!",
              );
            }}
            sx={{ p: 0.3, color: "text.secondary", ml: 0.5 }}
            title={visibleSecret ? "Copy Secret" : "Copy URL"}
          >
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onToggleSecret(project._id)}
            sx={{
              p: 0.3,
              color: visibleSecret ? "primary.main" : "warning.main",
            }}
            title={visibleSecret ? "Show URL" : "Show Secret Key"}
          >
            <Box
              sx={{
                fontSize: 10,
                fontWeight: 700,
                border: "1px solid currentColor",
                borderRadius: 0.5,
                px: 0.5,
                height: 18,
                display: "flex",
                alignItems: "center",
              }}
            >
              {visibleSecret ? "URL" : "KEY"}
            </Box>
          </IconButton>
        </Box>

        {/* Action Buttons */}
        <Box
          className="project-actions"
          sx={{
            display: "flex",
            gap: { xs: 0.5, md: 1 },
            flexWrap: "wrap",
            alignItems: "center",
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
              >
                {t("common.deploy")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<TerminalIcon />}
                onClick={() => navigate(`/projects/${project._id}/deploy`)}
                className="action-btn-logs"
              >
                Logs
              </Button>
            </>
          )}
          <Box sx={{ flex: 1 }} />
          <IconButton
            size="small"
            onClick={() => onEdit(project)}
            className="action-btn-edit"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => onDelete(project)}
            sx={{ minWidth: "auto" }}
            className="action-btn-delete"
          >
            {t("common.delete")}
          </Button>
          <Tooltip title="Drag to reorder">
            <IconButton
              size="small"
              className="drag-handle"
              sx={{ cursor: "grab", "&:active": { cursor: "grabbing" } }}
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
