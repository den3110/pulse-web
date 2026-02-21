import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Badge,
  useTheme,
  alpha,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import Skeleton from "@mui/material/Skeleton";
import DeleteIcon from "@mui/icons-material/Delete";
import LanIcon from "@mui/icons-material/Lan";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import SecurityIcon from "@mui/icons-material/Security";
import RouterIcon from "@mui/icons-material/Router";
import PublicIcon from "@mui/icons-material/Public";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import DownloadIcon from "@mui/icons-material/Download";
import InfoIcon from "@mui/icons-material/Info";
import MemoryIcon from "@mui/icons-material/Memory";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import TerminalIcon from "@mui/icons-material/Terminal";
import CloseIcon from "@mui/icons-material/Close";

import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../services/api";
import { useServer } from "../contexts/ServerContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface PortEntry {
  command: string;
  pid: string;
  user: string;
  fd: string;
  type: string;
  device: string;
  sizeOff: string;
  node: string;
  name: string;
}

interface ProcessDetails {
  cpu: string;
  mem: string;
  start: string;
  time: string;
  cmd: string;
}

const PortManager: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { selectedServer } = useServer();
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [procToKill, setProcToKill] = useState<PortEntry | null>(null);

  // Detail Drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProc, setSelectedProc] = useState<PortEntry | null>(null);
  const [procDetails, setProcDetails] = useState<ProcessDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchPorts = async () => {
    if (!selectedServer) return;
    setLoading(true);
    try {
      const res = await api.get(`/ports/${selectedServer._id}`);
      setPorts(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          t("ports.fetchFailed", "Failed to fetch ports"),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedServer) {
      fetchPorts();
    }
  }, [selectedServer]);

  // Auto-refresh logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (autoRefresh && selectedServer) {
      interval = setInterval(fetchPorts, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, selectedServer]);

  const handleKill = async () => {
    if (!selectedServer || !procToKill) return;
    try {
      await api.delete(`/ports/${selectedServer._id}/kill/${procToKill.pid}`);
      toast.success(t("ports.killSuccess", "Process killed successfully"));
      setKillDialogOpen(false);
      setProcToKill(null);
      fetchPorts(); // Refresh
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          t("ports.killFailed", "Failed to kill process"),
      );
    }
  };

  const handleInspect = async (port: PortEntry) => {
    setSelectedProc(port);
    setDetailOpen(true);
    setDetailLoading(true);
    setProcDetails(null);
    try {
      // Add small delay to show loading state (UX)
      // const res = await api.get(`/ports/${selectedServer?._id}/process/${port.pid}`);
      // setProcDetails(res.data);

      // Using promise.all to make it robust
      if (selectedServer) {
        const res = await api.get(
          `/ports/${selectedServer._id}/process/${port.pid}`,
        );
        setProcDetails(res.data);
      }
    } catch (err) {
      console.error(err);
      // toast.error("Failed to fetch process details");
      // Keep null, shows error state in drawer
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = () => {
    if (filteredPorts.length === 0) return;
    const headers = ["Command", "PID", "User", "Protocol", "Address"];
    const rows = filteredPorts.map((p) => [
      p.command,
      p.pid,
      p.user,
      p.node,
      p.name,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `ports_export_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Memoized stats & filtered data
  const { filteredPorts, stats, chartData } = useMemo(() => {
    let filtered = ports;

    // Search
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.command.toLowerCase().includes(lower) ||
          p.pid.includes(lower) ||
          p.name.toLowerCase().includes(lower) ||
          p.user.toLowerCase().includes(lower),
      );
    }

    // Protocol Filter
    if (protocolFilter !== "all") {
      filtered = filtered.filter((p) =>
        p.node.toLowerCase().includes(protocolFilter.toLowerCase()),
      );
    }

    const tcpCount = ports.filter((p) =>
      p.node.toLowerCase().includes("tcp"),
    ).length;
    const udpCount = ports.filter((p) =>
      p.node.toLowerCase().includes("udp"),
    ).length;
    const ipv4Count = ports.filter(
      (p) => p.node.includes("IPv4") || p.node.includes("IP4"),
    ).length;
    const ipv6Count = ports.filter(
      (p) => p.node.includes("IPv6") || p.node.includes("IP6"),
    ).length;

    // Chart Data: Protocol Dist
    const protocolData = [
      { name: "TCP", value: tcpCount, color: theme.palette.info.main },
      { name: "UDP", value: udpCount, color: theme.palette.secondary.main },
    ].filter((d) => d.value > 0);

    // Chart Data: User Dist (Guide)
    const userMap: Record<string, number> = {};
    ports.forEach((p) => {
      userMap[p.user] = (userMap[p.user] || 0) + 1;
    });
    const userData = Object.entries(userMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5

    return {
      filteredPorts: filtered,
      stats: {
        total: ports.length,
        tcp: tcpCount,
        udp: udpCount,
        ipv4: ipv4Count,
        ipv6: ipv6Count,
      },
      chartData: { protocolData, userData },
    };
  }, [ports, searchQuery, protocolFilter, theme]);

  // If no server selected
  if (!selectedServer) {
    return (
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h6" color="text.secondary">
          {t("common.selectServer", "Please select a server to view ports.")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <RouterIcon sx={{ color: "primary.main" }} />
            <Typography variant="body1" fontWeight={500}>
              {t("ports.title", "Network Ports")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
            {t("ports.subtitle", { server: selectedServer?.name })}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                {t("common.autoRefresh", "Auto-refresh")}
              </Typography>
            }
            sx={{ mr: "auto" }} // Push switch to left, buttons to right on mobile
          />
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            size="small"
            sx={{ borderRadius: 2 }}
            disabled={filteredPorts.length === 0}
          >
            Export
          </Button>
          <Button
            variant="contained" // Prominent refresh
            startIcon={<RefreshIcon />}
            onClick={fetchPorts}
            disabled={loading}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            {t("common.refresh", "Refresh")}
          </Button>
        </Box>
      </Box>

      {/* Grid: Stats + Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Stats Cards (Left Side) */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {/* Card: Total Ports */}
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  height: "100%",
                }}
              >
                <CardContent
                  sx={{
                    p: 2,
                    "&:last-child": { pb: 2 },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "white",
                      mb: 1,
                    }}
                  >
                    <LanIcon fontSize="small" />
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    color="primary.main"
                  >
                    {stats.total}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    textTransform="uppercase"
                  >
                    {t("ports.totalOpen", "Total Ports")}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  bgcolor: alpha(theme.palette.info.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  height: "100%",
                }}
              >
                <CardContent
                  sx={{
                    p: 2,
                    "&:last-child": { pb: 2 },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: "50%",
                      bgcolor: "info.main",
                      color: "white",
                      mb: 1,
                    }}
                  >
                    <LockOpenIcon fontSize="small" />
                  </Box>
                  <Typography variant="h4" fontWeight={800} color="info.main">
                    {stats.tcp}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    textTransform="uppercase"
                  >
                    TCP Ports
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  bgcolor: alpha(theme.palette.secondary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                  height: "100%",
                }}
              >
                <CardContent
                  sx={{
                    p: 2,
                    "&:last-child": { pb: 2 },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: "50%",
                      bgcolor: "secondary.main",
                      color: "white",
                      mb: 1,
                    }}
                  >
                    <RouterIcon fontSize="small" />
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    color="secondary.main"
                  >
                    {stats.udp}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    textTransform="uppercase"
                  >
                    UDP Ports
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card
                sx={{
                  bgcolor: alpha(theme.palette.warning.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  height: "100%",
                }}
              >
                <CardContent
                  sx={{
                    p: 2,
                    "&:last-child": { pb: 2 },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: "50%",
                      bgcolor: "warning.main",
                      color: "white",
                      mb: 1,
                    }}
                  >
                    <SecurityIcon fontSize="small" />
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    color="warning.main"
                  >
                    {ports.filter((p) => p.user === "root").length}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    textTransform="uppercase"
                  >
                    Root Procs
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* User Distribution Bar Chart */}
          <Paper
            sx={{ mt: 2, p: 2, borderRadius: 2, height: 250 }}
            elevation={0}
            variant="outlined"
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Top Users by Open Ports
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.userData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke={theme.palette.divider}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip
                  cursor={{ fill: alpha(theme.palette.primary.main, 0.1) }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    background: theme.palette.background.paper,
                    boxShadow: theme.shadows[3],
                  }}
                />
                <Bar
                  dataKey="value"
                  fill={theme.palette.primary.main}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Pie Chart (Right Side) */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              height: "100%",
              minHeight: 400,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
            elevation={0}
            variant="outlined"
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Protocol Distribution
            </Typography>
            <Box sx={{ flex: 1, width: "100%", minHeight: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.protocolData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.protocolData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "center",
                mt: 2,
              }}
            >
              {chartData.protocolData.map((d) => (
                <Box
                  key={d.name}
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: d.color,
                    }}
                  />
                  <Typography variant="caption" fontWeight={600}>
                    {d.name} ({d.value})
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Toolbar */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            placeholder={t(
              "ports.searchPlaceholder",
              "Search by PID, Name, Port...",
            )}
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />

          <FormControl size="small" variant="outlined" sx={{ minWidth: 150 }}>
            <InputLabel>{t("ports.protocol", "Protocol")}</InputLabel>
            <Select
              label={t("ports.protocol", "Protocol")}
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <FilterListIcon fontSize="small" />
                </InputAdornment>
              }
            >
              <MenuItem value="all">
                <em>All</em>
              </MenuItem>
              <MenuItem value="tcp">TCP</MenuItem>
              <MenuItem value="udp">UDP</MenuItem>
              <MenuItem value="ipv4">IPv4</MenuItem>
              <MenuItem value="ipv6">IPv6</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        <TableContainer sx={{ maxHeight: "60vh" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                >
                  {t("ports.command", "Command")}
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                >
                  PID
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                >
                  {t("ports.user", "User")}
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                >
                  {t("ports.proto", "Proto")}
                </TableCell>
                <TableCell
                  sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                >
                  {t("ports.address", "Address (Name)")}
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    textAlign: "right",
                    bgcolor: "background.paper",
                  }}
                >
                  {t("common.actions", "Actions")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && ports.length === 0 ? (
                [0, 1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton variant="text" width={120} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width={50} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width={80} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width={40} />
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="text" width={150} />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton
                        variant="circular"
                        width={28}
                        height={28}
                        sx={{ ml: "auto" }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredPorts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">
                      {loading
                        ? "Searching..."
                        : t("ports.noPortsFound", "No matching ports found.")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPorts.map((port, index) => (
                  <TableRow
                    key={`${port.pid}-${index}`}
                    hover
                    sx={{
                      "&:hover": { bgcolor: "action.hover", cursor: "pointer" },
                      transition: "background-color 0.1s",
                    }}
                    onClick={() => handleInspect(port)}
                  >
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Badge
                          variant="dot"
                          color={port.user === "root" ? "error" : "default"}
                        >
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: "primary.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <LanIcon fontSize="small" />
                          </Box>
                        </Badge>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {port.command}
                          </Typography>
                          {/* <Typography variant="caption" color="text.secondary">{port.name}</Typography> */}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={port.pid}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontFamily: "monospace",
                          fontWeight: 500,
                          borderRadius: 1,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {port.user}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={port.node}
                        size="small"
                        sx={{
                          borderRadius: 1,
                          bgcolor: port.node.toLowerCase().includes("tcp")
                            ? alpha(theme.palette.info.main, 0.1)
                            : alpha(theme.palette.secondary.main, 0.1),
                          color: port.node.toLowerCase().includes("tcp")
                            ? "info.main"
                            : "secondary.main",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        sx={{
                          bgcolor: "action.hover",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          display: "inline-block",
                        }}
                      >
                        {port.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("ports.killProcess", "Kill Process")}>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProcToKill(port);
                            setKillDialogOpen(true);
                          }}
                          sx={{
                            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                            "&:hover": {
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {t("ports.showingCount", {
              count: filteredPorts.length,
              total: ports.length,
            })}
          </Typography>
        </Box>
      </Paper>

      {/* Kill Confirmation Dialog */}
      <Dialog open={killDialogOpen} onClose={() => setKillDialogOpen(false)}>
        <DialogTitle
          sx={{
            color: "error.main",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <DeleteIcon />
          {t("ports.confirmKill", "Confirm Kill")}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t(
              "ports.killWarning",
              "Are you sure you want to force kill process",
            )}{" "}
            <strong>{procToKill?.command}</strong> (PID: {procToKill?.pid})?
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mt: 1,
              display: "block",
              bgcolor: alpha(theme.palette.error.main, 0.1),
              p: 1,
              borderRadius: 1,
              borderLeft: `3px solid ${theme.palette.error.main}`,
            }}
          >
            {t(
              "ports.killDataLoss",
              "This action cannot be undone and may cause data loss or system instability if a critical process is stopped.",
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKillDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleKill}>
            {t("ports.killCTA", "Kill Process")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process Detail Drawer */}
      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 400 }, p: 0 },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Process Details
          </Typography>
          <IconButton onClick={() => setDetailOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        {detailLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: 200,
            }}
          >
            <CircularProgress />
          </Box>
        ) : !selectedProc ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">No process selected</Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: "primary.soft",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "primary.main",
                }}
              >
                <TerminalIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {selectedProc.command}
                </Typography>
                <Chip
                  label={`PID: ${selectedProc.pid}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: "monospace" }}
                />
              </Box>
            </Box>

            <List disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="User"
                  secondary={selectedProc.user}
                  primaryTypographyProps={{
                    variant: "caption",
                    color: "text.secondary",
                  }}
                  secondaryTypographyProps={{
                    variant: "body1",
                    color: "text.primary",
                    fontWeight: 500,
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <MemoryIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Resource Usage"
                  secondary={
                    procDetails
                      ? `CPU: ${procDetails.cpu}% | MEM: ${procDetails.mem}%`
                      : "Loading..."
                  }
                  primaryTypographyProps={{
                    variant: "caption",
                    color: "text.secondary",
                  }}
                  secondaryTypographyProps={{
                    variant: "body1",
                    color: "text.primary",
                    fontWeight: 500,
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <AccessTimeIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Execution Time"
                  secondary={
                    procDetails
                      ? `${procDetails.time} (Started: ${procDetails.start.slice(0, 10)}...)`
                      : "Loading..."
                  }
                  primaryTypographyProps={{
                    variant: "caption",
                    color: "text.secondary",
                  }}
                  secondaryTypographyProps={{
                    variant: "body1",
                    color: "text.primary",
                    fontWeight: 500,
                  }}
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" color="text.secondary" gutterBottom>
              FULL COMMAND
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: "background.default",
                fontFamily: "monospace",
                fontSize: 13,
                wordBreak: "break-all",
              }}
            >
              {procDetails ? procDetails.cmd : selectedProc.command}
            </Paper>

            <Box sx={{ mt: 4 }}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setProcToKill(selectedProc);
                  setKillDialogOpen(true);
                }}
              >
                Kill Process
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

export default PortManager;
