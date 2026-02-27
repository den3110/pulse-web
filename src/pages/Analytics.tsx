import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Select,
  MenuItem,
  Grid,
  LinearProgress,
  Skeleton,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import SpeedIcon from "@mui/icons-material/Speed";
import TimerIcon from "@mui/icons-material/Timer";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import SEO from "../components/SEO";

interface DoraMetrics {
  period: number;
  deployFrequency: number;
  totalDeploys: number;
  avgLeadTimeMinutes: number;
  changeFailureRate: number;
  failedDeploys: number;
  mttrMinutes: number;
  recoveryCount: number;
}

interface TrendDay {
  date: string;
  day: string;
  success: number;
  failed: number;
  total: number;
  avgDurationSeconds: number;
}

interface ProjectStat {
  projectId: string;
  name: string;
  status: string;
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgDurationSeconds: number;
  lastDeploy: string;
}

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}> = ({ icon, label, value, sub, color }) => (
  <Card
    sx={{
      position: "relative",
      overflow: "hidden",
      height: "100%",
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box
        sx={{
          position: "absolute",
          top: -15,
          right: -15,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `${color}15`,
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box sx={{ color }}>{icon}</Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h4" fontWeight={800} sx={{ color }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [dora, setDora] = useState<DoraMetrics | null>(null);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [heatmap, setHeatmap] = useState<number[][]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [doraRes, trendsRes, heatmapRes, projectsRes] = await Promise.all(
          [
            api.get(`/analytics/dora?days=${days}`),
            api.get(`/analytics/trends?days=${days}`),
            api.get(`/analytics/heatmap?days=${days}`),
            api.get(`/analytics/projects?days=${days}`),
          ],
        );
        setDora(doraRes.data);
        setTrends(trendsRes.data.trends || []);
        setHeatmap(heatmapRes.data.heatmap || []);
        setProjectStats(projectsRes.data.stats || []);
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [days]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getHeatmapColor = (value: number, max: number) => {
    if (value === 0)
      return theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9";
    const intensity = Math.min(value / Math.max(max, 1), 1);
    const r = Math.round(34 + (99 - 34) * (1 - intensity));
    const g = Math.round(197 + (102 - 197) * (1 - intensity) * 0.3);
    const b = Math.round(94 + (241 - 94) * (1 - intensity) * 0.2);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const heatmapMax = Math.max(...heatmap.flat(), 1);

  if (loading) {
    return (
      <Box>
        <SEO title="Analytics" description="Deployment Analytics" />
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} md={3} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <SEO title="Analytics" description="Deployment Analytics" />

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
            📊 {t("analytics.title", "Analytics Dashboard")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("analytics.subtitle", "DORA Metrics & Deployment Insights")}
          </Typography>
        </Box>
        <Select
          value={days}
          onChange={(e) => setDays(e.target.value as number)}
          size="small"
          sx={{ width: 150, height: 36 }}
        >
          <MenuItem value={7}>{t("analytics.last7Days", "Last 7 days")}</MenuItem>
          <MenuItem value={14}>{t("analytics.last14Days", "Last 14 days")}</MenuItem>
          <MenuItem value={30}>{t("analytics.last30Days", "Last 30 days")}</MenuItem>
          <MenuItem value={60}>{t("analytics.last60Days", "Last 60 days")}</MenuItem>
          <MenuItem value={90}>{t("analytics.last90Days", "Last 90 days")}</MenuItem>
        </Select>
      </Box>

      {/* DORA Metrics Cards */}
      {dora && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <MetricCard
              icon={<SpeedIcon />}
              label="Deploy Frequency"
              value={`${dora.deployFrequency}/day`}
              sub={`${dora.totalDeploys} total`}
              color="#3b82f6"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <MetricCard
              icon={<TimerIcon />}
              label="Lead Time"
              value={
                dora.avgLeadTimeMinutes > 60
                  ? `${Math.round(dora.avgLeadTimeMinutes / 60)}h`
                  : `${dora.avgLeadTimeMinutes}m`
              }
              sub="avg deploy duration"
              color="#8b5cf6"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <MetricCard
              icon={<ErrorOutlineIcon />}
              label="Failure Rate"
              value={`${dora.changeFailureRate}%`}
              sub={`${dora.failedDeploys} failed`}
              color={dora.changeFailureRate > 15 ? "#ef4444" : "#22c55e"}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <MetricCard
              icon={<AutorenewIcon />}
              label="MTTR"
              value={
                dora.mttrMinutes > 60
                  ? `${Math.round(dora.mttrMinutes / 60)}h`
                  : `${dora.mttrMinutes}m`
              }
              sub={`${dora.recoveryCount} recoveries`}
              color="#f59e0b"
            />
          </Grid>
        </Grid>
      )}

      {/* Deploy Trends Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            {t("analytics.deployTrends", "📈 Deploy Trends")}</Typography>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(128,128,128,0.15)"
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                allowDecimals={false}
              />
              <RTooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="success"
                stroke="#22c55e"
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
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {/* Heatmap */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                {t("analytics.activityHeatmap", "🗓️ Activity Heatmap")}</Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "50px repeat(24, 1fr)",
                    gap: "2px",
                    minWidth: 500,
                  }}
                >
                  {/* Hour labels */}
                  <Box />
                  {Array.from({ length: 24 }, (_, h) => (
                    <Typography
                      key={h}
                      variant="caption"
                      sx={{
                        fontSize: 9,
                        textAlign: "center",
                        color: "text.secondary",
                      }}
                    >
                      {h}{t("analytics.h", "h")}</Typography>
                  ))}

                  {/* Rows */}
                  {dayNames.map((day, dayIdx) => (
                    <React.Fragment key={day}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 10,
                          display: "flex",
                          alignItems: "center",
                          color: "text.secondary",
                        }}
                      >
                        {day}
                      </Typography>
                      {heatmap[dayIdx]?.map((count, hour) => (
                        <Tooltip
                          key={`${day}-${hour}`}
                          title={`${day} ${hour}:00 — ${count} deploys`}
                          arrow
                        >
                          <Box
                            sx={{
                              width: "100%",
                              aspectRatio: "1/1",
                              borderRadius: "3px",
                              bgcolor: getHeatmapColor(count, heatmapMax),
                              cursor: "pointer",
                              transition: "transform 0.15s",
                              "&:hover": {
                                transform: "scale(1.3)",
                                zIndex: 1,
                              },
                            }}
                          />
                        </Tooltip>
                      ))}
                    </React.Fragment>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Projects */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                {t("analytics.topProjects", "🏆 Top Projects")}</Typography>
              {projectStats.length === 0 ? (
                <Typography
                  color="text.secondary"
                  variant="body2"
                  sx={{ textAlign: "center", py: 4 }}
                >
                  {t("analytics.noDeploymentData", "No deployment data")}</Typography>
              ) : (
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                >
                  {projectStats.slice(0, 8).map((p) => (
                    <Box key={p.projectId}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontSize: 13 }}
                        >
                          {p.name}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Chip
                            label={`${p.total}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10, height: 18 }}
                          />
                          <Chip
                            label={`${p.successRate}%`}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 18,
                              bgcolor:
                                p.successRate >= 80
                                  ? "rgba(34,197,94,0.15)"
                                  : "rgba(239,68,68,0.15)",
                              color:
                                p.successRate >= 80 ? "#22c55e" : "#ef4444",
                            }}
                          />
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={p.successRate}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: "rgba(239,68,68,0.15)",
                          "& .MuiLinearProgress-bar": {
                            bgcolor:
                              p.successRate >= 80 ? "#22c55e" : "#f59e0b",
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
