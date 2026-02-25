import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Slider,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
} from "@mui/material";
import {
  History as HistoryIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import api from "../services/api";

interface Snapshot {
  _id: string;
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  topProcesses: {
    pid: number;
    user: string;
    cpu: number;
    memory: number;
    command: string;
  }[];
  networkStats: {
    totalConnections: number;
    established: number;
    timeWait: number;
  };
  recentLogs: string[];
}

export const ServerTimeMachine: React.FC<{ serverId: string }> = ({
  serverId,
}) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [sliderValue, setSliderValue] = useState<number>(0);

  const fetchSnapshots = async () => {
    try {
      const { data } = await api.get(`/servers/${serverId}/snapshots?limit=50`);
      setSnapshots(data); // data is chronological if reverse() was used in backend
      if (data.length > 0) {
        setSliderValue(data.length - 1);
      }
    } catch (err) {
      console.error("Failed to fetch snapshots", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [serverId]);

  if (loading) {
    return <CircularProgress sx={{ display: "block", m: "2rem auto" }} />;
  }

  if (snapshots.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 4, textAlign: "center" }}>
        No historical snapshots available. The system will capture one every 5
        minutes automatically.
      </Typography>
    );
  }

  const currentSnapshot = snapshots[sliderValue];
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const marks = snapshots.map((s, index) => ({
    value: index,
    label:
      index === 0 || index === snapshots.length - 1
        ? formatTime(s.timestamp)
        : "",
  }));

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        <HistoryIcon color="primary" fontSize="large" />
        <Box>
          <Typography variant="h6">Infrastructure Time Machine</Typography>
          <Typography variant="body2" color="text.secondary">
            Scrub back in time to investigate past CPU/Memory spikes and process
            crashes.
          </Typography>
        </Box>
      </Box>

      {/* Timeline Slider & Chart */}
      <Card sx={{ mb: 4, p: 3, border: "1px solid rgba(255,255,255,0.1)" }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Time:{" "}
          <span style={{ color: "#4ade80", fontWeight: "bold" }}>
            {formatTime(currentSnapshot.timestamp)}
          </span>
        </Typography>

        <Box sx={{ width: "100%", height: 200, mb: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={snapshots.map((s, i) => ({
                index: i,
                time: new Date(s.timestamp).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                cpu: parseFloat(s.cpuUsage.toFixed(1)),
                memory: parseFloat(s.memoryUsage.toFixed(1)),
              }))}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              onClick={(e) => {
                if (e && typeof e.activeTooltipIndex === "number") {
                  setSliderValue(e.activeTooltipIndex);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="time"
                stroke="#888"
                fontSize={12}
                tickMargin={10}
              />
              <YAxis stroke="#888" fontSize={12} domain={[0, 100]} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "#1e1e1e",
                  border: "1px solid #333",
                  borderRadius: 4,
                }}
                itemStyle={{ color: "#fff" }}
              />
              <ReferenceLine
                x={new Date(currentSnapshot.timestamp).toLocaleTimeString(
                  "vi-VN",
                  { hour: "2-digit", minute: "2-digit" },
                )}
                stroke="#4ade80"
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="cpu"
                name="CPU %"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="memory"
                name="Memory %"
                stroke="#ec4899"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Box sx={{ px: 3 }}>
          <Slider
            value={sliderValue}
            min={0}
            max={snapshots.length - 1}
            step={1}
            marks={marks}
            onChange={(_, val) => setSliderValue(val as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(val) => formatTime(snapshots[val].timestamp)}
            sx={{
              "& .MuiSlider-markLabel": {
                color: "text.secondary",
                fontSize: "0.75rem",
                mt: 1,
              },
            }}
          />
        </Box>
      </Card>

      {/* Snapshot Details */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: "100%", bgcolor: "background.paper" }}>
            <CardContent>
              <Typography
                variant="subtitle2"
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <AssessmentIcon fontSize="small" /> System Usage
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  CPU Usage
                </Typography>
                <Typography variant="h6">
                  {currentSnapshot.cpuUsage.toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Memory Usage
                </Typography>
                <Typography variant="h6">
                  {currentSnapshot.memoryUsage.toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Network Connections
                </Typography>
                <Typography variant="h6">
                  {currentSnapshot.networkStats.totalConnections}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Established: {currentSnapshot.networkStats.established} •
                  TimeWait: {currentSnapshot.networkStats.timeWait}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{ p: 2, borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                Top 10 Processes (By CPU)
              </Typography>
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ bgcolor: "transparent" }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        "& th": {
                          color: "text.secondary",
                          fontSize: "0.75rem",
                        },
                      }}
                    >
                      <TableCell>PID</TableCell>
                      <TableCell>USER</TableCell>
                      <TableCell align="right">%CPU</TableCell>
                      <TableCell align="right">%MEM</TableCell>
                      <TableCell>COMMAND</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentSnapshot.topProcesses.map((p, idx) => (
                      <TableRow
                        key={idx}
                        hover
                        sx={{
                          "& td": {
                            py: 1,
                            fontSize: "0.8rem",
                            borderBottom: 0,
                          },
                        }}
                      >
                        <TableCell>{p.pid}</TableCell>
                        <TableCell>{p.user}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: p.cpu > 50 ? "error.main" : "inherit" }}
                        >
                          {p.cpu}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: p.memory > 50 ? "warning.main" : "inherit",
                          }}
                        >
                          {p.memory}
                        </TableCell>
                        <TableCell
                          sx={{ fontFamily: "monospace", color: "#ccc" }}
                        >
                          {p.command}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                System Logs at exactly {formatTime(currentSnapshot.timestamp)}
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#0c0c0c",
                  borderRadius: 1,
                  maxHeight: 250,
                  overflow: "auto",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  color: "#ccc",
                }}
              >
                {currentSnapshot.recentLogs.length > 0 ? (
                  currentSnapshot.recentLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))
                ) : (
                  <span style={{ color: "#666" }}>No logs found...</span>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
