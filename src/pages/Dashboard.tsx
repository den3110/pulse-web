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
import { useThemeMode } from "../contexts/ThemeContext";
import EndUserDashboard from "./EndUserDashboard";

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
      transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      animation: "fadeInUp 0.6s ease-out both",
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
      display: "flex",
      flexDirection: "column",
      "&:hover": {
        transform: onClick ? "translateY(-6px) scale(1.02)" : "none",
        boxShadow: (theme: any) =>
          theme.palette.mode === "dark"
            ? `0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px -5px ${gradient.split(",")[1]?.trim() || "rgba(255,255,255,0.1)"}40`
            : "0 20px 40px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)",
        borderColor: (theme: any) =>
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)",
        "& .icon-container": {
          transform: "scale(1.1) rotate(5deg)",
          background: gradient,
          color: "#fff",
          boxShadow: `0 8px 24px -6px ${gradient.split(",")[1]?.trim() || "rgba(0,0,0,0.2)"}`,
          "& svg": { color: "#fff !important" },
        },
      },
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: gradient,
        opacity: 0.8,
        transition: "opacity 0.3s ease",
      },
      "&:hover::before": {
        opacity: 1,
      },
    }}
  >
    <CardContent
      sx={{
        p: { xs: 2.5, md: 3.5 },
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        className="icon-container"
        sx={{
          width: 48,
          height: 48,
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 3,
          background: (theme: any) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.04)",
          border: "1px solid",
          borderColor: (theme: any) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.08)",
          transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        <Box
          sx={{
            fontSize: 26,
            display: "flex",
            transition: "all 0.4s ease",
          }}
        >
          {icon}
        </Box>
      </Box>

      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          mb: 0.5,
          fontSize: { xs: "1.8rem", md: "2.4rem" },
          letterSpacing: "-0.03em",
          lineHeight: 1,
          background: (theme: any) =>
            theme.palette.mode === "dark" ? "#fff" : "none",
          WebkitBackgroundClip: (theme: any) =>
            theme.palette.mode === "dark" ? "text" : "none",
          WebkitTextFillColor: (theme: any) =>
            theme.palette.mode === "dark" ? "transparent" : "inherit",
        }}
      >
        {value}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight={600}
        sx={{
          fontSize: { xs: 12.5, md: 14 },
          letterSpacing: "0.01em",
          mt: 0.5,
        }}
      >
        {label}
      </Typography>

      {sub && (
        <Box sx={{ mt: "auto", pt: 2 }}>
          <Chip
            label={sub}
            size="small"
            sx={{
              height: 24,
              fontSize: 11,
              fontWeight: 600,
              bgcolor: (theme: any) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
              color: "text.secondary",
              border: "1px solid",
              borderColor: (theme: any) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
              "& .MuiChip-label": { px: 1.5 },
            }}
          />
        </Box>
      )}
    </CardContent>
  </Card>
));

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { interfaceMode } = useThemeMode();

  useEffect(() => {
    if (interfaceMode === "enduser") return; // skip fetch in enduser mode
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
  }, [interfaceMode]);

  // End-user mode: render simplified dashboard (MUST be after all hooks)
  if (interfaceMode === "enduser") {
    return <EndUserDashboard />;
  }

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
            icon={<DnsIcon sx={{ color: "var(--primary-main)" }} />}
            value={stats?.servers.total || 0}
            label={t("dashboard.servers")}
            sub={`${stats?.servers.online || 0} ${t("common.online").toLowerCase()}`}
            gradient="linear-gradient(135deg, var(--primary-main), var(--secondary-main))"
            onClick={() => navigate("/servers")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<FolderIcon sx={{ color: "var(--secondary-main)" }} />}
            value={stats?.projects.total || 0}
            label={t("dashboard.projects")}
            sub={`${stats?.projects.running || 0} ${t("common.running").toLowerCase()}`}
            gradient="linear-gradient(135deg, var(--secondary-main), #fdba74)"
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
      <Card
        sx={{
          mb: 3,
          background: (theme: any) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
              : "linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 24,
                borderRadius: 1,
                bgcolor: "primary.main",
              }}
            />
            {t("dashboard.quickActions")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              component={Link}
              to="/servers"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              sx={{
                borderRadius: 2,
                px: 3,
                boxShadow: "0 4px 14px 0 rgba(249, 115, 22, 0.39)",
              }}
            >
              {t("dashboard.addServer")}
            </Button>
            <Button
              component={Link}
              to="/projects"
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{
                borderRadius: 2,
                px: 3,
                bgcolor: (theme: any) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.02)",
              }}
            >
              {t("dashboard.newProject")}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* F1: Deployment History Chart */}
      {stats?.deployChart && (
        <Card
          sx={{
            mb: 3,
            background: (theme: any) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
                : "none",
            backdropFilter: "blur(20px)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography
              variant="h6"
              sx={{
                mb: 3,
                fontSize: 16,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 24,
                  borderRadius: 1,
                  bgcolor: "#10b981",
                }}
              />
              {t("dashboard.deploymentsChart")}
            </Typography>
            <Box
              sx={{
                width: "100%",
                height: 250,
                minWidth: 200,
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.deployChart}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="successGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(150,150,150,0.1)"
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.9)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#f9fafb",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                      fontSize: 13,
                      padding: "10px 14px",
                    }}
                    itemStyle={{
                      paddingTop: 4,
                      fontWeight: 600,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="success"
                    stroke="#10b981"
                    fill="url(#successGrad)"
                    strokeWidth={3}
                    dot={{ r: 0, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
                    name="Success"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stroke="#ef4444"
                    fill="url(#failedGrad)"
                    strokeWidth={3}
                    dot={{ r: 0, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#ef4444" }}
                    name="Failed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Recent Deployments */}
      <Card
        sx={{
          mb: 3,
          overflow: "hidden",
          background: (theme: any) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
              : "none",
          backdropFilter: "blur(20px)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 24,
                borderRadius: 1,
                bgcolor: "var(--primary-main)",
              }}
            />
            {t("dashboard.recentDeployments")}
          </Typography>

          {!stats?.recentDeployments || stats.recentDeployments.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <RocketLaunchIcon
                sx={{
                  fontSize: 56,
                  color: "text.secondary",
                  opacity: 0.5,
                  mb: 2,
                }}
              />
              <Typography
                variant="h6"
                color="text.primary"
                fontWeight={600}
                gutterBottom
              >
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
              sx={{
                bgcolor: "transparent",
                overflowX: "auto",
                border: "1px solid",
                borderColor: (theme: any) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
                borderRadius: 2,
              }}
            >
              <Table size="medium">
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: (theme: any) =>
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.02)",
                    }}
                  >
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 11, md: 12 },
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        py: 2,
                      }}
                    >
                      {t("common.project")}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 11, md: 12 },
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        py: 2,
                      }}
                    >
                      {t("common.server")}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 11, md: 12 },
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        py: 2,
                      }}
                    >
                      {t("common.status")}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 11, md: 12 },
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        py: 2,
                      }}
                    >
                      {t("dashboard.triggeredBy")}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: "text.secondary",
                        fontSize: { xs: 11, md: 12 },
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        py: 2,
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
                        transition: "background 0.2sease",
                        "&:hover": {
                          bgcolor: (theme: any) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255,255,255,0.04) !important"
                              : "rgba(0,0,0,0.02) !important",
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: { xs: 13, md: 14 },
                          py: 2,
                        }}
                      >
                        {dep.project?.name || "—"}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: { xs: 12, md: 13 },
                          color: "text.secondary",
                          py: 2,
                        }}
                      >
                        {dep.server?.name || "—"}
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip
                          label={dep.status}
                          size="small"
                          color={statusColor[dep.status] || "default"}
                          variant="outlined"
                          sx={{ fontWeight: 600, height: 24, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2, fontSize: 13 }}>
                        {dep.triggeredBy}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          fontSize: { xs: 12, md: 13 },
                          py: 2,
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
