import React, { useEffect, useState } from "react";
import { useServer } from "../contexts/ServerContext";
import api from "../services/api";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Skeleton,
  Tabs,
  Tab,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import StorageIcon from "@mui/icons-material/Storage";
import BackupIcon from "@mui/icons-material/Backup";
import RestoreIcon from "@mui/icons-material/Restore";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import TerminalIcon from "@mui/icons-material/Terminal";
import AddIcon from "@mui/icons-material/Add";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import { DatabaseStudio } from "../components/DatabaseStudio";

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
  type: "postgres" | "mysql" | "mongo" | "redis" | "unknown";
}

interface BackupFile {
  filename: string;
  size: string;
  date: string;
}

interface BackupSchedule {
  _id: string;
  containerId: string;
  dbType: string;
  dbName: string;
  schedule: string;
  retentionDays: number;
  status: "active" | "paused";
  lastRun?: string;
  lastStatus?: "success" | "failed";
}

const DatabaseManager: React.FC = () => {
  const { selectedServer } = useServer();
  const { t } = useTranslation();
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);

  // Studio Dialog
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioContainer, setStudioContainer] =
    useState<DockerContainer | null>(null);

  // Backup Dialog
  const [backupOpen, setBackupOpen] = useState(false);
  const [isAutomatedBackup, setIsAutomatedBackup] = useState(false);

  const [selectedContainer, setSelectedContainer] =
    useState<DockerContainer | null>(null);
  const [backupConfig, setBackupConfig] = useState<any>({
    dbName: "",
    dbUser: "",
    dbPassword: "",
    schedule: "0 0 * * *",
    retentionDays: 7,
  });
  const [backingUp, setBackingUp] = useState(false);

  // Restore Dialog
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [restoreConfig, setRestoreConfig] = useState({
    containerId: "",
    dbType: "",
    dbName: "",
    dbUser: "",
    dbPassword: "",
  });
  const [restoring, setRestoring] = useState(false);

  // Install Service Dialog
  const [installOpen, setInstallOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installConfig, setInstallConfig] = useState({
    serviceType: "postgres",
    containerName: "",
    dbUser: "",
    dbPassword: "",
  });

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInstallConfig((prev) => ({ ...prev, dbPassword: password }));
  };

  useEffect(() => {
    if (selectedServer) {
      if (tab === 0) fetchContainers();
      else if (tab === 1) fetchBackups();
      else if (tab === 2) fetchSchedules();
    }
  }, [selectedServer, tab]);

  const fetchContainers = async () => {
    if (!selectedServer) return;
    setLoading(true);
    try {
      const { data } = await api.get(
        `/database/${selectedServer._id}/containers`,
      );
      setContainers(data);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          t("database.fetchFailed", "Failed to fetch containers"),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    if (!selectedServer) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/database/${selectedServer._id}/backups`);
      setBackups(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch backups");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    if (!selectedServer) return;
    setLoading(true);
    try {
      const { data } = await api.get(
        `/database/${selectedServer._id}/schedules`,
      );
      setSchedules(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch schedules");
    } finally {
      setLoading(false);
    }
  };

  const handleBackupClick = (container: DockerContainer, automated = false) => {
    setSelectedContainer(container);
    setIsAutomatedBackup(automated);
    setBackupConfig({
      dbName: "",
      dbUser: "",
      dbPassword: "",
      schedule: "0 0 * * *",
      retentionDays: 7,
    });
    setBackupOpen(true);
  };

  const handleStudioClick = (c: DockerContainer) => {
    setStudioContainer(c);
    setStudioOpen(true);
  };

  const handleBackupSubmit = async () => {
    if (!selectedServer || !selectedContainer) return;
    setBackingUp(true);
    try {
      if (isAutomatedBackup) {
        await api.post(`/database/${selectedServer._id}/schedules`, {
          containerId: selectedContainer.id,
          dbType: selectedContainer.type,
          ...backupConfig,
        });
        toast.success("Automated backup schedule created successfully");
        setBackupOpen(false);
        if (tab === 2) fetchSchedules();
      } else {
        const { data } = await api.post(
          `/database/${selectedServer._id}/backup`,
          {
            containerId: selectedContainer.id,
            dbType: selectedContainer.type,
            ...backupConfig,
          },
        );
        toast.success(
          `${t("database.backupCreated", "Backup created at")}: ${data.path}`,
        );
        setBackupOpen(false);
        if (tab === 1) fetchBackups();
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          t("database.backupFailed", "Backup failed"),
      );
    } finally {
      setBackingUp(false);
    }
  };

  const handleToggleSchedule = async (
    id: string,
    currentStatus: "active" | "paused",
  ) => {
    if (!selectedServer) return;
    try {
      await api.put(`/database/${selectedServer._id}/schedules/${id}`, {
        status: currentStatus === "active" ? "paused" : "active",
      });
      toast.success("Schedule status updated");
      fetchSchedules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update schedule");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!selectedServer || !confirm(t("common.confirmDelete", "Are you sure?")))
      return;
    try {
      await api.delete(`/database/${selectedServer._id}/schedules/${id}`);
      toast.success(t("ftp.deleted", "Deleted"));
      fetchSchedules();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!selectedServer || !confirm(t("common.confirmDelete", "Are you sure?")))
      return;
    try {
      await api.delete(`/database/${selectedServer._id}/backups/${filename}`);
      toast.success(t("ftp.deleted", "Deleted"));
      fetchBackups();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const handleDownloadBackup = (filename: string) => {
    if (!selectedServer) return;
    downloadFile(filename);
  };

  const downloadFile = async (filename: string) => {
    if (!selectedServer) return;
    try {
      const response = await api.get(
        `/database/${selectedServer._id}/backups/${filename}`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Download failed");
    }
  };

  const handleRestoreClick = (backup: BackupFile) => {
    setSelectedBackup(backup);
    setRestoreConfig({
      containerId: "",
      dbType: "",
      dbName: "",
      dbUser: "",
      dbPassword: "",
    });
    setRestoreOpen(true);
  };

  const handleRestoreSubmit = async () => {
    if (!selectedServer || !selectedBackup) return;
    setRestoring(true);
    try {
      await api.post(`/database/${selectedServer._id}/restore`, {
        ...restoreConfig,
        filename: selectedBackup.filename,
      });
      toast.success(t("database.restoreSuccess", "Restore completed"));
      setRestoreOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  const handleInstallSubmit = async () => {
    if (!selectedServer) return;
    if (!installConfig.containerName) {
      toast.error("Container Name is required");
      return;
    }
    setInstalling(true);
    try {
      await api.post(`/database/${selectedServer._id}/install`, installConfig);
      toast.success(
        `Successfully installed ${installConfig.serviceType}. Container will be visible shortly.`,
      );
      setInstallOpen(false);
      setInstallConfig({
        serviceType: "postgres",
        containerName: "",
        dbUser: "",
        dbPassword: "",
      });
      fetchContainers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to install service");
    } finally {
      setInstalling(false);
    }
  };

  if (!selectedServer) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          {t("common.selectServer")}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 3,
          gap: 2,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            mb: { xs: 1, sm: 0 },
          }}
        >
          <StorageIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="body1" fontWeight={500}>
              {t("database.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("database.subtitle", { server: selectedServer.name })}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            ml: { sm: "auto" },
            display: "flex",
            gap: 1,
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <Button
            startIcon={<RefreshIcon />}
            onClick={tab === 0 ? fetchContainers : fetchBackups}
            disabled={loading}
            variant="outlined"
            size="small"
            fullWidth
          >
            {t("common.refresh")}
          </Button>
          {tab === 0 && (
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                setInstallConfig((prev) => ({
                  ...prev,
                  containerName: `my-${installConfig.serviceType}-${Math.floor(Math.random() * 1000)}`,
                }));
                generatePassword();
                setInstallOpen(true);
              }}
              variant="contained"
              size="small"
              fullWidth
            >
              New Service
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab
            label={t("database.containers", "Containers")}
            icon={<StorageIcon />}
            iconPosition="start"
          />
          <Tab
            label={t("database.backups", "Backups")}
            icon={<BackupIcon />}
            iconPosition="start"
          />
          <Tab
            label="Automated Backups"
            icon={<AccessTimeIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {tab === 0 && (
        <>
          {loading && containers.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.06)",
                    gap: 1.5,
                  }}
                >
                  <Skeleton variant="circular" width={8} height={8} />
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        mb: 0.5,
                      }}
                    >
                      <Skeleton variant="text" width={120} height={22} />
                      <Skeleton variant="rounded" width={52} height={20} />
                    </Box>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Skeleton variant="text" width={200} height={16} />
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Skeleton variant="circular" width={28} height={28} />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : containers.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: "center",
                border: "1px dashed grey",
                borderRadius: 2,
              }}
            >
              <Typography color="text.secondary">
                {t("database.noContainers")}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Desktop Table View */}
              <TableContainer
                component={Paper}
                elevation={0}
                variant="outlined"
                sx={{ display: { xs: "none", md: "block" } }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("database.containerName")}</TableCell>
                      <TableCell>{t("database.image")}</TableCell>
                      <TableCell>{t("database.type")}</TableCell>
                      <TableCell>{t("database.status")}</TableCell>
                      <TableCell align="right">
                        {t("database.actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {containers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell
                          sx={{ fontFamily: "monospace", fontWeight: 600 }}
                        >
                          {c.name}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "monospace" }}>
                          {c.image}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={c.type.toUpperCase()}
                            size="small"
                            color={c.type === "unknown" ? "default" : "primary"}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{c.status}</TableCell>
                        <TableCell align="right">
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: 1,
                            }}
                          >
                            <Button
                              startIcon={<TerminalIcon />}
                              size="small"
                              variant="contained"
                              disableElevation
                              onClick={() => handleStudioClick(c)}
                              disabled={
                                c.type === "unknown" || c.type === "redis"
                              }
                            >
                              Open Studio
                            </Button>
                            <Button
                              startIcon={<BackupIcon />}
                              size="small"
                              onClick={() => handleBackupClick(c)}
                              disabled={
                                c.type === "unknown" || c.type === "redis"
                              }
                            >
                              {t("database.backup")}
                            </Button>
                            <Button
                              startIcon={<AccessTimeIcon />}
                              size="small"
                              variant="outlined"
                              onClick={() => handleBackupClick(c, true)}
                              disabled={
                                c.type === "unknown" || c.type === "redis"
                              }
                            >
                              Auto
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Mobile Card View */}
              <Box
                sx={{
                  display: { xs: "flex", md: "none" },
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {containers.map((c) => (
                  <Card key={c.id} variant="outlined">
                    <CardContent
                      sx={{
                        p: 1.5,
                        pb: "12px !important",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <Box>
                          <Typography
                            variant="subtitle2"
                            fontWeight={600}
                            sx={{ fontFamily: "monospace" }}
                          >
                            {c.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: "monospace", display: "block" }}
                          >
                            {c.image}
                          </Typography>
                        </Box>
                        <Chip
                          label={c.type.toUpperCase()}
                          size="small"
                          color={c.type === "unknown" ? "default" : "primary"}
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10 }}
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: 12 }}
                      >
                        Status: {c.status}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          startIcon={<TerminalIcon />}
                          size="small"
                          variant="contained"
                          disableElevation
                          onClick={() => handleStudioClick(c)}
                          disabled={c.type === "unknown" || c.type === "redis"}
                          fullWidth
                        >
                          Studio
                        </Button>
                        <Button
                          startIcon={<BackupIcon />}
                          size="small"
                          variant="outlined"
                          onClick={() => handleBackupClick(c)}
                          disabled={c.type === "unknown" || c.type === "redis"}
                          fullWidth
                        >
                          {t("database.backup")}
                        </Button>
                        <Button
                          startIcon={<AccessTimeIcon />}
                          size="small"
                          variant="outlined"
                          onClick={() => handleBackupClick(c, true)}
                          disabled={c.type === "unknown" || c.type === "redis"}
                          fullWidth
                        >
                          Auto
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </>
          )}
        </>
      )}

      {tab === 1 && (
        <>
          {/* Desktop Table */}
          <TableContainer
            component={Paper}
            elevation={0}
            variant="outlined"
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t("common.name", "Name")}</TableCell>
                  <TableCell>{t("common.time", "Time")}</TableCell>
                  <TableCell>{t("ftp.size", "Size")}</TableCell>
                  <TableCell align="right">
                    {t("common.actions", "Actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && backups.length === 0 ? (
                  [0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton variant="text" width={150} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={120} />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={60} />
                      </TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 1,
                          }}
                        >
                          <Skeleton variant="circular" width={28} height={28} />
                          <Skeleton variant="circular" width={28} height={28} />
                          <Skeleton variant="circular" width={28} height={28} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No backups found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((b) => (
                    <TableRow key={b.filename}>
                      <TableCell sx={{ fontFamily: "monospace" }}>
                        {b.filename}
                      </TableCell>
                      <TableCell>{new Date(b.date).toLocaleString()}</TableCell>
                      <TableCell>{b.size}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Restore">
                          <IconButton
                            color="warning"
                            size="small"
                            onClick={() => handleRestoreClick(b)}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleDownloadBackup(b.filename)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteBackup(b.filename)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile List View */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              flexDirection: "column",
              gap: 1,
            }}
          >
            {loading && backups.length === 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Skeleton
                      variant="text"
                      width="60%"
                      height={24}
                      sx={{ mb: 1 }}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Skeleton variant="text" width="40%" height={16} />
                      <Skeleton variant="text" width="20%" height={16} />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                      }}
                    >
                      <Skeleton variant="rounded" width={60} height={24} />
                      <Skeleton variant="rounded" width={60} height={24} />
                      <Skeleton variant="rounded" width={60} height={24} />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : backups.length === 0 ? (
              <Box
                sx={{
                  p: 4,
                  textAlign: "center",
                  border: "1px dashed grey",
                  borderRadius: 2,
                }}
              >
                <Typography color="text.secondary">No backups found</Typography>
              </Box>
            ) : (
              backups.map((b) => (
                <Card key={b.filename} variant="outlined">
                  <CardContent sx={{ p: 1.5, pb: "12px !important" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
                      >
                        {b.filename}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {new Date(b.date).toLocaleString()}
                      </Typography>
                      <Typography
                        variant="caption"
                        component="span"
                        sx={{ fontWeight: 600 }}
                      >
                        {b.size}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 1,
                      }}
                    >
                      <Button
                        size="small"
                        color="warning"
                        startIcon={<RestoreIcon />}
                        onClick={() => handleRestoreClick(b)}
                      >
                        Restore
                      </Button>
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownloadBackup(b.filename)}
                      >
                        Download
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteBackup(b.filename)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        </>
      )}

      {tab === 2 && (
        <>
          {/* Desktop Table for Schedules */}
          <TableContainer
            component={Paper}
            elevation={0}
            variant="outlined"
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Container</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Run</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ) : schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No automated backups configured
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell
                        sx={{ fontFamily: "monospace", fontWeight: 600 }}
                      >
                        {s.containerId}
                      </TableCell>
                      <TableCell sx={{ fontFamily: "monospace" }}>
                        {s.schedule}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.status.toUpperCase()}
                          size="small"
                          color={s.status === "active" ? "success" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {s.lastRun
                          ? new Date(s.lastRun).toLocaleString()
                          : "Never"}
                        {s.lastStatus === "failed" && (
                          <Typography
                            variant="caption"
                            color="error"
                            display="block"
                          >
                            Failed
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={
                            s.status === "active"
                              ? "Pause Schedule"
                              : "Resume Schedule"
                          }
                        >
                          <IconButton
                            color={
                              s.status === "active" ? "warning" : "success"
                            }
                            size="small"
                            onClick={() =>
                              handleToggleSchedule(s._id, s.status)
                            }
                          >
                            {s.status === "active" ? (
                              <PauseIcon />
                            ) : (
                              <PlayArrowIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteSchedule(s._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile View for Schedules */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              flexDirection: "column",
              gap: 1,
            }}
          >
            {schedules.map((s) => (
              <Card key={s._id} variant="outlined">
                <CardContent sx={{ p: 1.5, pb: "12px !important" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      sx={{ fontFamily: "monospace" }}
                    >
                      {s.containerId}
                    </Typography>
                    <Chip
                      label={s.status.toUpperCase()}
                      size="small"
                      color={s.status === "active" ? "success" : "default"}
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontFamily: "monospace", mb: 1 }}
                  >
                    Cron: {s.schedule}
                  </Typography>
                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}
                  >
                    <Button
                      size="small"
                      color={s.status === "active" ? "warning" : "success"}
                      startIcon={
                        s.status === "active" ? (
                          <PauseIcon />
                        ) : (
                          <PlayArrowIcon />
                        )
                      }
                      onClick={() => handleToggleSchedule(s._id, s.status)}
                    >
                      {s.status === "active" ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteSchedule(s._id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* Backup Dialog */}
      <Dialog
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {t("database.backupTitle")} - {selectedContainer?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label={t("database.dbName")}
              fullWidth
              size="small"
              value={backupConfig.dbName}
              onChange={(e) =>
                setBackupConfig({ ...backupConfig, dbName: e.target.value })
              }
            />
            <TextField
              label={t("database.dbUser")}
              fullWidth
              size="small"
              value={backupConfig.dbUser}
              onChange={(e) =>
                setBackupConfig({ ...backupConfig, dbUser: e.target.value })
              }
            />
            <TextField
              label={t("database.dbPassword")}
              type="password"
              fullWidth
              size="small"
              value={backupConfig.dbPassword}
              onChange={(e) =>
                setBackupConfig({ ...backupConfig, dbPassword: e.target.value })
              }
            />

            {isAutomatedBackup && (
              <>
                <TextField
                  label="Cron Schedule"
                  fullWidth
                  size="small"
                  value={backupConfig.schedule}
                  onChange={(e) =>
                    setBackupConfig({
                      ...backupConfig,
                      schedule: e.target.value,
                    })
                  }
                  helperText="e.g. 0 0 * * * for Daily Midnight"
                />
                <TextField
                  label="Retention (Days)"
                  fullWidth
                  type="number"
                  size="small"
                  value={backupConfig.retentionDays}
                  onChange={(e) =>
                    setBackupConfig({
                      ...backupConfig,
                      retentionDays: parseInt(e.target.value),
                    })
                  }
                />
              </>
            )}

            {!isAutomatedBackup && (
              <Typography variant="caption" color="text.secondary">
                {t(
                  "database.backupHint",
                  "Backup defaults to /tmp/ on the server.",
                )}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleBackupSubmit}
            disabled={backingUp}
          >
            {backingUp
              ? t("common.loading")
              : isAutomatedBackup
                ? "Create Schedule"
                : t("database.startBackup")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Restore Database</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Restoring from: <b>{selectedBackup?.filename}</b>
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Container</InputLabel>
              <Select
                label="Container"
                value={restoreConfig.containerId}
                onChange={(e) => {
                  const c = containers.find((c) => c.id === e.target.value);
                  setRestoreConfig({
                    ...restoreConfig,
                    containerId: e.target.value as string,
                    dbType: c?.type || "",
                    dbName: "",
                    dbUser: "",
                  });
                }}
              >
                {containers
                  .filter((c) => c.type !== "redis" && c.type !== "unknown")
                  .map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              label={t("database.dbName")}
              fullWidth
              size="small"
              value={restoreConfig.dbName}
              onChange={(e) =>
                setRestoreConfig({ ...restoreConfig, dbName: e.target.value })
              }
            />
            <TextField
              label={t("database.dbUser")}
              fullWidth
              size="small"
              value={restoreConfig.dbUser}
              onChange={(e) =>
                setRestoreConfig({ ...restoreConfig, dbUser: e.target.value })
              }
            />
            <TextField
              label={t("database.dbPassword")}
              type="password"
              fullWidth
              size="small"
              value={restoreConfig.dbPassword}
              onChange={(e) =>
                setRestoreConfig({
                  ...restoreConfig,
                  dbPassword: e.target.value,
                })
              }
            />

            <Typography variant="caption" color="error">
              ⚠️ Warning: This will overwrite existing data!
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRestoreSubmit}
            disabled={restoring || !restoreConfig.containerId}
          >
            {restoring ? t("common.loading") : "Restore"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Install Service Dialog */}
      <Dialog
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Install New Database Service</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Database Engine</InputLabel>
              <Select
                label="Database Engine"
                value={installConfig.serviceType}
                onChange={(e) => {
                  setInstallConfig({
                    ...installConfig,
                    serviceType: e.target.value as string,
                    containerName: `my-${e.target.value}-${Math.floor(Math.random() * 1000)}`,
                  });
                }}
              >
                <MenuItem value="postgres">PostgreSQL 15</MenuItem>
                <MenuItem value="mysql">MySQL 8</MenuItem>
                <MenuItem value="mongo">MongoDB 6</MenuItem>
                <MenuItem value="redis">Redis 7</MenuItem>
                <MenuItem value="rabbitmq">RabbitMQ 3 Management</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Container Name"
              fullWidth
              size="small"
              value={installConfig.containerName}
              onChange={(e) =>
                setInstallConfig({
                  ...installConfig,
                  containerName: e.target.value,
                })
              }
              helperText="Only alphanumeric chars, hyphens, and underscores."
            />

            {(installConfig.serviceType === "postgres" ||
              installConfig.serviceType === "mysql" ||
              installConfig.serviceType === "mongo" ||
              installConfig.serviceType === "rabbitmq") && (
              <TextField
                label="Username"
                fullWidth
                size="small"
                value={installConfig.dbUser}
                onChange={(e) =>
                  setInstallConfig({ ...installConfig, dbUser: e.target.value })
                }
                placeholder={
                  installConfig.serviceType === "postgres"
                    ? "postgres"
                    : installConfig.serviceType === "mysql"
                      ? "app_user"
                      : "admin"
                }
                helperText="Leave empty to use engine defaults."
              />
            )}

            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <TextField
                label="Password"
                type="text"
                fullWidth
                size="small"
                value={installConfig.dbPassword}
                onChange={(e) =>
                  setInstallConfig({
                    ...installConfig,
                    dbPassword: e.target.value,
                  })
                }
              />
              <Button
                variant="outlined"
                size="small"
                onClick={generatePassword}
                sx={{ minWidth: 100, height: 40 }}
              >
                Generate
              </Button>
            </Box>

            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              ⚠️ The service will be installed as a Docker container on port
              defaults (e.g. 5432, 27017, etc). Ensure port is not in use!
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleInstallSubmit}
            disabled={installing}
          >
            {installing ? "Installing..." : "Install Service"}
          </Button>
        </DialogActions>
      </Dialog>

      <DatabaseStudio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        serverId={selectedServer._id}
        container={studioContainer}
      />
    </Box>
  );
};

export default DatabaseManager;
