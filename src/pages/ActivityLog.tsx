import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Pagination,
  TextField,
  MenuItem,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";

interface Activity {
  _id: string;
  action: string;
  username?: string;
  details: string;
  ip?: string;
  createdAt: string;
}

const actionColors: Record<
  string,
  "success" | "error" | "warning" | "info" | "default"
> = {
  login: "info",
  logout: "default",
  deploy: "success",
  rollback: "warning",
  stop: "error",
  restart: "warning",
  "server.create": "success",
  "server.update": "info",
  "server.delete": "error",
  "project.create": "success",
  "project.update": "info",
  "project.delete": "error",
  "nginx.update": "info",
  "settings.update": "info",
  "user.create": "success",
  "user.update": "info",
  "user.delete": "error",
  "password.change": "warning",
};

const actionLabels: Record<string, string> = {
  all: "📋 All Actions",
  login: "🔑 Login",
  logout: "🚪 Logout",
  deploy: "🚀 Deploy",
  rollback: "⏪ Rollback",
  stop: "⛔ Stop",
  restart: "🔄 Restart",
  "server.create": "➕ Server Created",
  "server.update": "✏️ Server Updated",
  "server.delete": "🗑️ Server Deleted",
  "project.create": "➕ Project Created",
  "project.update": "✏️ Project Updated",
  "project.delete": "🗑️ Project Deleted",
  "nginx.update": "🌐 Nginx Updated",
  "settings.update": "⚙️ Settings Updated",
  "user.create": "👤 User Created",
  "user.update": "👤 User Updated",
  "user.delete": "👤 User Deleted",
  "password.change": "🔒 Password Changed",
};

const actions = [
  "all",
  "login",
  "deploy",
  "rollback",
  "stop",
  "restart",
  "server.create",
  "server.update",
  "server.delete",
  "project.create",
  "project.update",
  "project.delete",
  "user.create",
  "user.update",
  "user.delete",
  "password.change",
];

const ActivityLog: React.FC = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");

  const fetchActivities = async (p: number, action: string) => {
    setLoading(true);
    try {
      const { data } = await api.get("/activity", {
        params: { page: p, limit: 20, action },
      });
      setActivities(data.activities);
      setTotalPages(data.pagination.pages);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(page, actionFilter);
  }, [page, actionFilter]);

  const getActionLabel = (action: string) => actionLabels[action] || action;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="body1" fontWeight={500}>
            {t("activity.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("activity.subtitle")}
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 220, width: { xs: "100%", sm: "auto" } }}
          label={t("activity.filterByAction")}
        >
          {actions.map((a) => (
            <MenuItem key={a} value={a}>
              {getActionLabel(a)}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 3 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} height={50} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : activities.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <HistoryIcon
                sx={{ fontSize: 56, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                {t("activity.noActivity")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("activity.noActivitySubtitle")}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Desktop Table */}
              <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("common.actions")}</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Details</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activities.map((a) => (
                      <TableRow key={a._id}>
                        <TableCell>
                          <Chip
                            label={getActionLabel(a.action)}
                            size="small"
                            color={actionColors[a.action] || "default"}
                            variant="outlined"
                            sx={{ fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>{a.username || "—"}</TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 400,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {a.details}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                          {new Date(a.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Mobile Cards */}
              <Box
                sx={{
                  display: { xs: "flex", md: "none" },
                  flexDirection: "column",
                  gap: 0,
                }}
              >
                {activities.map((a, index) => (
                  <Box
                    key={a._id}
                    sx={{
                      p: 2,
                      borderBottom:
                        index < activities.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 1,
                      }}
                    >
                      <Chip
                        label={getActionLabel(a.action)}
                        size="small"
                        color={actionColors[a.action] || "default"}
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(a.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <Box
                        component="span"
                        sx={{ fontWeight: 600, color: "primary.light" }}
                      >
                        {a.username || "System"}
                      </Box>
                      {" - "}
                      {a.details}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default ActivityLog;
