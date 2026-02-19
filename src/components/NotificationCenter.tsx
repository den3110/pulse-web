import React, { useState, useEffect, useCallback } from "react";
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  Button,
  Divider,
  Chip,
  Tooltip,
  Skeleton,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

interface Notification {
  _id: string;
  type: "deploy_success" | "deploy_failed" | "deploy_started" | "health_alert";
  title: string;
  message: string;
  read: boolean;
  link?: string;
  projectId?: { _id: string; name: string };
  createdAt: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  deploy_success: {
    icon: <CheckCircleIcon sx={{ fontSize: 18 }} />,
    color: "#10b981",
  },
  deploy_failed: {
    icon: <ErrorIcon sx={{ fontSize: 18 }} />,
    color: "#ef4444",
  },
  deploy_started: {
    icon: <Skeleton variant="circular" width={16} height={16} />,
    color: "#f59e0b",
  },
  health_alert: {
    icon: <WarningIcon sx={{ fontSize: 18 }} />,
    color: "#f59e0b",
  },
};

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent fail
    }
  }, []);

  // Poll every 15s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => setAnchorEl(null);

  const markAsRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.put("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = async () => {
    await api.delete("/notifications");
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) await markAsRead(n._id);
    if (n.link) {
      navigate(n.link);
      handleClose();
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} sx={{ color: "text.secondary" }}>
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              "& .MuiBadge-badge": {
                fontSize: 10,
                height: 18,
                minWidth: 18,
              },
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 320, sm: 380 },
              maxHeight: 480,
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.08)",
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" fontWeight={700}>
            🔔 Notifications
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton size="small" onClick={markAllRead}>
                  <DoneAllIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
            {notifications.length > 0 && (
              <Tooltip title="Clear all">
                <IconButton size="small" onClick={clearAll}>
                  <DeleteSweepIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Notification list */}
        <Box sx={{ overflowY: "auto", maxHeight: 400 }}>
          {notifications.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <NotificationsIcon
                sx={{ fontSize: 40, color: "text.secondary", mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            notifications.map((n, i) => {
              const config = typeConfig[n.type] || typeConfig.deploy_success;
              return (
                <React.Fragment key={n._id}>
                  <Box
                    onClick={() => handleClick(n)}
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      cursor: "pointer",
                      bgcolor: n.read
                        ? "transparent"
                        : "rgba(99, 102, 241, 0.06)",
                      transition: "all 0.15s ease",
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,0.04)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        mt: 0.3,
                        color: config.color,
                        flexShrink: 0,
                      }}
                    >
                      {config.icon}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={n.read ? 400 : 600}
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {n.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {n.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary", fontSize: 10 }}
                      >
                        {timeAgo(n.createdAt)}
                      </Typography>
                    </Box>
                    {!n.read && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "primary.main",
                          flexShrink: 0,
                          mt: 0.8,
                        }}
                      />
                    )}
                  </Box>
                  {i < notifications.length - 1 && <Divider />}
                </React.Fragment>
              );
            })
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationCenter;
