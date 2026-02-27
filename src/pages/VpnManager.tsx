import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Switch,
  Skeleton,
  LinearProgress,
  Tabs,
  Tab,
} from "@mui/material";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AddIcon from "@mui/icons-material/Add";
import VpnLockIcon from "@mui/icons-material/VpnLock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SpeedIcon from "@mui/icons-material/Speed";
import GroupIcon from "@mui/icons-material/Group";
import SEO from "../components/SEO";
import { useServer } from "../contexts/ServerContext";

interface VpnClient {
  id: string;
  name: string;
  enabled: boolean;
  address: string;
  publicKey: string;
  createdAt: string;
  updatedAt: string;
  persistentKeepalive: string;
  latestHandshakeAt: string;
  transferRx: number;
  transferTx: number;
}

interface InstallStep {
  step: number;
  message: string;
  status: "running" | "done" | "error";
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ──── Memoized Client Card Component ────
const ClientCard = React.memo(
  ({
    client,
    onToggle,
    onDownload,
    onViewQr,
    onDelete,
    t,
  }: {
    client: VpnClient;
    onToggle: (id: string, enabled: boolean) => void;
    onDownload: (id: string, name: string) => void;
    onViewQr: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
    t: any;
  }) => {
    return (
      <Card
        sx={{
          "&:hover": { bgcolor: "action.hover" },
          transition: "background 0.2s",
        }}
      >
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            {/* Info */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                minWidth: 200,
              }}
            >
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  {client.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "monospace", color: "text.secondary" }}
                >
                  {client.address}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  ml: 2,
                  "& .MuiTypography-root": { fontSize: 11 },
                }}
              >
                <Tooltip title="Download / Rx">
                  <Box
                    sx={{
                      bgcolor: "action.selected",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                    }}
                  >
                    <Typography color="success.main">
                      ↓ {formatBytes(client.transferRx)}
                    </Typography>
                  </Box>
                </Tooltip>
                <Tooltip title="Upload / Tx">
                  <Box
                    sx={{
                      bgcolor: "action.selected",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                    }}
                  >
                    <Typography color="info.main">
                      ↑ {formatBytes(client.transferTx)}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Switch
                size="small"
                checked={client.enabled}
                onChange={(e) => onToggle(client.id, e.target.checked)}
              />
              <Tooltip title={t("vpn.downloadConfig", "Download Config")}>
                <IconButton
                  size="small"
                  onClick={() => onDownload(client.id, client.name)}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("vpn.viewQr", "View QR Code")}>
                <IconButton
                  size="small"
                  onClick={() => onViewQr(client.id, client.name)}
                >
                  <QrCodeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("common.delete", "Delete")}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(client.id, client.name)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  },
);

ClientCard.displayName = "ClientCard";

// ──── Main Manager ────
const VpnManager: React.FC = () => {
  const { t } = useTranslation();
  const { selectedServer } = useServer();

  // Status
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    installed: boolean;
    status: string;
    clients: VpnClient[];
  } | null>(null);

  // Tabs
  const [currentTab, setCurrentTab] = useState(0);

  // Install
  const [installDialog, setInstallDialog] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installSteps, setInstallSteps] = useState<InstallStep[]>([]);
  const [installConfig, setInstallConfig] = useState({
    wgHost: "",
    wgPort: 51820,
    apiPort: 51821,
    wgDefaultAddress: "10.8.0.x",
    wgAllowedIps: "0.0.0.0/0, ::/0",
  });

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Client create
  const [createDialog, setCreateDialog] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [creating, setCreating] = useState(false);

  // QR dialog
  const [qrDialog, setQrDialog] = useState<{
    open: boolean;
    svg: string;
    name: string;
  }>({
    open: false,
    svg: "",
    name: "",
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const serverId = selectedServer?._id;

  // ──── Fetch Status (silent mode when data already exists) ────
  const fetchStatus = useCallback(
    async (silent = false) => {
      if (!serverId) return;
      if (!silent) setLoading(true);
      try {
        const { data } = await api.get(`/vpn/${serverId}/status`);
        setStatus(data);
      } catch (error: any) {
        if (error.response?.status !== 404) {
          if (!silent) toast.error("Failed to load VPN status");
        }
      } finally {
        setLoading(false);
      }
    },
    [serverId],
  );

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds to update bandwidth stats visually
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // ──── Install via SSE ────
  const openInstallDialog = () => {
    setInstallConfig((prev) => ({
      ...prev,
      wgHost: selectedServer?.host || "",
    }));
    setInstallSteps([]);
    setInstallDialog(true);
  };

  const handleInstall = async () => {
    if (!serverId) return;
    setInstalling(true);
    setInstallSteps([]);

    const token = localStorage.getItem("accessToken");
    const API_URL = import.meta.env.VITE_API_URL || "";

    try {
      const response = await fetch(`${API_URL}/api/vpn/${serverId}/install`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(installConfig),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n");
            let event = "message";
            let dataStr = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) event = line.slice(7);
              if (line.startsWith("data: ")) dataStr = line.slice(6);
            }

            if (dataStr) {
              try {
                const json = JSON.parse(dataStr);
                if (event === "progress") {
                  setInstallSteps((prev) => {
                    const updated = prev.map((s) => ({
                      ...s,
                      status: "done" as const,
                    }));
                    return [
                      ...updated,
                      {
                        step: json.step,
                        message: json.message,
                        status: "running",
                      },
                    ];
                  });
                } else if (event === "complete") {
                  setInstallSteps((prev) =>
                    prev.map((s) => ({ ...s, status: "done" as const })),
                  );
                  toast.success(json.message || "VPN installed!");
                  fetchStatus();
                } else if (event === "error") {
                  setInstallSteps((prev) => {
                    const updated = [...prev];
                    if (updated.length > 0) {
                      updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        status: "error",
                        message: json.message,
                      };
                    }
                    return updated;
                  });
                  toast.error(json.message || "Install failed");
                }
              } catch {
                /* ignore parse errors */
              }
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to install VPN");
    } finally {
      setInstalling(false);
    }
  };

  // ──── Container Action ────
  const executeContainerAction = async (
    action: "start" | "stop" | "restart" | "remove",
  ) => {
    setActionLoading(action);
    try {
      await api.post(`/vpn/${serverId}/action`, { action });
      toast.success(t("vpn.actionSuccess", "Action successful"));
      fetchStatus(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("common.failed"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleContainerAction = async (
    action: "start" | "stop" | "restart" | "remove",
  ) => {
    if (!serverId) return;
    if (action === "remove") {
      setConfirmDialog({
        open: true,
        title: t("common.confirm", "Confirm"),
        message: t(
          "vpn.confirmRemove",
          "Are you sure you want to completely remove the VPN Server? All clients will be deleted.",
        ),
        onConfirm: () => {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          executeContainerAction(action);
        },
      });
      return;
    }
    await executeContainerAction(action);
  };

  // ──── Client CRUD ────
  const handleCreateClient = async () => {
    if (!serverId || !newClientName.trim()) return;
    setCreating(true);
    try {
      await api.post(`/vpn/${serverId}/clients`, { name: newClientName });
      toast.success(t("vpn.clientCreated", "Client created"));
      setCreateDialog(false);
      setNewClientName("");
      fetchStatus(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("common.failed"));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClient = useCallback(
    async (clientId: string, clientName: string) => {
      if (!serverId) return;
      setConfirmDialog({
        open: true,
        title: t("common.confirm", "Confirm"),
        message: t("vpn.confirmDeleteClient", "Remove client {{name}}?", {
          name: clientName,
        }),
        onConfirm: async () => {
          setConfirmDialog((prev) => ({ ...prev, open: false }));
          try {
            await api.delete(`/vpn/${serverId}/clients/${clientId}`);
            toast.success(t("vpn.clientDeleted", "Client deleted"));
            fetchStatus(true);
          } catch (error: any) {
            toast.error(error.response?.data?.message || t("common.failed"));
          }
        },
      });
    },
    [serverId, t, fetchStatus],
  );

  // ──── Optimistic Toggle ────
  const handleToggleClient = useCallback(
    async (clientId: string, enabled: boolean) => {
      if (!serverId) return;
      setStatus((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          clients: prev.clients.map((c) =>
            c.id === clientId ? { ...c, enabled } : c,
          ),
        };
      });
      try {
        const action = enabled ? "enable" : "disable";
        await api.put(`/vpn/${serverId}/clients/${clientId}/${action}`);
      } catch (error: any) {
        setStatus((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            clients: prev.clients.map((c) =>
              c.id === clientId ? { ...c, enabled: !enabled } : c,
            ),
          };
        });
        toast.error(error.response?.data?.message || t("common.failed"));
      }
    },
    [serverId, t],
  );

  // ──── Download & QR ────
  const downloadConfig = useCallback(
    async (clientId: string, clientName: string) => {
      if (!serverId) return;
      try {
        const { data } = await api.get(
          `/vpn/${serverId}/clients/${clientId}/config`,
        );
        const blob = new Blob([data.config], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${clientName}.conf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error: any) {
        toast.error(error.response?.data?.message || t("common.failed"));
      }
    },
    [serverId, t],
  );

  const viewQrCode = useCallback(
    async (clientId: string, clientName: string) => {
      if (!serverId) return;
      try {
        const { data } = await api.get(
          `/vpn/${serverId}/clients/${clientId}/qrcode`,
        );
        setQrDialog({ open: true, svg: data.svg, name: clientName });
      } catch (error: any) {
        toast.error(error.response?.data?.message || t("common.failed"));
      }
    },
    [serverId, t],
  );

  // ══════════════════════════ CHART DATA COMPS ══════════════════════════
  const chartData = useMemo(() => {
    if (!status?.clients) return [];
    // Sort top 5 by total transferred
    const sorted = [...status.clients]
      .sort(
        (a, b) => b.transferRx + b.transferTx - (a.transferRx + a.transferTx),
      )
      .slice(0, 5);

    return sorted.map((c) => ({
      name: c.name,
      rxTotal: c.transferRx,
      txTotal: c.transferTx,
      rxMB: parseFloat((c.transferRx / (1024 * 1024)).toFixed(2)),
      txMB: parseFloat((c.transferTx / (1024 * 1024)).toFixed(2)),
    }));
  }, [status?.clients]);

  const totalRx = useMemo(
    () => status?.clients?.reduce((acc, c) => acc + c.transferRx, 0) || 0,
    [status],
  );
  const totalTx = useMemo(
    () => status?.clients?.reduce((acc, c) => acc + c.transferTx, 0) || 0,
    [status],
  );

  // ══════════════════════════ RENDER ══════════════════════════

  if (!serverId) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <SEO title="VPN Server" />
        <VpnLockIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          {t("vpn.selectServer", "Select a server to manage VPN")}
        </Typography>
      </Box>
    );
  }

  if (loading && !status) {
    return (
      <Box>
        <SEO title="VPN Server" />
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
      </Box>
    );
  }

  const isInstalled = status?.installed;
  const isRunning = status?.status === "running";

  return (
    <Box>
      <SEO title="VPN Server" />

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            🛡️ {t("vpn.title", "VPN Manager")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("vpn.subtitle", "Turn your VPS into a personal WireGuard VPN")}
          </Typography>
        </Box>
        {isInstalled && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {isRunning ? (
              <Button
                variant="outlined"
                color="warning"
                onClick={() => handleContainerAction("stop")}
                disabled={!!actionLoading}
                startIcon={
                  actionLoading === "stop" ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <StopIcon />
                  )
                }
                size="small"
              >
                {t("vpn.stop", "Stop")}
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="success"
                onClick={() => handleContainerAction("start")}
                disabled={!!actionLoading}
                startIcon={
                  actionLoading === "start" ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <PlayArrowIcon />
                  )
                }
                size="small"
              >
                {t("vpn.start", "Start")}
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleContainerAction("remove")}
              disabled={!!actionLoading}
              startIcon={
                actionLoading === "remove" ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DeleteIcon />
                )
              }
              size="small"
            >
              {t("vpn.uninstall", "Uninstall")}
            </Button>
          </Box>
        )}
      </Box>

      {/* ──── Not Installed ──── */}
      {!isInstalled ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <VpnLockIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {t(
                "vpn.notInstalled",
                "WireGuard VPN is not installed on this server",
              )}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 500, mx: "auto" }}
            >
              {t(
                "vpn.installDesc",
                "Installing will deploy a secure WireGuard VPN server inside an isolated Docker container. You can manage devices directly from here.",
              )}
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={openInstallDialog}
            >
              {t("vpn.installNow", "Install VPN Server")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ──── Server Info Card ──── */}
          <Card sx={{ mb: 3 }}>
            <CardContent
              sx={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {t("vpn.status", "Status")}
                </Typography>
                <Chip
                  color={isRunning ? "success" : "error"}
                  label={isRunning ? "Running" : "Stopped"}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {t("vpn.serverIp", "Server IP")}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ fontFamily: "monospace", mt: 0.5 }}
                >
                  {selectedServer?.host}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {t("vpn.port", "WireGuard Port")}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ fontFamily: "monospace", mt: 0.5 }}
                >
                  {t("vpnManager.51820UDP", "51820 UDP")}</Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {t("vpn.totalClients", "Clients")}
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                  {status?.clients?.length || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {isRunning && (
            <Box sx={{ mb: 3 }}>
              <Tabs
                value={currentTab}
                onChange={(e, v) => setCurrentTab(v)}
                sx={{ mb: 2 }}
              >
                <Tab
                  icon={<GroupIcon />}
                  iconPosition="start"
                  label="Clients"
                />
                <Tab
                  icon={<SpeedIcon />}
                  iconPosition="start"
                  label="Bandwidth"
                />
              </Tabs>

              {/* ──── Tab 0: Clients ──── */}
              {currentTab === 0 && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6">
                      {t("vpn.clientsList", "Device List")}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateDialog(true)}
                    >
                      {t("vpn.addClient", "Add Client")}
                    </Button>
                  </Box>

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {status?.clients?.length === 0 ? (
                      <Card>
                        <CardContent sx={{ textAlign: "center", py: 4 }}>
                          <Typography color="text.secondary">
                            {t(
                              "vpn.noClients",
                              "No clients found. Add one to connect!",
                            )}
                          </Typography>
                        </CardContent>
                      </Card>
                    ) : (
                      status?.clients?.map((client) => (
                        <ClientCard
                          key={client.id}
                          client={client}
                          onToggle={handleToggleClient}
                          onDownload={downloadConfig}
                          onViewQr={viewQrCode}
                          onDelete={handleDeleteClient}
                          t={t}
                        />
                      ))
                    )}
                  </Box>
                </Box>
              )}

              {/* ──── Tab 1: Bandwidth ──── */}
              {currentTab === 1 && (
                <Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    <Card
                      sx={{
                        background:
                          "linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%)",
                        border: "1px solid rgba(79, 172, 254, 0.2)",
                      }}
                    >
                      <CardContent>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            fontWeight: 600,
                          }}
                        >
                          {t("bandwidth.totalDownload", "Total Download")} {t("vpnManager.rx", "(Rx)")}</Typography>
                        <Typography
                          variant="h4"
                          sx={{ color: "#00f2fe", mt: 1, fontWeight: 700 }}
                        >
                          {formatBytes(totalRx)}
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card
                      sx={{
                        background:
                          "linear-gradient(135deg, rgba(67, 233, 123, 0.1) 0%, rgba(56, 249, 215, 0.1) 100%)",
                        border: "1px solid rgba(67, 233, 123, 0.2)",
                      }}
                    >
                      <CardContent>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            fontWeight: 600,
                          }}
                        >
                          {t("bandwidth.totalUpload", "Total Upload")} {t("vpnManager.tx", "(Tx)")}</Typography>
                        <Typography
                          variant="h4"
                          sx={{ color: "#43e97b", mt: 1, fontWeight: 700 }}
                        >
                          {formatBytes(totalTx)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>

                  {chartData.length > 0 ? (
                    <Card
                      sx={{
                        background: "#1c2230",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                        mb: 4,
                      }}
                    >
                      <CardContent sx={{ p: "24px !important" }}>
                        <Typography
                          variant="h6"
                          mb={3}
                          fontWeight={600}
                          color="#e2e8f0"
                        >
                          {t("vpn.topClients", "Top 5 Clients Usage")} {t("vpnManager.mB", "(MB)")}</Typography>
                        <Box sx={{ height: 400, width: "100%", pb: 2 }}>
                          <HighchartsReact
                            highcharts={Highcharts}
                            options={{
                              chart: {
                                type: "line",
                                backgroundColor: "transparent",
                              },
                              title: { text: null },
                              xAxis: {
                                categories: chartData.map((d) => d.name),
                                labels: { style: { color: "#a0aec0" } },
                                lineColor: "#2d3748",
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
                                    return this.value + " MB";
                                  },
                                },
                              },
                              tooltip: {
                                shared: true,
                                backgroundColor: "rgba(15, 23, 42, 0.85)",
                                borderColor: "#2d3748",
                                style: { color: "#fff" },
                                valueSuffix: " MB",
                              },
                              plotOptions: {
                                line: {
                                  lineWidth: 3,
                                  marker: {
                                    enabled: true,
                                    radius: 4,
                                  },
                                },
                              },
                              legend: {
                                itemStyle: {
                                  color: "#a0aec0",
                                  fontWeight: "500",
                                },
                                itemHoverStyle: { color: "#fff" },
                                margin: 20, // Add space above legend
                              },
                              series: [
                                {
                                  name: t(
                                    "bandwidth.download",
                                    "Download (Rx)",
                                  ),
                                  data: chartData.map((d) => d.rxMB),
                                  color: "#00f2fe",
                                },
                                {
                                  name: t("bandwidth.upload", "Upload (Tx)"),
                                  data: chartData.map((d) => d.txMB),
                                  color: "#43e97b",
                                },
                              ],
                              credits: { enabled: false },
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ) : (
                    <Typography
                      color="text.secondary"
                      textAlign="center"
                      py={4}
                    >
                      {t("vpnManager.noBandwidthDataAvailable", "No bandwidth data available.")}</Typography>
                  )}
                </Box>
              )}
            </Box>
          )}
        </>
      )}

      {/* ══════ Install Config Dialog ══════ */}
      <Dialog
        open={installDialog}
        onClose={() => !installing && setInstallDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t("vpn.configureInstall", "Configure VPN Server")}
        </DialogTitle>
        <DialogContent>
          {!installing && installSteps.length === 0 && (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              <TextField
                label={t("vpn.hostLabel", "Host (IP or Domain)")}
                value={installConfig.wgHost}
                onChange={(e) =>
                  setInstallConfig((p) => ({ ...p, wgHost: e.target.value }))
                }
                fullWidth
                size="small"
                helperText={t(
                  "vpn.hostHelper",
                  "Public IP or domain clients will connect to",
                )}
              />
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <TextField
                  label={t("vpn.wgPortLabel", "WireGuard Port (UDP)")}
                  type="number"
                  value={installConfig.wgPort}
                  onChange={(e) =>
                    setInstallConfig((p) => ({
                      ...p,
                      wgPort: parseInt(e.target.value) || 51820,
                    }))
                  }
                  size="small"
                />
                <TextField
                  label={t("vpn.apiPortLabel", "Management Port (TCP)")}
                  type="number"
                  value={installConfig.apiPort}
                  onChange={(e) =>
                    setInstallConfig((p) => ({
                      ...p,
                      apiPort: parseInt(e.target.value) || 51821,
                    }))
                  }
                  size="small"
                />
              </Box>
              <TextField
                label={t("vpn.defaultAddress", "Client IP Range")}
                value={installConfig.wgDefaultAddress}
                onChange={(e) =>
                  setInstallConfig((p) => ({
                    ...p,
                    wgDefaultAddress: e.target.value,
                  }))
                }
                size="small"
                helperText={t(
                  "vpn.addressHelper",
                  "e.g. 10.8.0.x — clients will be assigned IPs in this range",
                )}
              />
              <TextField
                label={t("vpn.allowedIps", "Allowed IPs")}
                value={installConfig.wgAllowedIps}
                onChange={(e) =>
                  setInstallConfig((p) => ({
                    ...p,
                    wgAllowedIps: e.target.value,
                  }))
                }
                size="small"
                helperText={t(
                  "vpn.allowedIpsHelper",
                  "0.0.0.0/0 = route all traffic through VPN. Use specific ranges to split tunnel.",
                )}
              />
            </Box>
          )}

          {/* SSE Progress Steps */}
          {installSteps.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {installSteps.map((step, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {step.status === "running" ? (
                    <CircularProgress size={18} />
                  ) : step.status === "done" ? (
                    <CheckCircleIcon
                      sx={{ fontSize: 18, color: "success.main" }}
                    />
                  ) : (
                    <ErrorIcon sx={{ fontSize: 18, color: "error.main" }} />
                  )}
                  <Typography
                    variant="body2"
                    color={step.status === "error" ? "error" : "text.primary"}
                  >
                    {step.message}
                  </Typography>
                </Box>
              ))}
              {installing && <LinearProgress sx={{ mt: 2 }} />}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialog(false)} disabled={installing}>
            {installing
              ? t("common.close", "Close")
              : t("common.cancel", "Cancel")}
          </Button>
          {!installing && installSteps.length === 0 && (
            <Button
              variant="contained"
              onClick={handleInstall}
              disabled={!installConfig.wgHost}
            >
              {t("vpn.installNow", "Install VPN Server")}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ══════ Create Client Dialog ══════ */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("vpn.addClient", "Add Client")}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label={t("common.name", "Name")}
            placeholder="e.g. iPhone, Laptop"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            disabled={creating}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)} disabled={creating}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateClient}
            disabled={!newClientName.trim() || creating}
            startIcon={
              creating ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {t("common.create", "Create")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════ QR Code Dialog ══════ */}
      <Dialog
        open={qrDialog.open}
        onClose={() => setQrDialog({ ...qrDialog, open: false })}
      >
        <DialogTitle sx={{ textAlign: "center" }}>{qrDialog.name}</DialogTitle>
        <DialogContent sx={{ textAlign: "center", pb: 4 }}>
          <Box
            sx={{
              bgcolor: "white",
              p: 2,
              borderRadius: 2,
              display: "inline-block",
              "& svg": { display: "block", width: 256, height: 256 },
            }}
            dangerouslySetInnerHTML={{ __html: qrDialog.svg }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t("vpn.scanQr", "Scan this with the WireGuard app to connect")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog({ ...qrDialog, open: false })}>
            {t("common.close", "Close")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════ Confirm Dialog ══════ */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDialog.onConfirm}
          >
            {t("common.confirm", "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VpnManager;
