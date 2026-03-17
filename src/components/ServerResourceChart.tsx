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
    <Grid container spacing={3} sx={{ alignItems: "stretch" }}>
      {/* CPU & Memory Chart */}
      <Grid item xs={12} md={8}>
        <Card
          sx={{
            height: "100%",
            minHeight: 400,
            background:
              theme.palette.mode === "dark"
                ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
                : "none",
            backdropFilter: "blur(20px)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 4,
              }}
            >
              <Typography
                variant="h6"
                sx={{
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
                {t("dashboard.systemResources")}
              </Typography>
              <Box sx={{ display: "flex", gap: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <CircleIcon
                    sx={{ fontSize: 10, color: theme.palette.primary.main }}
                  />
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color="text.secondary"
                  >
                    CPU
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <CircleIcon
                    sx={{ fontSize: 10, color: theme.palette.secondary.main }}
                  />
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    color="text.secondary"
                  >
                    RAM
                  </Typography>
                </Box>
              </Box>
            </Box>

            {loading && !currentStats ? (
              <LinearProgress sx={{ borderRadius: 2 }} />
            ) : error ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            ) : (
              <Box sx={{ height: 300, width: "100%", ml: -2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={theme.palette.primary.main}
                          stopOpacity={0.4}
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
                          stopOpacity={0.4}
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
                      stroke="rgba(150,150,150,0.1)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="time"
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      unit="%"
                      dx={-10}
                    />
                    <Tooltip
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
                      dataKey="cpu"
                      stroke={theme.palette.primary.main}
                      fillOpacity={1}
                      fill="url(#colorCpu)"
                      strokeWidth={3}
                      name="CPU Usage"
                      dot={{ r: 0 }}
                      activeDot={{
                        r: 6,
                        strokeWidth: 0,
                        fill: theme.palette.primary.main,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="memory"
                      stroke={theme.palette.secondary.main}
                      fillOpacity={1}
                      fill="url(#colorMem)"
                      strokeWidth={3}
                      name="Memory Usage"
                      dot={{ r: 0 }}
                      activeDot={{
                        r: 6,
                        strokeWidth: 0,
                        fill: theme.palette.secondary.main,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Current Stats Summary */}
      <Grid item xs={12} md={4}>
        <Stack spacing={3} sx={{ height: "100%" }}>
          {/* Server Info Card */}
          <Card
            sx={{
              background:
                theme.palette.mode === "dark"
                  ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
                  : "none",
              backdropFilter: "blur(20px)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {selectedServer.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                fontFamily="'JetBrains Mono', monospace"
                noWrap
                gutterBottom
              >
                {selectedServer.host}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Chip
                  label={
                    currentStats?.uptime
                      ? `Uptime: ${currentStats.uptime}`
                      : "Checking..."
                  }
                  size="small"
                  color={currentStats?.uptime ? "success" : "default"}
                  sx={{
                    fontWeight: 600,
                    borderRadius: 1.5,
                    bgcolor: currentStats?.uptime
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(150, 150, 150, 0.1)",
                    color: currentStats?.uptime ? "#10b981" : "text.secondary",
                    border: "none",
                  }}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Disk Usage & Memory Details side-by-side or stacked */}
          <Card
            sx={{
              flex: 1,
              background:
                theme.palette.mode === "dark"
                  ? "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)"
                  : "none",
              backdropFilter: "blur(20px)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              {/* Box 1: Disk */}
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <StorageIcon
                      sx={{ fontSize: 18, color: "text.secondary" }}
                    />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    color="text.secondary"
                    textTransform="uppercase"
                    letterSpacing="0.05em"
                  >
                    Disk Usage
                  </Typography>
                </Box>

                {currentStats ? (
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1.5,
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        Root (/) {currentStats.disk.percent}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {currentStats.disk.used} / {currentStats.disk.total}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={currentStats.diskUsage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.05)",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 4,
                          bgcolor:
                            currentStats.diskUsage > 90
                              ? "error.main"
                              : "primary.main",
                        },
                      }}
                    />
                  </>
                ) : (
                  <LinearProgress sx={{ borderRadius: 2 }} />
                )}
              </Box>

              {/* Box 2: Memory */}
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <MemoryIcon
                      sx={{ fontSize: 18, color: "text.secondary" }}
                    />
                  </Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    color="text.secondary"
                    textTransform="uppercase"
                    letterSpacing="0.05em"
                  >
                    Memory Details
                  </Typography>
                </Box>
                {currentStats ? (
                  <Stack
                    spacing={1.5}
                    sx={{
                      bgcolor: "rgba(0,0,0,0.1)",
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight={500}
                      >
                        Total
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {currentStats.memory.total}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight={500}
                      >
                        Used
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {currentStats.memory.used}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight={500}
                      >
                        Free
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {currentStats.memory.free}
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <LinearProgress sx={{ borderRadius: 2 }} />
                )}
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
};

export default ServerResourceChart;
