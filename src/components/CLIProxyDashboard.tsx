import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import {
  Token as TokenIcon,
  Functions as ApiIcon,
  CheckCircle as SuccessIcon,
  Cancel as ErrorIcon,
  VpnKey as AuthKeyIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import api from "../services/api";

interface CLIProxyDashboardProps {
  serverId: string;
  appId: string;
  refreshTrigger?: number;
}

export const CLIProxyDashboard: React.FC<CLIProxyDashboardProps> = ({
  serverId,
  appId,
  refreshTrigger,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const [usage, setUsage] = useState<any>(null);
  const [authFiles, setAuthFiles] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [version, setVersion] = useState<string>("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usageRes, authRes, versionRes] = await Promise.all([
        api.get(`/servers/${serverId}/one-click/${appId}/proxy/usage`),
        api.get(`/servers/${serverId}/one-click/${appId}/proxy/auth-files`),
        api.get(`/servers/${serverId}/one-click/${appId}/proxy/latest-version`),
      ]);

      const fetchedAuthFiles = authRes.data.files || [];
      let allModels: any[] = [];

      // If models require a name, we fetch per authenticated account
      if (fetchedAuthFiles.length > 0) {
        try {
          // Let's fetch models for all available accounts and merge them
          const modelPromises = fetchedAuthFiles.map((file: any) =>
            api
              .get(
                `/servers/${serverId}/one-click/${appId}/proxy/auth-files/models?name=${encodeURIComponent(file.name)}`,
              )
              .catch(() => ({ data: { models: [] } })),
          );
          const modelsResponses = await Promise.all(modelPromises);

          modelsResponses.forEach((res) => {
            if (res.data?.models) {
              const mapped = res.data.models.map((m: any) => ({
                id: m.id,
                name: m.display_name || m.id,
                type: m.type || "unknown",
              }));
              allModels = [...allModels, ...mapped];
            }
          });

          // Deduplicate by ID
          const uniqueModels = new Map();
          allModels.forEach((m) => {
            if (!uniqueModels.has(m.id)) {
              uniqueModels.set(m.id, m);
            }
          });
          allModels = Array.from(uniqueModels.values());
        } catch (e) {
          console.error("Failed to fetch models", e);
        }
      }

      setUsage(usageRes.data);
      setAuthFiles(fetchedAuthFiles);
      setModels(allModels);
      setVersion(versionRes.data["latest-version"] || "");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every 60s instead of 10s to reduce load
    return () => clearInterval(interval);
  }, [serverId, appId, refreshTrigger]);

  const confirmDelete = (name: string) => {
    setFileToDelete(name);
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!fileToDelete) return;

    setDeleteDialogOpen(false);
    setDeletingFile(fileToDelete);
    try {
      await api.delete(
        `/servers/${serverId}/one-click/${appId}/proxy/auth-files?name=${encodeURIComponent(
          fileToDelete,
        )}`,
      );
      toast.success(`Deleted account ${fileToDelete}`);
      fetchData();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          `Failed to delete account ${fileToDelete}`,
      );
    } finally {
      setDeletingFile(null);
      setFileToDelete(null);
    }
  };

  if (loading && !usage) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={40} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, maxWidth: 1000, margin: "0 auto" }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        height: "100%",
        animation: "fadeIn 0.4s ease-out",
      }}
    >
      {/* Header - Notion Style */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight="700"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            letterSpacing: "-0.02em",
            fontSize: { xs: "1.75rem", md: "2.25rem" },
          }}
        >
          ⚡ CLIProxyAPI Dashboard
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            color="text.secondary"
            sx={{ fontSize: 15, fontWeight: 500 }}
          >
            Native Management Dashboard
          </Typography>
          {version && (
            <Chip
              label={`v${version}`}
              size="small"
              sx={{
                borderRadius: 1.5,
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            />
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 5, opacity: 0.6 }} />

      {/* Stats Board */}
      <Grid container spacing={2.5} sx={{ mb: 6 }}>
        {[
          {
            icon: <ApiIcon color="primary" sx={{ opacity: 0.8 }} />,
            label: "Total Requests",
            value: usage?.usage?.total_requests || 0,
          },
          {
            icon: <TokenIcon color="secondary" sx={{ opacity: 0.8 }} />,
            label: "Total Tokens",
            value: usage?.usage?.total_tokens || 0,
          },
          {
            icon: <SuccessIcon color="success" sx={{ opacity: 0.8 }} />,
            label: "Success Count",
            value: usage?.usage?.success_count || 0,
          },
          {
            icon: <ErrorIcon color="error" sx={{ opacity: 0.8 }} />,
            label: "Failed Count",
            value: usage?.usage?.failure_count || 0,
          },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Box
              sx={{
                p: 2.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
                bgcolor: "background.paper",
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  borderColor: "text.primary",
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {stat.icon}
                <Typography
                  color="text.secondary"
                  variant="body2"
                  fontWeight={600}
                >
                  {stat.label}
                </Typography>
              </Box>
              <Typography
                variant="h4"
                fontWeight="700"
                sx={{ letterSpacing: "-0.01em" }}
              >
                {stat.value.toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Authenticated Accounts */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h6"
          fontWeight="600"
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: 18,
          }}
        >
          <AuthKeyIcon sx={{ fontSize: 20, color: "text.secondary" }} />
          Authenticated Accounts
        </Typography>
        <TableContainer
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            bgcolor: "background.paper",
            "& .MuiTableCell-root": {
              borderColor: "divider",
            },
          }}
        >
          <Table size="medium">
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    py: 1.5,
                  }}
                >
                  Account ID
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    py: 1.5,
                  }}
                >
                  Provider
                </TableCell>
                <TableCell
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    py: 1.5,
                  }}
                >
                  Filename
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    py: 1.5,
                  }}
                >
                  Size
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    py: 1.5,
                    width: 60,
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {authFiles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    align="center"
                    sx={{ py: 6, color: "text.secondary" }}
                  >
                    No accounts authenticated yet. Connect an account using
                    OAuth Login.
                  </TableCell>
                </TableRow>
              ) : (
                authFiles.map((file, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500, color: "text.primary" }}>
                      {file.account}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={file.provider}
                        size="small"
                        sx={{
                          borderRadius: 1.5,
                          height: 24,
                          fontSize: 12,
                          fontWeight: 500,
                          bgcolor: "action.selected",
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "text.secondary",
                        fontFamily: "monospace",
                        fontSize: 13,
                      }}
                    >
                      {file.filename}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "text.secondary" }}>
                      {(file.size / 1024).toFixed(2)} KB
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => confirmDelete(file.name)}
                        disabled={deletingFile === file.name}
                      >
                        {deletingFile === file.name ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Available Models */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h6"
          fontWeight="600"
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontSize: 18,
          }}
        >
          🤖 Available Models
          <Typography
            component="span"
            sx={{ color: "text.secondary", fontWeight: 400, ml: 1 }}
          >
            ({models.length})
          </Typography>
        </Typography>
        <Box
          sx={{
            p: 3,
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            bgcolor: "background.paper",
            minHeight: 100,
          }}
        >
          {models.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 1 }}>
              No models mapped. Please check proxy configuration.
            </Typography>
          ) : (
            models.map((model) => (
              <Chip
                key={model.id}
                onClick={() => {
                  navigator.clipboard.writeText(model.id);
                  toast.success(`Copied ${model.id} to clipboard!`);
                }}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      component="span"
                      fontWeight={700}
                      sx={{ fontSize: 13, fontFamily: "monospace" }}
                    >
                      {model.id}
                    </Typography>
                    {model.name !== model.id && (
                      <Typography
                        component="span"
                        sx={{ fontSize: 12, color: "text.secondary", ml: 0.5 }}
                      >
                        {model.name}
                      </Typography>
                    )}
                  </Box>
                }
                size="small"
                sx={{
                  borderRadius: 1.5,
                  bgcolor: "transparent",
                  border: "1px solid",
                  borderColor: "divider",
                  py: 1.5,
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "action.hover",
                    transform: "translateY(-1px)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  },
                  transition: "all 0.2s ease",
                }}
              />
            ))
          )}
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, color: "error.main" }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the authenticated account{" "}
            <Typography component="span" fontWeight={600} color="text.primary">
              '{fileToDelete}'
            </Typography>
            ? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={executeDelete}
            color="error"
            variant="contained"
            disableElevation
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
