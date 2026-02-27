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
  Skeleton,
  useTheme,
  Collapse,
  MenuItem,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import SendIcon from "@mui/icons-material/Send";
import BugReportIcon from "@mui/icons-material/BugReport";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SEO from "../components/SEO";

interface WebhookEvent {
  id: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  status: "success" | "failed" | "ignored";
  message: string;
  timestamp: string;
}

const statusColors: Record<string, string> = {
  success: "#22c55e",
  failed: "#ef4444",
  ignored: "#64748b",
};

const WebhookDebugger: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [projectId, setProjectId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/projects")
      .then((res) => setProjects(res.data))
      .catch(() => {});
  }, []);

  const fetchLogs = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/webhook-debug/${projectId}/logs`);
      setEvents(data.logs || []);
    } catch {
      toast.error("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!projectId) return;
    try {
      await api.delete(`/webhook-debug/${projectId}/logs`);
      setEvents([]);
      toast.success("Logs cleared");
    } catch {
      toast.error("Failed to clear logs");
    }
  };

  const sendTestWebhook = async () => {
    if (!projectId) return;
    try {
      await api.post(`/webhook-debug/${projectId}/test`);
      toast.success("Test event sent");
      fetchLogs();
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <Box>
      <SEO title="Webhook Debugger" description="Debug webhook events" />

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
            🔗 {t("webhookDebug.title", "Webhook Debugger")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("webhookDebug.subtitle", "Inspect incoming webhook events")}
          </Typography>
        </Box>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 2 }}>
        <CardContent
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
            p: 2,
            "&:last-child": { pb: 2 },
          }}
        >
          <TextField
            select
            size="small"
            label="Select Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            sx={{ width: 280 }}
          >
            {projects.map((p) => (
              <MenuItem key={p._id} value={p._id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchLogs}
            disabled={!projectId}
          >
            {t("webhookDebugger.loadLogs", "Load Logs")}</Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SendIcon />}
            onClick={sendTestWebhook}
            disabled={!projectId}
          >
            {t("webhookDebugger.testPing", "Test Ping")}</Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={clearLogs}
            disabled={!projectId}
          >
            {t("webhookDebugger.clear", "Clear")}</Button>
        </CardContent>
      </Card>

      {/* Events */}
      {loading ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={60} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : events.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <BugReportIcon
              sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
            />
            <Typography color="text.secondary">
              {projectId
                ? "No webhook events recorded"
                : "Select a Project and click Load Logs"}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {events.map((event) => (
            <Card
              key={event.id}
              sx={{
                borderLeft: `3px solid ${statusColors[event.status]}`,
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": { transform: "translateY(-1px)" },
              }}
              onClick={() =>
                setExpandedId(expandedId === event.id ? null : event.id)
              }
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  <Chip
                    label={event.status}
                    size="small"
                    sx={{
                      bgcolor: `${statusColors[event.status]}20`,
                      color: statusColors[event.status],
                      fontWeight: 600,
                      fontSize: 10,
                      height: 20,
                    }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{ fontSize: 13 }}
                  >
                    {event.message}
                  </Typography>
                  {event.headers?.["x-github-event"] && (
                    <Chip
                      label={event.headers["x-github-event"]}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 10, height: 18 }}
                    />
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: 10 }}
                  >
                    {new Date(event.timestamp).toLocaleString()}
                  </Typography>
                  {expandedId === event.id ? (
                    <ExpandLessIcon fontSize="small" color="action" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" color="action" />
                  )}
                </Box>

                <Collapse in={expandedId === event.id}>
                  <Box
                    sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}
                  >
                    <Box sx={{ flex: 1, minWidth: 250 }}>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ mb: 0.5, display: "block" }}
                      >
                        {t("webhookDebugger.headers", "Headers")}</Typography>
                      <Box
                        component="pre"
                        sx={{
                          bgcolor: isDark
                            ? "rgba(0,0,0,0.3)"
                            : "rgba(0,0,0,0.04)",
                          p: 1.5,
                          borderRadius: 1,
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono', monospace",
                          overflow: "auto",
                          maxHeight: 200,
                          m: 0,
                        }}
                      >
                        {JSON.stringify(event.headers, null, 2)}
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 250 }}>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ mb: 0.5, display: "block" }}
                      >
                        {t("webhookDebugger.body", "Body")}</Typography>
                      <Box
                        component="pre"
                        sx={{
                          bgcolor: isDark
                            ? "rgba(0,0,0,0.3)"
                            : "rgba(0,0,0,0.04)",
                          p: 1.5,
                          borderRadius: 1,
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono', monospace",
                          overflow: "auto",
                          maxHeight: 200,
                          m: 0,
                        }}
                      >
                        {JSON.stringify(event.body, null, 2)}
                      </Box>
                    </Box>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default WebhookDebugger;
