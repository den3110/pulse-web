import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Divider,
  Chip,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate, useLocation } from "react-router-dom";

interface Shortcut {
  keys: string[];
  label: string;
  action?: () => void;
}

const KeyboardShortcuts: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  const shortcuts: Shortcut[] = [
    {
      keys: ["Ctrl", "Shift", "D"],
      label: "Go to Dashboard",
      action: () => navigate("/"),
    },
    {
      keys: ["Ctrl", "Shift", "S"],
      label: "Go to Servers",
      action: () => navigate("/servers"),
    },
    {
      keys: ["Ctrl", "Shift", "P"],
      label: "Go to Projects",
      action: () => navigate("/projects"),
    },
    {
      keys: ["Ctrl", "Shift", "N"],
      label: "Go to Nginx",
      action: () => navigate("/nginx"),
    },
    {
      keys: ["Ctrl", "Shift", "E"],
      label: "Go to Settings",
      action: () => navigate("/settings"),
    },
    { keys: ["?"], label: "Show keyboard shortcuts" },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // ? key — show help
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      // Escape — close help
      if (e.key === "Escape" && helpOpen) {
        setHelpOpen(false);
        return;
      }

      // Ctrl+Shift shortcuts
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toUpperCase()) {
          case "D":
            e.preventDefault();
            navigate("/");
            break;
          case "S":
            e.preventDefault();
            navigate("/servers");
            break;
          case "P":
            e.preventDefault();
            navigate("/projects");
            break;
          case "N":
            e.preventDefault();
            navigate("/nginx");
            break;
          case "E":
            e.preventDefault();
            navigate("/settings");
            break;
        }
      }
    },
    [navigate, helpOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog
      open={helpOpen}
      onClose={() => setHelpOpen(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 700,
        }}
      >
        ⌨️ Keyboard Shortcuts
        <IconButton size="small" onClick={() => setHelpOpen(false)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {shortcuts.map((s, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {s.label}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {s.keys.map((key) => (
                  <Chip
                    key={key}
                    label={key}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      height: 24,
                      minWidth: 28,
                      borderRadius: 1.5,
                      bgcolor: "rgba(255,255,255,0.04)",
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography
          variant="caption"
          color="text.secondary"
          textAlign="center"
          display="block"
        >
          Press <strong>?</strong> anywhere to toggle this dialog
        </Typography>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcuts;
