import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Skeleton,
  Chip,
  IconButton,
  Alert,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import api from "../services/api";

interface FolderBrowserDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (folderPath: string) => void;
  serverId: string;
  repoUrl: string;
  branch: string;
  deployPath?: string;
}

const FolderBrowserDialog: React.FC<FolderBrowserDialogProps> = ({
  open,
  onClose,
  onSelect,
  serverId,
  repoUrl,
  branch,
  deployPath,
}) => {
  const [folders, setFolders] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadFolders = useCallback(
    async (subPath: string) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.post("/projects/browse-folders", {
          serverId,
          repoUrl,
          branch,
          deployPath: deployPath || undefined,
          subPath: subPath || undefined,
        });
        setFolders(res.data.folders);
        setCurrentPath(subPath);
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load folders";
        setError(msg);
        setFolders([]);
      } finally {
        setLoading(false);
      }
    },
    [serverId, repoUrl, branch, deployPath],
  );

  // Load root folders when dialog opens
  React.useEffect(() => {
    if (open && serverId && repoUrl) {
      setCurrentPath("");
      loadFolders("");
    }
  }, [open, serverId, repoUrl, loadFolders]);

  const navigateInto = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    loadFolders(newPath);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    loadFolders(parts.join("/"));
  };

  const selectCurrent = () => {
    onSelect(currentPath);
    onClose();
  };

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "var(--card-bg, #1e1e2e)",
          backgroundImage: "none",
          maxHeight: "70vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pb: 1,
        }}
      >
        <FolderIcon sx={{ color: "#f59e0b" }} />
        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
          Browse Repo Folders
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 2, py: 0 }}>
        {/* Breadcrumb */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mb: 1.5,
            flexWrap: "wrap",
          }}
        >
          {currentPath && (
            <IconButton size="small" onClick={navigateUp} sx={{ mr: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Chip
            label="/"
            size="small"
            variant={currentPath === "" ? "filled" : "outlined"}
            onClick={() => loadFolders("")}
            sx={{ cursor: "pointer", fontFamily: "monospace" }}
          />
          {pathParts.map((part, i) => {
            const path = pathParts.slice(0, i + 1).join("/");
            const isLast = i === pathParts.length - 1;
            return (
              <React.Fragment key={path}>
                <Typography variant="caption" color="text.secondary">
                  /
                </Typography>
                <Chip
                  label={part}
                  size="small"
                  variant={isLast ? "filled" : "outlined"}
                  onClick={() => loadFolders(path)}
                  sx={{ cursor: "pointer", fontFamily: "monospace" }}
                />
              </React.Fragment>
            );
          })}
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {[0, 1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1 }}
              >
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="text" width={120 + i * 30} height={22} />
              </Box>
            ))}
          </Box>
        ) : folders.length === 0 && !error ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: 3, textAlign: "center" }}
          >
            No subfolders found in this directory
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
            {folders.map((folder) => (
              <ListItemButton
                key={folder}
                onClick={() => navigateInto(folder)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  "&:hover": { bgcolor: "rgba(99, 102, 241, 0.1)" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FolderIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={folder}
                  primaryTypographyProps={{
                    fontFamily: "monospace",
                    fontSize: "0.9rem",
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, pt: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={<CheckIcon />}
          onClick={selectCurrent}
          disabled={!currentPath}
        >
          Select{currentPath ? `: ${currentPath}` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FolderBrowserDialog;
