import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
  Grid,
  LinearProgress,
  Stack,
  Chip,
  Alert,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { useServer } from "../contexts/ServerContext";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import CircleIcon from "@mui/icons-material/Circle";

interface StatsData {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
}

interface ServerStats {
  cpu: string;
  cpuUsage: number;
  memory: {
    total: string;
    used: string;
    free: string;
    percent: string;
  };
  memoryUsage: number;
  disk: {
    total: string;
    used: string;
    free: string;
    percent: string;
  };
  diskUsage: number;
  uptime: string;
  loadAvg: string;
}

const ServerResourceChart: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { selectedServer } = useServer();

  const [data, setData] = useState<StatsData[]>([]);
  const [currentStats, setCurrentStats] = useState<ServerStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Initial loading state

  // Ref to keep track of polling interval
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Function to fetch history
  const fetchHistory = async () => {
    if (!selectedServer?._id) return;
    try {
      const { data } = await api.get(
        `/servers/${selectedServer._id}/stats/history`,
      );
      if (Array.isArray(data)) {
        const historyData = data.map((item: any) => ({
          time: new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          cpu: item.cpu || 0,
          memory: item.memory || 0,
          disk: item.disk || 0,
        }));
        setData(historyData);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  // Function to fetch current stats (polling)
  const fetchStats = async () => {
    if (!selectedServer?._id) return;

    try {
      const response = await api.get(`/servers/${selectedServer._id}/stats`);
      const stats = response.data.stats || response.data;

      setCurrentStats(stats);
      setError("");

      setData((prevData) => {
        const newDataPoint: StatsData = {
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          cpu: stats.cpuUsage || 0,
          memory: stats.memoryUsage || 0,
          disk: stats.diskUsage || 0,
        };
        const newData = [...prevData, newDataPoint];
        // Keep last 30 points
        if (newData.length > 30) newData.shift();
        return newData;
      });
    } catch (err: any) {
      console.error("Failed to fetch stats:", err);
      if (!currentStats) {
        setError(t("dashboard.statsError"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset data when server changes
    setData([]);
    setCurrentStats(null);
    setError("");
    setLoading(true);

    if (selectedServer?._id) {
      // Initial fetch of history
      fetchHistory().then(() => {
        setLoading(false);
        // Fetch current stats immediately to get the very latest
        fetchStats();
      });

      // Start polling
      intervalRef.current = setInterval(fetchStats, 3000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedServer?._id]);

  if (!selectedServer) {
    return (
      <Card
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          {t("dashboard.selectServerToViewStats")}
        </Typography>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* CPU & Memory Chart */}
      <Grid item xs={12} md={8}>
        <Card sx={{ height: "100%", minHeight: 400 }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                {t("dashboard.systemResources")}
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircleIcon
                    sx={{ fontSize: 12, color: theme.palette.primary.main }}
                  />
                  <Typography variant="caption">CPU</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircleIcon
                    sx={{ fontSize: 12, color: theme.palette.secondary.main }}
                  />
                  <Typography variant="caption">RAM</Typography>
                </Box>
              </Box>
            </Box>

            {loading && !currentStats ? (
              <LinearProgress />
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={theme.palette.primary.main}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={theme.palette.primary.main}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={theme.palette.secondary.main}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={theme.palette.secondary.main}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.palette.divider}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke={theme.palette.primary.main}
                    fillOpacity={1}
                    fill="url(#colorCpu)"
                    strokeWidth={2}
                    name="CPU Usage"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    stroke={theme.palette.secondary.main}
                    fillOpacity={1}
                    fill="url(#colorMem)"
                    strokeWidth={2}
                    name="Memory Usage"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Current Stats Summary */}
      <Grid item xs={12} md={4}>
        <Stack spacing={3} sx={{ height: "100%" }}>
          {/* Server Info Card */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedServer.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                noWrap
                gutterBottom
              >
                {selectedServer.host}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  label={
                    currentStats?.uptime
                      ? `Uptime: ${currentStats.uptime}`
                      : "Checking..."
                  }
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Disk Usage Card */}
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <StorageIcon color="action" />
                <Typography variant="subtitle1">Disk Usage</Typography>
              </Box>

              {currentStats ? (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">
                      Root (/) {currentStats.disk.percent}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentStats.disk.used} / {currentStats.disk.total}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={currentStats.diskUsage}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: theme.palette.action.hover,
                      "& .MuiLinearProgress-bar": {
                        bgcolor:
                          currentStats.diskUsage > 90
                            ? "error.main"
                            : "primary.main",
                      },
                    }}
                  />
                </>
              ) : (
                <LinearProgress />
              )}
            </CardContent>
          </Card>

          {/* Memory Details Card */}
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <MemoryIcon color="action" />
                <Typography variant="subtitle1">Memory Details</Typography>
              </Box>
              {currentStats ? (
                <Stack spacing={1}>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Total
                    </Typography>
                    <Typography variant="body2">
                      {currentStats.memory.total}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Used
                    </Typography>
                    <Typography variant="body2">
                      {currentStats.memory.used}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Free
                    </Typography>
                    <Typography variant="body2">
                      {currentStats.memory.free}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <LinearProgress />
              )}
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
};

export default ServerResourceChart;
