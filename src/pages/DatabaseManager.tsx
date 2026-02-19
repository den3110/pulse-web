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
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

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

const DatabaseManager: React.FC = () => {
  const { selectedServer } = useServer();
  const { t } = useTranslation();
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);

  // Backup Dialog
  const [backupOpen, setBackupOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] =
    useState<DockerContainer | null>(null);
  const [backupConfig, setBackupConfig] = useState({
    dbName: "",
    dbUser: "",
    dbPassword: "",
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

  useEffect(() => {
    if (selectedServer) {
      if (tab === 0) fetchContainers();
      else fetchBackups();
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

  const handleBackupClick = (container: DockerContainer) => {
    setSelectedContainer(container);
    setBackupConfig({ dbName: "", dbUser: "", dbPassword: "" });
    setBackupOpen(true);
  };

  const handleBackupSubmit = async () => {
    if (!selectedServer || !selectedContainer) return;
    setBackingUp(true);
    try {
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
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          t("database.backupFailed", "Backup failed"),
      );
    } finally {
      setBackingUp(false);
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
            <Typography variant="h5" fontWeight={700}>
              {t("database.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("database.subtitle", { server: selectedServer.name })}
            </Typography>
          </Box>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={tab === 0 ? fetchContainers : fetchBackups}
          disabled={loading}
          variant="outlined"
          size="small"
          sx={{ ml: { sm: "auto" }, width: { xs: "100%", sm: "auto" } }}
        >
          {t("common.refresh")}
        </Button>
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
        </Tabs>
      </Box>

      {tab === 0 ? (
        <>
          {loading && containers.length === 0 ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={60}
                  sx={{ mb: 1, borderRadius: 1 }}
                />
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
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </>
          )}
        </>
      ) : (
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
                {backups.length === 0 ? (
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
            {backups.length === 0 ? (
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
            <Typography variant="caption" color="text.secondary">
              {t(
                "database.backupHint",
                "Backup defaults to /tmp/ on the server.",
              )}
            </Typography>
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
            {backingUp ? t("common.loading") : t("database.startBackup")}
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
    </Box>
  );
};

export default DatabaseManager;
