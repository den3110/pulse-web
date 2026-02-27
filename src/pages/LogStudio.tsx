import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  useTheme,
  Alert,
} from "@mui/material";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import StorageIcon from "@mui/icons-material/Storage";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import TerminalIcon from "@mui/icons-material/Terminal";
import LanguageIcon from "@mui/icons-material/Language";
import ArticleIcon from "@mui/icons-material/Article";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useAuth } from "../contexts/AuthContext";
import { useServer } from "../contexts/ServerContext";

type LogType = "docker" | "pm2" | "nginx" | "syslog" | "auth";

interface TargetItem {
  id: string;
  name: string;
}

const LogStudio: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const token = localStorage.getItem("accessToken");

  const { selectedServer } = useServer();
  const [selectedType, setSelectedType] = useState<LogType | "">("");

  // Dynamic targets based on selected type (e.g. docker containers or pm2 apps)
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [loadingTargets, setLoadingTargets] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Terminal refs
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // 1. Initialize Terminal
  useEffect(() => {
    if (terminalRef.current && !xtermRef.current) {
      const term = new Terminal({
        theme: {
          background: "#1e1e1e",
          foreground: "#d4d4d4",
          cursor: "#d4d4d4",
          cursorAccent: "#1e1e1e",
          selectionBackground: "#3a3d41",
          black: "#1e1e1e",
          red: "#f44747",
          green: "#608b4e",
          yellow: "#d7ba7d",
          blue: "#569cd6",
          magenta: "#c678dd",
          cyan: "#56b6c2",
          white: "#d4d4d4",
          brightBlack: "#808080",
          brightRed: "#f14c4c",
          brightGreen: "#b5cea8",
          brightYellow: "#dcdcaa",
          brightBlue: "#4fc1ff",
          brightMagenta: "#d16d9e",
          brightCyan: "#4ec9b0",
          brightWhite: "#ffffff",
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        scrollback: 5000,
        disableStdin: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      term.writeln("\x1b[36mWelcome to Pulse Log Studio \x1b[0m");
      term.writeln(
        "\x1b[90mSelect a server and service to start streaming logs...\x1b[0m",
      );
      term.writeln("");

      const handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // 2. Fetch Servers
  // Removed (using Global Context)

  // 3. Clean up SSE on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  // 4. Load dynamic targets when Server + Type changes
  useEffect(() => {
    setTargets([]);
    setSelectedTarget("");

    // Auto-select type for syslog/nginx that don't need a target to prevent double click
    if (
      selectedType === "nginx" ||
      selectedType === "syslog" ||
      selectedType === "auth"
    ) {
      setSelectedTarget(selectedType); // dummy target
      return;
    }

    if (!selectedServer?._id || !selectedType) return;

    const loadTargets = async () => {
      setLoadingTargets(true);
      try {
        if (selectedType === "docker") {
          const res = await api.get(`/docker/${selectedServer._id}/containers`);
          setTargets(
            res.data.map((c: any) => ({
              id: c.Names[0].replace("/", ""),
              name: c.Names[0].replace("/", ""),
            })),
          );
        } else if (selectedType === "pm2") {
          const res = await api.get(`/pm2/${selectedServer._id}/processes`);
          setTargets(
            res.data.map((p: any) => ({
              id: p.name,
              name: p.name,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to load targets", err);
      } finally {
        setLoadingTargets(false);
      }
    };

    loadTargets();
  }, [selectedServer?._id, selectedType]);

  const startStreaming = () => {
    if (!selectedServer?._id || !selectedType) return;
    if (
      (selectedType === "docker" || selectedType === "pm2") &&
      !selectedTarget
    )
      return;

    stopStreaming(); // Ensure any previous connection is killed

    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.writeln(
        `\x1b[32mConnecting to ${selectedType} logs on server...\x1b[0m`,
      );
    }

    setIsStreaming(true);

    const targetQuery = selectedTarget ? `&target=${selectedTarget}` : "";
    const url = `${import.meta.env.VITE_API_URL}/api/logs/stream?serverId=${selectedServer?._id}&type=${selectedType}${targetQuery}`;

    // We append the auth token to the URL so SSE can authenticate
    // In production, this might be handled via cookies or a short-lived ticket
    // Here we append token to query string. Make sure backend AuthMiddleware allows it.
    const sseUrl = `${url}&token=${token}`;

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      if (xtermRef.current) {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            xtermRef.current.writeln(`\x1b[31;1m[ERROR] ${data.error}\x1b[0m`);
            stopStreaming();
          } else if (data.content !== undefined) {
            // Handle simple formatting: if line starts with [ERROR], color red
            let line = data.content;
            if (
              line.includes("[ERROR]") ||
              line.includes("ERR!") ||
              line.toLowerCase().includes("error:")
            ) {
              line = `\x1b[31m${line}\x1b[0m`;
            } else if (
              line.includes("[WARN]") ||
              line.toLowerCase().includes("warn:")
            ) {
              line = `\x1b[33m${line}\x1b[0m`;
            } else if (line.includes("[INFO]")) {
              line = `\x1b[36m${line}\x1b[0m`;
            }
            xtermRef.current.writeln(line);
          }
        } catch (e) {
          xtermRef.current.writeln(event.data);
        }
      }
    };

    es.addEventListener("close", () => {
      if (xtermRef.current) {
        xtermRef.current.writeln(
          `\x1b[90m--- Stream closed by server ---\x1b[0m`,
        );
      }
      stopStreaming();
    });

    es.onerror = () => {
      if (xtermRef.current) {
        xtermRef.current.writeln(
          `\x1b[31;1m[CONNECTION ERROR] Lost connection to log stream.\x1b[0m`,
        );
      }
      stopStreaming();
    };
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  };

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  const isFormValid = selectedServer?._id && selectedType && selectedTarget;

  return (
    <Box
      sx={{
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 2,
      }}
    >
      {/* Left Sidebar: Controls */}
      <Paper
        sx={{
          width: { xs: "100%", md: 320 },
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: "background.default",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            {t("logStudio.logStudio", "Log Studio")}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t("logStudio.centralizedRealtimeLogViewer", "Centralized Real-time Log Viewer")}</Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* Server Selection Removed - Globally selected */}

          {/* Service Type Selection */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ mb: 1, display: "block", textTransform: "uppercase" }}
            >
              {t("logStudio.serviceType", "Service Type")}</Typography>
            <List
              disablePadding
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              {[
                {
                  type: "docker",
                  label: "Docker Containers",
                  icon: <ViewInArIcon color="info" />,
                },
                {
                  type: "pm2",
                  label: "PM2 Processes",
                  icon: <TerminalIcon color="secondary" />,
                },
                {
                  type: "nginx",
                  label: "Nginx Access/Error",
                  icon: <LanguageIcon color="success" />,
                },
                {
                  type: "syslog",
                  label: "System Log (syslog)",
                  icon: <ArticleIcon sx={{ color: "#757575" }} />,
                },
                {
                  type: "auth",
                  label: "Auth Log",
                  icon: <ArticleIcon sx={{ color: "#f57c00" }} />,
                },
              ].map((item) => (
                <React.Fragment key={item.type}>
                  <ListItemButton
                    selected={selectedType === item.type}
                    onClick={() => {
                      setSelectedType(item.type as LogType);
                    }}
                    disabled={!selectedServer?._id || isStreaming}
                    sx={{ py: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: "0.875rem" }}
                    />
                  </ListItemButton>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Box>

          {/* Target Selection (Docker/PM2 only) */}
          {(selectedType === "docker" || selectedType === "pm2") && (
            <FormControl fullWidth size="small">
              <InputLabel>
                {selectedType === "docker"
                  ? "Select Container"
                  : "Select Process"}
              </InputLabel>
              <Select
                value={selectedTarget}
                label={
                  selectedType === "docker"
                    ? "Select Container"
                    : "Select Process"
                }
                onChange={(e) => setSelectedTarget(e.target.value)}
                disabled={isStreaming || loadingTargets || targets.length === 0}
              >
                {targets.length === 0 && !loadingTargets ? (
                  <MenuItem disabled value="">
                    {t("logStudio.noTargetsFound", "No targets found")}</MenuItem>
                ) : (
                  targets.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.default",
            display: "flex",
            gap: 1,
          }}
        >
          {!isStreaming ? (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<PlayArrowIcon />}
              onClick={startStreaming}
              disabled={!isFormValid}
            >
              {t("logStudio.startStream", "Start Stream")}</Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              fullWidth
              startIcon={<StopIcon />}
              onClick={stopStreaming}
            >
              {t("logStudio.stopStream", "Stop Stream")}</Button>
          )}
        </Box>
      </Paper>

      {/* Right Area: Terminal */}
      <Paper
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          bgcolor: "#1e1e1e",
        }}
      >
        <Box
          sx={{
            p: 1,
            px: 2,
            bgcolor: "#2d2d2d",
            borderBottom: 1,
            borderColor: "#404040",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: isStreaming
                  ? "#4caf50"
                  : selectedServer?._id
                    ? "#ff9800"
                    : "#9e9e9e",
                boxShadow: isStreaming ? "0 0 8px #4caf50" : "none",
              }}
            />
            <Typography
              variant="body2"
              sx={{ color: "#d4d4d4", fontFamily: "monospace" }}
            >
              {isStreaming
                ? `Streaming: ${selectedServer?.name || selectedServer?._id} > ${selectedType} ${(selectedTarget && selectedType === "docker") || selectedType === "pm2" ? "> " + selectedTarget : ""}`
                : selectedServer?._id
                  ? "Ready to connect"
                  : "Waiting for selection..."}
            </Typography>
          </Box>
          <Button
            size="small"
            startIcon={<DeleteSweepIcon />}
            onClick={clearTerminal}
            sx={{
              color: "#d4d4d4",
              textTransform: "none",
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
            }}
          >
            {t("logStudio.clear", "Clear")}</Button>
        </Box>
        <Box
          sx={{
            flex: 1,
            p: 1,
            "& .xterm-viewport": {
              "::-webkit-scrollbar": { width: "10px" },
              "::-webkit-scrollbar-thumb": { bgcolor: "#404040" },
            },
          }}
        >
          <div ref={terminalRef} style={{ width: "100%", height: "100%" }} />
        </Box>
      </Paper>
    </Box>
  );
};

export default LogStudio;
