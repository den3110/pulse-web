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
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import api from "../services/api";
import { getSocket } from "../services/socket";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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

    // Listen for real-time snapshot updates
    const socket = getSocket();
    if (socket) {
      const handleNewSnapshot = (data: {
        serverId: string;
        snapshot: Snapshot;
      }) => {
        if (data.serverId === serverId) {
          setSnapshots((prev) => {
            const newSnapshots = [...prev, data.snapshot];
            // If the user was viewing the *previous* latest snapshot, advance the slider automatically
            setSliderValue((currentSliderVal) => {
              if (currentSliderVal === prev.length - 1) {
                return newSnapshots.length - 1;
              }
              return currentSliderVal;
            });
            // Keep only latest 50 to prevent memory leak on frontend
            if (newSnapshots.length > 50) {
              return newSnapshots.slice(newSnapshots.length - 50);
            }
            return newSnapshots;
          });
        }
      };

      socket.on("server:snapshot", handleNewSnapshot);

      return () => {
        socket.off("server:snapshot", handleNewSnapshot);
      };
    }
  }, [serverId]);

  if (loading) {
    return <CircularProgress sx={{ display: "block", m: "2rem auto" }} />;
  }

  if (snapshots.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ p: 4, textAlign: "center" }}>
        {t("timeMachine.noSnapshots")}
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
          <Typography variant="h6">{t("timeMachine.title")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("timeMachine.subtitle")}
          </Typography>
        </Box>
      </Box>

      {/* Timeline Slider & Chart */}
      <Card sx={{ mb: 4, p: 3, border: "1px solid rgba(255,255,255,0.1)" }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          {t("timeMachine.time")}{" "}
          <span style={{ color: "#4ade80", fontWeight: "bold" }}>
            {formatTime(currentSnapshot.timestamp)}
          </span>
        </Typography>

        <Box sx={{ width: "100%", height: 250, mb: 4, cursor: "pointer" }}>
          <HighchartsReact
            highcharts={Highcharts}
            options={{
              chart: {
                type: "spline",
                backgroundColor: "transparent",
                style: { fontFamily: "'Inter', 'Roboto', sans-serif" },
                events: {
                  click: function (e: any) {
                    if (e.xAxis && e.xAxis[0]) {
                      const clickedTime = e.xAxis[0].value;
                      let closestIdx = 0;
                      let minDiff = Infinity;
                      snapshots.forEach((s, idx) => {
                        const diff = Math.abs(
                          new Date(s.timestamp).getTime() - clickedTime,
                        );
                        if (diff < minDiff) {
                          minDiff = diff;
                          closestIdx = idx;
                        }
                      });
                      setSliderValue(closestIdx);
                    }
                  },
                },
              },
              title: { text: null },
              xAxis: {
                type: "datetime",
                gridLineWidth: 0,
                labels: { style: { color: "#a0aec0" } },
                lineColor: "#2d3748",
                plotLines: [
                  {
                    color: "#4ade80",
                    width: 2,
                    value: new Date(currentSnapshot.timestamp).getTime(),
                    dashStyle: "Dash",
                  },
                ],
              },
              yAxis: {
                title: { text: null },
                gridLineDashStyle: "Dash",
                gridLineColor: "#2d3748",
                labels: {
                  style: { color: "#a0aec0" },
                  formatter: function (
                    this: Highcharts.AxisLabelsFormatterContextObject,
                  ) {
                    return this.value + "%";
                  },
                },
                max: 100,
                min: 0,
              },
              tooltip: {
                shared: true,
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                borderWidth: 1,
                borderColor: "#2d3748",
                borderRadius: 8,
                style: { color: "#fff" },
                valueSuffix: "%",
              },
              plotOptions: {
                series: {
                  cursor: "pointer",
                  marker: {
                    enabled: false,
                    states: { hover: { enabled: true, radius: 5 } },
                  },
                  events: {
                    click: function (e: any) {
                      const clickedTime = e.point.x;
                      let closestIdx = 0;
                      let minDiff = Infinity;
                      snapshots.forEach((s, idx) => {
                        const diff = Math.abs(
                          new Date(s.timestamp).getTime() - clickedTime,
                        );
                        if (diff < minDiff) {
                          minDiff = diff;
                          closestIdx = idx;
                        }
                      });
                      setSliderValue(closestIdx);
                    },
                  },
                },
              },
              legend: {
                itemStyle: { color: "#a0aec0", fontWeight: "500" },
                itemHoverStyle: { color: "#fff" },
              },
              series: [
                {
                  name: "CPU %",
                  data: snapshots.map((s) => [
                    new Date(s.timestamp).getTime(),
                    parseFloat(s.cpuUsage.toFixed(1)),
                  ]),
                  color: "#3b82f6",
                  lineWidth: 3,
                },
                {
                  name: "Memory %",
                  data: snapshots.map((s) => [
                    new Date(s.timestamp).getTime(),
                    parseFloat(s.memoryUsage.toFixed(1)),
                  ]),
                  color: "#ec4899",
                  lineWidth: 3,
                },
              ],
              credits: { enabled: false },
            }}
          />
        </Box>

        <Box sx={{ px: 5, pb: 4, pt: 2 }}>
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
                whiteSpace: "nowrap",
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
                <AssessmentIcon fontSize="small" />{" "}
                {t("timeMachine.systemUsage")}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {t("timeMachine.cpuUsage")}
                </Typography>
                <Typography variant="h6">
                  {currentSnapshot.cpuUsage.toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {t("timeMachine.memoryUsage")}
                </Typography>
                <Typography variant="h6">
                  {currentSnapshot.memoryUsage.toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {t("timeMachine.networkConnections")}
                </Typography>
                <Typography variant="h6">
                  {currentSnapshot.networkStats.totalConnections}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("timeMachine.established")}{" "}
                  {currentSnapshot.networkStats.established} •
                  {t("timeMachine.timeWait")}{" "}
                  {currentSnapshot.networkStats.timeWait}
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
                {t("timeMachine.topProcesses")}
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
                {t("timeMachine.systemLogsAt")}{" "}
                {formatTime(currentSnapshot.timestamp)}
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#0c0c0c",
                  borderRadius: 1,
                  maxHeight: 250,
                  overflow: "auto",
                  fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
                  fontSize: "0.8rem",
                  color: "#e2e8f0",
                }}
              >
                {currentSnapshot.recentLogs.length > 0 ? (
                  currentSnapshot.recentLogs.map((log, i) => {
                    // Sophisticated regex to catch common syslog dates (e.g., "Feb 25 05:19:26")
                    const match = log.match(
                      /^([A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(.*)$/,
                    );
                    if (match) {
                      return (
                        <div
                          key={i}
                          style={{
                            marginBottom: "2px",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          <span
                            style={{ color: "#60a5fa", marginRight: "8px" }}
                          >
                            [{match[1]}]
                          </span>
                          <span style={{ color: "#cbd5e1" }}>{match[2]}</span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={i}
                        style={{
                          marginBottom: "2px",
                          whiteSpace: "pre-wrap",
                          color: "#94a3b8",
                        }}
                      >
                        {log}
                      </div>
                    );
                  })
                ) : (
                  <span style={{ color: "#64748b", fontStyle: "italic" }}>
                    {t("timeMachine.noLogsFound")}
                  </span>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
