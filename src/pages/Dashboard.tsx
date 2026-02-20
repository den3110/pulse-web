import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
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
  Button,
  Skeleton,
  Paper,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import DnsIcon from "@mui/icons-material/Dns";
import FolderIcon from "@mui/icons-material/Folder";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddIcon from "@mui/icons-material/Add";
import ServerResourceChart from "../components/ServerResourceChart";
import SEO from "../components/SEO";

interface ChartDay {
  date: string;
  day: string;
  success: number;
  failed: number;
  total: number;
}

interface Stats {
  servers: { total: number; online: number };
  projects: { total: number; running: number };
  deployments: { total: number };
  recentDeployments: any[];
  deployChart: ChartDay[];
}

const statusColor: Record<
  string,
  "success" | "error" | "warning" | "default" | "info"
> = {
  running: "success",
  online: "success",
  stopped: "error",
  failed: "error",
  offline: "error",
  deploying: "warning",
  building: "warning",
  cloning: "warning",
  installing: "warning",
  starting: "warning",
  pending: "default",
  idle: "default",
  unknown: "default",
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: number;
  label: string;
  sub?: string;
  gradient: string;
  onClick?: () => void;
}> = React.memo(({ icon, value, label, sub, gradient, onClick }) => (
  <Card
    onClick={onClick}
    sx={{
      position: "relative",
      overflow: "hidden",
      height: "100%",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.25s ease",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      },
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: gradient,
      },
    }}
  >
    <CardContent sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ fontSize: { xs: 22, md: 28 }, mb: 1 }}>{icon}</Box>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 700,
          mb: 0.5,
          fontSize: { xs: "1.5rem", md: "2rem" },
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight={500}
        sx={{ fontSize: { xs: 12, md: 14 } }}
      >
        {label}
      </Typography>
      {sub && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: "block", fontSize: { xs: 10, md: 12 } }}
        >
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
));

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get("/stats");
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Skeleton
                variant="rounded"
                height={140}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  return (
    <Box>
      <SEO
        title={t("seo.dashboard.title")}
        description={t("seo.dashboard.description")}
      />
      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3, alignItems: "stretch" }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<DnsIcon sx={{ color: "#6366f1" }} />}
            value={stats?.servers.total || 0}
            label={t("dashboard.servers")}
            sub={`${stats?.servers.online || 0} ${t("common.online").toLowerCase()}`}
            gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
            onClick={() => navigate("/servers")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<FolderIcon sx={{ color: "#8b5cf6" }} />}
            value={stats?.projects.total || 0}
            label={t("dashboard.projects")}
            sub={`${stats?.projects.running || 0} ${t("common.running").toLowerCase()}`}
            gradient="linear-gradient(135deg, #8b5cf6, #a78bfa)"
            onClick={() => navigate("/projects")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<RocketLaunchIcon sx={{ color: "#10b981" }} />}
            value={stats?.deployments.total || 0}
            label={t("dashboard.deployments")}
            gradient="linear-gradient(135deg, #10b981, #34d399)"
            onClick={() => navigate("/projects")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircleIcon sx={{ color: "#f59e0b" }} />}
            value={stats?.projects.running || 0}
            label={t("dashboard.runningServices")}
            gradient="linear-gradient(135deg, #f59e0b, #fbbf24)"
            onClick={() => navigate("/projects")}
          />
        </Grid>
      </Grid>

      {/* Server Resource Monitoring */}
      <Box sx={{ mb: 3 }}>
        <ServerResourceChart />
      </Box>

      {/* Quick Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: 16 }}>
            {t("dashboard.quickActions")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              component={Link}
              to="/servers"
              variant="outlined"
              startIcon={<AddIcon />}
            >
              {t("dashboard.addServer")}
            </Button>
            <Button
              component={Link}
              to="/projects"
              variant="outlined"
              startIcon={<AddIcon />}
            >
              {t("dashboard.newProject")}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* F1: Deployment History Chart */}
      {stats?.deployChart && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ mb: 2, fontSize: 16 }}>
              {t("dashboard.deploymentsChart")}
            </Typography>
            <Box
              sx={{
                width: "100%",
                height: 220,
                minWidth: 200,
                position: "relative",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.deployChart}>
                  <defs>
                    <linearGradient
                      id="successGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "var(--terminal-bg, #1f2937)",
                      border:
                        "1px solid var(--border-color, rgba(255,255,255,0.08))",
                      borderRadius: 8,
                      color: "var(--terminal-text, #f9fafb)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="success"
                    stroke="#10b981"
                    fill="url(#successGrad)"
                    strokeWidth={2}
                    name="Success"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stroke="#ef4444"
                    fill="url(#failedGrad)"
                    strokeWidth={2}
                    name="Failed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Recent Deployments */}
      <Card sx={{ overflow: "hidden" }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: 16 }}>
            {t("dashboard.recentDeployments")}
          </Typography>

          {!stats?.recentDeployments || stats.recentDeployments.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <RocketLaunchIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                {t("dashboard.noDeployments")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("dashboard.createFirstDeployment")}
              </Typography>
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ bgcolor: "transparent", overflowX: "auto" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 10, md: 12 },
                        textTransform: "uppercase",
                        px: { xs: 1, md: 2 },
                      }}
                    >
                      {t("common.project")}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 10, md: 12 },
                        textTransform: "uppercase",
                        px: { xs: 1, md: 2 },
                      }}
                    >
                      {t("common.server")}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 10, md: 12 },
                        textTransform: "uppercase",
                        px: { xs: 1, md: 2 },
                      }}
                    >
                      {t("common.status")}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 10, md: 12 },
                        textTransform: "uppercase",
                        px: { xs: 1, md: 2 },
                      }}
                    >
                      {t("dashboard.triggeredBy")}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 10, md: 12 },
                        textTransform: "uppercase",
                        px: { xs: 1, md: 2 },
                        display: { xs: "none", sm: "table-cell" },
                      }}
                    >
                      {t("common.time")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.recentDeployments.map((dep: any) => (
                    <TableRow
                      key={dep._id}
                      hover
                      onClick={() => {
                        if (dep.project?._id) {
                          navigate(`/projects/${dep.project._id}/deploy`);
                        }
                      }}
                      sx={{
                        cursor: dep.project?._id ? "pointer" : "default",
                        transition: "background 0.15s",
                        "&:hover": {
                          bgcolor: "action.selected",
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          px: { xs: 1, md: 2 },
                          fontSize: { xs: 12, md: 14 },
                        }}
                      >
                        {dep.project?.name || "—"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: { xs: 11, md: 13 },
                          px: { xs: 1, md: 2 },
                        }}
                      >
                        {dep.server?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={dep.status}
                          size="small"
                          color={statusColor[dep.status] || "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ px: { xs: 1, md: 2 } }}>
                        {dep.triggeredBy}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          fontSize: { xs: 11, md: 13 },
                          display: { xs: "none", sm: "table-cell" },
                        }}
                      >
                        {new Date(dep.createdAt).toLocaleString("vi-VN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
