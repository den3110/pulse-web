import React, { useState, useEffect, useCallback } from "react";
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
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../services/api";

interface ServerFileSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (filePath: string) => void;
  serverId: string;
  initialPath?: string;
  title?: string;
  allowedExtensions?: string[]; // e.g., ['.js', '.py', '.sh']
}

interface FileEntry {
  name: string;
  type: "file" | "directory" | "symlink";
  isHidden: boolean;
}

const ServerFileSelectorDialog: React.FC<ServerFileSelectorDialogProps> = ({
  open,
  onClose,
  onSelect,
  serverId,
  initialPath = "/",
  title = "Select File",
  allowedExtensions,
}) => {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const loadEntries = useCallback(
    async (path: string) => {
      if (!open || !serverId) return;

      setLoading(true);
      setError("");
      setSelectedFile(null); // Reset selection on nav
      try {
        const { data } = await api.get(`/ftp/${serverId}/list`, {
          params: { path, showHidden: true }, // Show hidden to see .env etc if needed
        });

        let fetchedEntries = data.entries as FileEntry[];

        // Sort: directories first, then files, alphabetical
        fetchedEntries.sort((a, b) => {
          if (a.type === "directory" && b.type !== "directory") return -1;
          if (a.type !== "directory" && b.type === "directory") return 1;
          return a.name.localeCompare(b.name);
        });

        setEntries(fetchedEntries);
        setCurrentPath(data.path);
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load directory";
        setError(msg);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [serverId, open],
  );

  // Load initial path when dialog opens
  useEffect(() => {
    if (open && serverId) {
      loadEntries(currentPath || "/");
    }
  }, [open, serverId, loadEntries]);

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.type === "directory") {
      const newPath =
        currentPath === "/" ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      loadEntries(newPath);
    } else {
      // It's a file
      if (allowedExtensions) {
        const ext = "." + entry.name.split(".").pop();
        if (
          !allowedExtensions.includes(ext) &&
          !allowedExtensions.includes(entry.name)
        ) {
          // Optional: could show toast or just ignore.
          // For now, let's select it but maybe visually warn?
          // actually, better to just allow selecting any file if user insists, or filter visualy.
          // Let's just select it.
        }
      }
      setSelectedFile(entry.name);
    }
  };

  const navigateUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const parentPath = parts.length === 0 ? "/" : `/${parts.join("/")}`;
    loadEntries(parentPath);
  };

  const confirmSelection = () => {
    if (selectedFile) {
      const fullPath =
        currentPath === "/"
          ? `/${selectedFile}`
          : `${currentPath}/${selectedFile}`;
      onSelect(fullPath);
      onClose();
    }
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
          borderRadius: 3,
          border: "1px solid rgba(255,255,255,0.1)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pb: 1,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Box
          sx={{
            bgcolor: "rgba(99, 102, 241, 0.15)",
            p: 1,
            borderRadius: 1.5,
            display: "flex",
          }}
        >
          <InsertDriveFileIcon sx={{ color: "#6366f1" }} />
        </Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 600, flex: 1, fontSize: "1.1rem" }}
        >
          {title}
        </Typography>
        <IconButton
          size="small"
          onClick={() => loadEntries(currentPath)}
          disabled={loading}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, py: 2 }}>
        {/* Breadcrumb */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mb: 2,
            flexWrap: "wrap",
            bgcolor: "rgba(0,0,0,0.2)",
            p: 1,
            borderRadius: 2,
          }}
        >
          <IconButton
            size="small"
            onClick={navigateUp}
            disabled={currentPath === "/" || loading}
            sx={{ mr: 0.5 }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>

          <Chip
            label="/"
            size="small"
            variant={currentPath === "/" ? "filled" : "outlined"}
            color={currentPath === "/" ? "primary" : "default"}
            onClick={() => loadEntries("/")}
            sx={{ cursor: "pointer", fontFamily: "monospace", fontWeight: 600 }}
          />

          {pathParts.map((part, i) => {
            const path = "/" + pathParts.slice(0, i + 1).join("/");
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
                  color={isLast ? "primary" : "default"}
                  onClick={() => !isLast && loadEntries(path)}
                  sx={{
                    cursor: isLast ? "default" : "pointer",
                    fontFamily: "monospace",
                    fontWeight: isLast ? 600 : 400,
                    maxWidth: 150,
                  }}
                />
              </React.Fragment>
            );
          })}
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{ display: "flex", alignItems: "center", gap: 2, p: 1 }}
              >
                <Skeleton variant="circular" width={28} height={28} />
                <Skeleton
                  variant="text"
                  width={150 + Math.random() * 100}
                  height={24}
                />
              </Box>
            ))}
          </Box>
        ) : entries.length === 0 && !error ? (
          <Box
            sx={{
              py: 6,
              textAlign: "center",
              border: "2px dashed rgba(255,255,255,0.1)",
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            <FolderIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1, opacity: 0.5 }}
            />
            <Typography variant="body2" color="text.secondary">
              No files found
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ maxHeight: 350, overflow: "auto", mx: -1 }}>
            {entries.map((entry) => {
              const isSelected = selectedFile === entry.name;
              return (
                <ListItemButton
                  key={entry.name}
                  onClick={() => handleEntryClick(entry)}
                  selected={isSelected}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    mx: 1,
                    "&.Mui-selected": {
                      bgcolor: "rgba(99, 102, 241, 0.25)",
                      "&:hover": { bgcolor: "rgba(99, 102, 241, 0.35)" },
                    },
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
                    transition: "all 0.15s",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {entry.type === "directory" ? (
                      <FolderIcon sx={{ color: "#f59e0b", fontSize: 22 }} />
                    ) : (
                      <InsertDriveFileIcon
                        sx={{ color: "text.secondary", fontSize: 20 }}
                      />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={entry.name}
                    primaryTypographyProps={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: isSelected ? "primary.main" : "text.primary",
                    }}
                    secondary={
                      entry.type !== "directory" && allowedExtensions // show valid status if filtering
                        ? undefined // Simplify for now
                        : undefined
                    }
                  />
                  {isSelected && <CheckIcon fontSize="small" color="primary" />}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 2.5,
          pt: 1.5,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={confirmSelection}
          disabled={loading || !selectedFile}
          sx={{
            borderRadius: 2,
            px: 3,
            bgcolor: "primary.main",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          Select File
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServerFileSelectorDialog;
