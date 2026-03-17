import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  IconButton,
  Tooltip,
  Collapse,
  Alert,
  Drawer,
  Divider,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import TerminalIcon from "@mui/icons-material/Terminal";
import InfoIcon from "@mui/icons-material/Info";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import api from "../services/api";

/* ────────── Types ────────── */

interface ToolDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  checkCmd: string;
  installCmd: string;
  uninstallCmd: string;
  category: "runtime" | "webserver" | "devtools" | "container" | "database";
  docs?: string;
  notes?: string;
}

interface ToolStatus {
  installed: boolean;
  version: string;
  installing: boolean;
  uninstalling: boolean;
  installLog: string;
}

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "runtime", label: "Runtimes", icon: "🚀" },
  { key: "webserver", label: "Web Servers", icon: "🌐" },
  { key: "container", label: "Containers", icon: "🐳" },
  { key: "devtools", label: "Dev Tools", icon: "🛠️" },
  { key: "database", label: "Databases", icon: "🗄️" },
];

/* ────────── Component ────────── */

interface ServerSetupProps {
  serverId: string;
}

const ServerSetup: React.FC<ServerSetupProps> = ({ serverId }) => {
  const { t } = useTranslation();
  const [tools, setTools] = useState<ToolDef[]>([]);
  const [toolStatuses, setToolStatuses] = useState<Record<string, ToolStatus>>(
    {},
  );
  const [loadingTools, setLoadingTools] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [drawerTool, setDrawerTool] = useState<ToolDef | null>(null);

  /* ── Fetch tool definitions from backend ── */
  const fetchTools = useCallback(async () => {
    setLoadingTools(true);
    try {
      const { data } = await api.get(`/servers/${serverId}/setup/tools`);
      setTools(data);
    } catch {
      toast.error("Failed to load tools list");
    } finally {
      setLoadingTools(false);
    }
  }, [serverId]);

  /* ── Check all tools status via backend ── */
  const checkAll = useCallback(async () => {
    setCheckingAll(true);
    try {
      const { data } = await api.post(`/servers/${serverId}/setup/check`);
      const statuses: Record<string, ToolStatus> = {};
      for (const [id, result] of Object.entries(data) as [
        string,
        { installed: boolean; version: string },
      ][]) {
        statuses[id] = {
          installed: result.installed,
          version: result.version,
          installing: toolStatuses[id]?.installing || false,
          uninstalling: toolStatuses[id]?.uninstalling || false,
          installLog: toolStatuses[id]?.installLog || "",
        };
      }
      setToolStatuses(statuses);
      const installed = Object.values(statuses).filter(
        (s) => s.installed,
      ).length;
      toast.success(
        `Check complete: ${installed} / ${Object.keys(statuses).length} installed`,
      );
    } catch {
      toast.error("Failed to check tools");
    } finally {
      setCheckingAll(false);
    }
  }, [serverId, toolStatuses]);

  /* ── Check a single tool ── */
  const checkSingleTool = useCallback(
    async (toolId: string) => {
      try {
        const { data } = await api.post(
          `/servers/${serverId}/setup/check/${toolId}`,
        );
        setToolStatuses((prev) => ({
          ...prev,
          [toolId]: {
            ...prev[toolId],
            installed: data.installed,
            version: data.version,
            installing: false,
          },
        }));
      } catch {
        /* silent */
      }
    },
    [serverId],
  );

  /* ── Install a tool via backend (SSE streaming) ── */
  const installTool = useCallback(
    async (tool: ToolDef) => {
      setToolStatuses((prev) => ({
        ...prev,
        [tool.id]: { ...prev[tool.id], installing: true, installLog: "" },
      }));
      setExpandedLogs((prev) => new Set(prev).add(tool.id));

      try {
        const token = localStorage.getItem("accessToken");
        const apiUrl = import.meta.env.VITE_API_URL || "";
        const url = `${apiUrl}/api/servers/${serverId}/setup/install/${tool.id}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const events = buffer.split("\n\n");
          buffer = events.pop() || ""; // keep incomplete event in buffer

          for (const eventBlock of events) {
            if (!eventBlock.trim()) continue;

            let eventName = "";
            let eventData = "";

            for (const line of eventBlock.split("\n")) {
              if (line.startsWith("event: ")) {
                eventName = line.slice(7);
              } else if (line.startsWith("data: ")) {
                eventData = line.slice(6);
              }
            }

            if (!eventName || !eventData) continue;

            try {
              const parsed = JSON.parse(eventData);

              if (eventName === "log") {
                // Append log text in real-time
                setToolStatuses((prev) => ({
                  ...prev,
                  [tool.id]: {
                    ...prev[tool.id],
                    installLog: (prev[tool.id]?.installLog || "") + parsed.text,
                  },
                }));
              } else if (eventName === "done") {
                if (parsed.success) {
                  toast.success(`${tool.name} installed successfully!`);
                  setToolStatuses((prev) => ({
                    ...prev,
                    [tool.id]: {
                      installed: true,
                      version: parsed.version || "",
                      installing: false,
                      uninstalling: false,
                      installLog: prev[tool.id]?.installLog || "Done",
                    },
                  }));
                } else {
                  toast.error(
                    `${tool.name} installation failed (exit code ${parsed.exitCode})`,
                  );
                  setToolStatuses((prev) => ({
                    ...prev,
                    [tool.id]: {
                      ...prev[tool.id],
                      installing: false,
                    },
                  }));
                }
              } else if (eventName === "error") {
                toast.error(`${tool.name}: ${parsed.message}`);
                setToolStatuses((prev) => ({
                  ...prev,
                  [tool.id]: {
                    ...prev[tool.id],
                    installing: false,
                    installLog:
                      (prev[tool.id]?.installLog || "") +
                      `\nError: ${parsed.message}`,
                  },
                }));
              }
            } catch {
              /* parse error, skip */
            }
          }
        }
      } catch (err: any) {
        const errMsg = err.message || "Unknown error";
        toast.error(`Failed to install ${tool.name}: ${errMsg}`);
        setToolStatuses((prev) => ({
          ...prev,
          [tool.id]: {
            ...prev[tool.id],
            installing: false,
            installLog:
              (prev[tool.id]?.installLog || "") + `\nError: ${errMsg}`,
          },
        }));
      }
    },
    [serverId],
  );

  /* ── Uninstall a tool via backend (SSE streaming) ── */
  const uninstallTool = useCallback(
    async (tool: ToolDef) => {
      setToolStatuses((prev) => ({
        ...prev,
        [tool.id]: { ...prev[tool.id], uninstalling: true, installLog: "" },
      }));
      setExpandedLogs((prev) => new Set(prev).add(tool.id));

      try {
        const token = localStorage.getItem("accessToken");
        const apiUrl = import.meta.env.VITE_API_URL || "";
        const url = `${apiUrl}/api/servers/${serverId}/setup/uninstall/${tool.id}`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const eventBlock of events) {
            if (!eventBlock.trim()) continue;
            let eventName = "";
            let eventData = "";
            for (const line of eventBlock.split("\n")) {
              if (line.startsWith("event: ")) eventName = line.slice(7);
              else if (line.startsWith("data: ")) eventData = line.slice(6);
            }
            if (!eventName || !eventData) continue;
            try {
              const parsed = JSON.parse(eventData);
              if (eventName === "log") {
                setToolStatuses((prev) => ({
                  ...prev,
                  [tool.id]: {
                    ...prev[tool.id],
                    installLog: (prev[tool.id]?.installLog || "") + parsed.text,
                  },
                }));
              } else if (eventName === "done") {
                if (parsed.success) {
                  toast.success(`${tool.name} uninstalled!`);
                  setToolStatuses((prev) => ({
                    ...prev,
                    [tool.id]: {
                      installed: false,
                      version: "",
                      installing: false,
                      uninstalling: false,
                      installLog: prev[tool.id]?.installLog || "Done",
                    },
                  }));
                } else {
                  toast.error(`${tool.name} uninstall failed`);
                  setToolStatuses((prev) => ({
                    ...prev,
                    [tool.id]: { ...prev[tool.id], uninstalling: false },
                  }));
                }
              } else if (eventName === "error") {
                toast.error(`${tool.name}: ${parsed.message}`);
                setToolStatuses((prev) => ({
                  ...prev,
                  [tool.id]: {
                    ...prev[tool.id],
                    uninstalling: false,
                    installLog:
                      (prev[tool.id]?.installLog || "") +
                      `\nError: ${parsed.message}`,
                  },
                }));
              }
            } catch {
              /* skip */
            }
          }
        }
      } catch (err: any) {
        toast.error(`Failed to uninstall ${tool.name}: ${err.message}`);
        setToolStatuses((prev) => ({
          ...prev,
          [tool.id]: { ...prev[tool.id], uninstalling: false },
        }));
      }
    },
    [serverId],
  );

  /* ── Init ── */
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  useEffect(() => {
    if (tools.length > 0) {
      checkAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools]);

  const toggleLog = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Auto-scroll log containers ── */
  const logRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const drawerLogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Auto-scroll any visible log containers
    for (const id of expandedLogs) {
      const el = logRefs.current[id];
      if (el) el.scrollTop = el.scrollHeight;
    }
    // Auto-scroll drawer log
    if (drawerLogRef.current) {
      drawerLogRef.current.scrollTop = drawerLogRef.current.scrollHeight;
    }
  }, [toolStatuses, expandedLogs]);

  /* ── Loading State ── */
  if (loadingTools) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            🧰 {t("serverSetup.title", "Server Setup")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              "serverSetup.subtitle",
              "Install and manage common tools & libraries on your server",
            )}
          </Typography>
        </Box>
        <Tooltip title={t("serverSetup.recheckAll", "Re-check all tools")}>
          <IconButton onClick={checkAll} disabled={checkingAll}>
            {checkingAll ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {checkingAll && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      {/* Summary */}
      <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
        {(() => {
          const total = tools.length;
          const installed = tools.filter(
            (t) => toolStatuses[t.id]?.installed,
          ).length;
          return (
            <Chip
              label={`${installed} / ${total} installed`}
              color="success"
              variant="outlined"
              size="small"
              icon={<CheckCircleIcon />}
            />
          );
        })()}
      </Box>

      {/* Tool Categories */}
      {CATEGORIES.map((cat) => {
        const catTools = tools.filter((t) => t.category === cat.key);
        if (catTools.length === 0) return null;
        return (
          <Box key={cat.key} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}
            >
              <span>{cat.icon}</span> {cat.label}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  md: "1fr 1fr 1fr",
                },
                gap: 2,
              }}
            >
              {catTools.map((tool) => {
                const status = toolStatuses[tool.id];
                const isExpanded = expandedLogs.has(tool.id);

                return (
                  <Card
                    key={tool.id}
                    sx={{
                      border: "1px solid",
                      borderColor: status?.installed
                        ? "success.main"
                        : status?.installing
                          ? "info.main"
                          : "divider",
                      borderRadius: 2,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: status?.installed
                          ? "success.light"
                          : "primary.main",
                        transform: "translateY(-1px)",
                        boxShadow: 2,
                      },
                      opacity: status?.installing ? 0.9 : 1,
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      {/* Tool Header */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            minWidth: 0,
                          }}
                        >
                          <Typography sx={{ fontSize: 22 }}>
                            {tool.icon}
                          </Typography>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="subtitle2"
                              fontWeight={600}
                              noWrap
                            >
                              {tool.name}
                            </Typography>
                            {status?.installed && status.version && (
                              <Typography
                                variant="caption"
                                color="success.main"
                                sx={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: 10,
                                }}
                              >
                                {status.version}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {/* Status icon */}
                        {checkingAll ? (
                          <CircularProgress size={18} />
                        ) : status?.installed ? (
                          <CheckCircleIcon
                            sx={{ color: "success.main", fontSize: 20 }}
                          />
                        ) : (
                          <CancelIcon
                            sx={{ color: "text.disabled", fontSize: 20 }}
                          />
                        )}
                      </Box>

                      {/* Description */}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          mb: 1.5,
                          lineHeight: 1.4,
                          minHeight: 32,
                        }}
                      >
                        {tool.description}
                      </Typography>

                      {/* Installing progress */}
                      {status?.installing && (
                        <LinearProgress
                          sx={{ mb: 1, borderRadius: 1, height: 3 }}
                        />
                      )}

                      {/* Actions */}
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                        }}
                      >
                        {!status?.installed && !checkingAll && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={
                              status?.installing ? (
                                <CircularProgress size={14} color="inherit" />
                              ) : (
                                <DownloadIcon />
                              )
                            }
                            disabled={status?.installing}
                            onClick={() => installTool(tool)}
                            sx={{
                              fontSize: 11,
                              textTransform: "none",
                              borderRadius: 1.5,
                            }}
                          >
                            {status?.installing
                              ? t("serverSetup.installing", "Installing...")
                              : t("serverSetup.install", "Install")}
                          </Button>
                        )}
                        {status?.installed && (
                          <Chip
                            label={t("serverSetup.installed", "Installed")}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontSize: 10, height: 24 }}
                          />
                        )}
                        <Tooltip title={t("serverSetup.details", "Details")}>
                          <IconButton
                            size="small"
                            onClick={() => setDrawerTool(tool)}
                            sx={{ ml: "auto" }}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {status?.installLog && (
                          <IconButton
                            size="small"
                            onClick={() => toggleLog(tool.id)}
                          >
                            <Tooltip title="View log">
                              {isExpanded ? (
                                <ExpandLessIcon fontSize="small" />
                              ) : (
                                <ExpandMoreIcon fontSize="small" />
                              )}
                            </Tooltip>
                          </IconButton>
                        )}
                      </Box>

                      {/* Install Log */}
                      <Collapse in={isExpanded && !!status?.installLog}>
                        <Box
                          ref={(el: HTMLDivElement | null) => {
                            logRefs.current[tool.id] = el;
                          }}
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: "rgba(0,0,0,0.3)",
                            borderRadius: 1,
                            maxHeight: 200,
                            overflow: "auto",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            color: "text.secondary",
                          }}
                        >
                          {status?.installLog}
                        </Box>
                      </Collapse>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        );
      })}

      {/* Quick Setup Tip */}
      <Alert severity="info" sx={{ mt: 2 }} icon={<TerminalIcon />}>
        <Typography variant="body2" fontWeight={500}>
          {t(
            "serverSetup.quickSetupTip",
            "💡 Tip: These installers use apt-get (Debian/Ubuntu). For other distros, use the Terminal tab to install manually.",
          )}
        </Typography>
      </Alert>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={!!drawerTool}
        onClose={() => setDrawerTool(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 440 }, p: 0 } }}
      >
        {drawerTool &&
          (() => {
            const ds = toolStatuses[drawerTool.id];
            return (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                {/* Drawer Header */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 3,
                    py: 2,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Typography sx={{ fontSize: 28 }}>
                      {drawerTool.icon}
                    </Typography>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {drawerTool.name}
                      </Typography>
                      {ds?.installed && ds.version && (
                        <Typography
                          variant="caption"
                          color="success.main"
                          sx={{
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {ds.version}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <IconButton onClick={() => setDrawerTool(null)}>
                    <CloseIcon />
                  </IconButton>
                </Box>

                {/* Drawer Body */}
                <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
                  {/* Status */}
                  <Box sx={{ mb: 2.5 }}>
                    <Chip
                      icon={
                        ds?.installed ? <CheckCircleIcon /> : <CancelIcon />
                      }
                      label={
                        ds?.installed
                          ? t("serverSetup.installed", "Installed")
                          : t("serverSetup.notInstalled", "Not Installed")
                      }
                      color={ds?.installed ? "success" : "default"}
                      variant="outlined"
                    />
                  </Box>

                  {/* Description */}
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ mb: 0.5 }}
                  >
                    {t("serverSetup.description", "Description")}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2.5 }}
                  >
                    {drawerTool.description}
                  </Typography>

                  {/* Notes */}
                  {drawerTool.notes && (
                    <>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{ mb: 0.5 }}
                      >
                        📝 {t("serverSetup.notes", "Notes")}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2.5, lineHeight: 1.6 }}
                      >
                        {drawerTool.notes}
                      </Typography>
                    </>
                  )}

                  {/* Documentation Link */}
                  {drawerTool.docs && (
                    <>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{ mb: 0.5 }}
                      >
                        📖 {t("serverSetup.documentation", "Documentation")}
                      </Typography>
                      <Button
                        size="small"
                        variant="text"
                        endIcon={<OpenInNewIcon />}
                        href={drawerTool.docs}
                        target="_blank"
                        sx={{ textTransform: "none", mb: 2.5, fontSize: 13 }}
                      >
                        {drawerTool.docs}
                      </Button>
                    </>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Check Command */}
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ mb: 0.5 }}
                  >
                    🔍 {t("serverSetup.checkCommand", "Check Command")}
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: "rgba(0,0,0,0.25)",
                      borderRadius: 1,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      mb: 2,
                      position: "relative",
                    }}
                  >
                    {drawerTool.checkCmd}
                    <IconButton
                      size="small"
                      sx={{ position: "absolute", top: 4, right: 4 }}
                      onClick={() => {
                        navigator.clipboard.writeText(drawerTool.checkCmd);
                        toast.success("Copied!");
                      }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>

                  {/* Install Command */}
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ mb: 0.5 }}
                  >
                    ⚙️ {t("serverSetup.installCommand", "Install Command")}
                  </Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: "rgba(0,0,0,0.25)",
                      borderRadius: 1,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      mb: 2.5,
                      position: "relative",
                    }}
                  >
                    {drawerTool.installCmd}
                    <IconButton
                      size="small"
                      sx={{ position: "absolute", top: 4, right: 4 }}
                      onClick={() => {
                        navigator.clipboard.writeText(drawerTool.installCmd);
                        toast.success("Copied!");
                      }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>

                  {/* Install Log */}
                  {ds?.installLog && (
                    <>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{ mb: 0.5 }}
                      >
                        📋 {t("serverSetup.installLog", "Install Log")}
                      </Typography>
                      <Box
                        ref={drawerLogRef}
                        sx={{
                          p: 1.5,
                          bgcolor: "rgba(0,0,0,0.3)",
                          borderRadius: 1,
                          maxHeight: 250,
                          overflow: "auto",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          color: "text.secondary",
                          mb: 2,
                        }}
                      >
                        {ds.installLog}
                      </Box>
                    </>
                  )}
                </Box>

                {/* Drawer Footer */}
                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    borderTop: 1,
                    borderColor: "divider",
                    display: "flex",
                    gap: 1,
                  }}
                >
                  {!ds?.installed && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={
                        ds?.installing ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <DownloadIcon />
                        )
                      }
                      disabled={ds?.installing}
                      onClick={() => installTool(drawerTool)}
                      sx={{ textTransform: "none" }}
                    >
                      {ds?.installing
                        ? t("serverSetup.installing", "Installing...")
                        : t("serverSetup.install", "Install")}
                    </Button>
                  )}
                  {ds?.installed && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<RefreshIcon />}
                        onClick={() => checkSingleTool(drawerTool.id)}
                        sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                        disabled={ds?.uninstalling}
                      >
                        {t("serverSetup.recheck", "Re-check")}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        startIcon={
                          ds?.uninstalling ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <DeleteForeverIcon />
                          )
                        }
                        disabled={ds?.uninstalling}
                        onClick={() => uninstallTool(drawerTool)}
                        sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                      >
                        {ds?.uninstalling
                          ? t("serverSetup.uninstalling", "Removing...")
                          : t("serverSetup.uninstall", "Uninstall")}
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })()}
      </Drawer>
    </Box>
  );
};

export default ServerSetup;
