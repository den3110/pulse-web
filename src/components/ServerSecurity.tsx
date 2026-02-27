import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  LinearProgress,
  Fade,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  keyframes,
  Drawer,
  Divider,
} from "@mui/material";
import {
  Security as SecurityIcon,
  PlayArrow as PlayIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
  Warning as WarningIcon,
  SkipNext as SkipIcon,
  RadioButtonUnchecked as PendingIcon,
  Build as FixIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Terminal as TerminalIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import api from "../services/api";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(56, 189, 248, 0.3); }
  50% { box-shadow: 0 0 20px rgba(56, 189, 248, 0.8); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

interface CheckResult {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn" | "skip" | "pending" | "running";
  severity: "high" | "medium" | "low" | "info";
  description: string;
  recommendation: string;
  details?: string;
  fixable?: boolean;
  fixCommand?: string;
}

interface SecurityIssue {
  severity: "high" | "medium" | "low";
  description: string;
  recommendation: string;
}

interface SecurityScan {
  _id: string;
  score: number;
  issues: SecurityIssue[];
  passedChecks: string[];
  checks: CheckResult[];
  scannedAt: string;
}

const CHECK_LABELS = [
  { id: "ssh_root_login", label: "SSH Root Login" },
  { id: "ssh_password_auth", label: "SSH Password Auth" },
  { id: "ssh_port", label: "SSH Port" },
  { id: "firewall", label: "Firewall Status" },
  { id: "open_ports", label: "Exposed Ports Audit" },
  { id: "outdated_packages", label: "Outdated Packages" },
  { id: "fail2ban", label: "Brute-force Protection" },
  { id: "unattended_upgrades", label: "Auto Security Updates" },
  { id: "disk_usage", label: "Disk Usage" },
  { id: "world_writable", label: "World-Writable Files" },
  { id: "root_processes", label: "Root Processes" },
  { id: "reboot_required", label: "Pending Reboot" },
  { id: "empty_password", label: "Empty Password Accounts" },
  { id: "suid_binaries", label: "SUID Binaries Audit" },
  { id: "sudo_nopasswd", label: "Sudo NOPASSWD Check" },
  { id: "uid_zero", label: "Users with UID 0" },
  { id: "ssh_keys_audit", label: "SSH Keys Audit" },
  { id: "cron_audit", label: "Suspicious Cron Jobs" },
  { id: "kernel_hardening", label: "Kernel Security (sysctl)" },
  { id: "ssl_expiry", label: "SSL Certificate Expiry" },
];

const statusIcon = (status: string, size = 18) => {
  switch (status) {
    case "pass":
      return <CheckCircleIcon sx={{ fontSize: size, color: "#4ade80" }} />;
    case "fail":
      return <ErrorIcon sx={{ fontSize: size, color: "#ef4444" }} />;
    case "warn":
      return <WarningIcon sx={{ fontSize: size, color: "#fbbf24" }} />;
    case "skip":
      return <SkipIcon sx={{ fontSize: size, color: "#94a3b8" }} />;
    case "running":
      return <CircularProgress size={size - 2} sx={{ color: "#38bdf8" }} />;
    default:
      return <PendingIcon sx={{ fontSize: size, color: "#475569" }} />;
  }
};

const severityColor = (s: string) => {
  if (s === "high") return "#ef4444";
  if (s === "medium") return "#f59e0b";
  if (s === "low") return "#3b82f6";
  return "#94a3b8";
};

// Reusable component to render a list of check results
const CheckList: React.FC<{
  checks: CheckResult[];
  expandedCheck: string | null;
  setExpandedCheck: (id: string | null) => void;
  onFix?: (check: CheckResult) => void;
  t: any;
}> = ({ checks, expandedCheck, setExpandedCheck, onFix, t }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
    {checks.map((check) => (
      <Fade key={check.id} in timeout={300}>
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1,
              borderRadius: 1,
              cursor:
                check.status !== "pending" && check.status !== "running"
                  ? "pointer"
                  : "default",
              bgcolor:
                check.status === "running"
                  ? "rgba(56,189,248,0.08)"
                  : check.status === "fail"
                    ? "rgba(239,68,68,0.06)"
                    : check.status === "warn"
                      ? "rgba(251,191,36,0.06)"
                      : check.status === "pass"
                        ? "rgba(74,222,128,0.04)"
                        : "transparent",
              transition: "all 0.3s",
              "&:hover":
                check.status !== "pending" && check.status !== "running"
                  ? { bgcolor: "rgba(255,255,255,0.04)" }
                  : {},
              ...(check.status !== "pending" &&
                check.status !== "running" && {
                  animation: `${slideIn} 0.3s ease-out`,
                }),
            }}
            onClick={() =>
              check.status !== "pending" &&
              check.status !== "running" &&
              setExpandedCheck(expandedCheck === check.id ? null : check.id)
            }
          >
            {statusIcon(check.status)}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: check.status === "running" ? 600 : 400,
                  color:
                    check.status === "pending"
                      ? "text.disabled"
                      : "text.primary",
                }}
              >
                {check.label}
              </Typography>
              {check.description && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: "block",
                    mt: 0.2,
                  }}
                >
                  {check.description}
                </Typography>
              )}
            </Box>
            {check.status !== "pending" && check.status !== "running" && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {check.fixable && onFix && (
                  <Chip
                    icon={<FixIcon sx={{ fontSize: 14 }} />}
                    label={t("security.autoFix", "Auto-Fix")}
                    size="small"
                    color="warning"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFix(check);
                    }}
                    sx={{ cursor: "pointer" }}
                  />
                )}
                {check.severity !== "info" && (
                  <Chip
                    label={check.severity.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: `${severityColor(check.severity)}20`,
                      color: severityColor(check.severity),
                      fontWeight: 700,
                      fontSize: 10,
                      height: 22,
                    }}
                  />
                )}
                {expandedCheck === check.id ? (
                  <CollapseIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                ) : (
                  <ExpandIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                )}
              </Box>
            )}
          </Box>
          <Collapse in={expandedCheck === check.id}>
            <Box
              sx={{
                ml: 5,
                p: 1.5,
                mb: 0.5,
                borderRadius: 1,
                bgcolor: "rgba(0,0,0,0.15)",
                borderLeft: `3px solid ${severityColor(check.severity)}`,
              }}
            >
              {check.recommendation && (
                <Typography
                  variant="caption"
                  sx={{ display: "block", mb: 0.5 }}
                >
                  💡 {check.recommendation}
                </Typography>
              )}
              {check.details && (
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "text.secondary",
                    whiteSpace: "pre-wrap",
                    m: 0,
                  }}
                >
                  {check.details}
                </Typography>
              )}
              {check.fixable && onFix && (
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<FixIcon />}
                  onClick={() => onFix(check)}
                  sx={{ mt: 1 }}
                >
                  {t("security.fixNow", "Fix This Issue")}
                </Button>
              )}
            </Box>
          </Collapse>
        </Box>
      </Fade>
    ))}
  </Box>
);

export const ServerSecurity: React.FC<{ serverId: string }> = ({
  serverId,
}) => {
  const { t } = useTranslation();
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [liveChecks, setLiveChecks] = useState<CheckResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [selectedHistoryScan, setSelectedHistoryScan] =
    useState<SecurityScan | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Remediation state
  const [fixDialog, setFixDialog] = useState<CheckResult | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixLogs, setFixLogs] = useState<string[]>([]);
  const fixLogsEndRef = useRef<HTMLDivElement>(null);

  const fetchScans = async () => {
    try {
      const { data } = await api.get(`/servers/${serverId}/security-scans`);
      setScans(data.scans);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("security.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const scrollToResults = useCallback(() => {
    if (scans.length > 0) {
      setSelectedHistoryScan(scans[0]);
    }
  }, [scans]);

  const runScan = useCallback(() => {
    setScanning(true);
    setScanComplete(false);
    setProgress(0);

    const initial: CheckResult[] = CHECK_LABELS.map((c, i) => ({
      id: c.id,
      label: c.label,
      status: i === 0 ? ("running" as const) : ("pending" as const),
      severity: "info" as const,
      description: "",
      recommendation: "",
    }));
    setLiveChecks(initial);

    const token = localStorage.getItem("accessToken");
    const API_URL = import.meta.env.VITE_API_URL || "";
    const url = `${API_URL}/api/servers/${serverId}/scan?token=${encodeURIComponent(token || "")}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;
    let completedCount = 0;

    es.addEventListener("check", (e: MessageEvent) => {
      const result: CheckResult = JSON.parse(e.data);
      completedCount++;
      setProgress(Math.round((completedCount / CHECK_LABELS.length) * 100));

      setLiveChecks((prev) => {
        const updated = prev.map((c) => (c.id === result.id ? result : c));
        const nextPending = updated.findIndex((c) => c.status === "pending");
        if (nextPending !== -1) {
          updated[nextPending] = { ...updated[nextPending], status: "running" };
        }
        return updated;
      });
    });

    es.addEventListener("complete", (e: MessageEvent) => {
      const savedScan = JSON.parse(e.data);
      setProgress(100);
      setTimeout(() => {
        setScanning(false);
        setScanComplete(true); // Keep results panel visible!
        setScans((prev) => [savedScan, ...prev]);
        toast.success(t("security.scanSuccess"));
      }, 600);
      es.close();
    });

    es.addEventListener("error", () => {
      setScanning(false);
      es.close();
    });
  }, [serverId, t]);

  const openFixDialog = (check: CheckResult) => {
    setFixDialog(check);
    setFixLogs([]);
  };

  const runFix = useCallback(() => {
    if (!fixDialog) return;
    setFixing(true);
    setFixLogs([`▶ Starting remediation for: ${fixDialog.label}`, ""]);

    const token = localStorage.getItem("accessToken");
    const API_URL = import.meta.env.VITE_API_URL || "";
    const url = `${API_URL}/api/servers/${serverId}/remediate/${fixDialog.id}?token=${encodeURIComponent(token || "")}`;

    const es = new EventSource(url);

    es.addEventListener("step", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (data.step === "running") {
        setFixLogs((prev) => [...prev, `$ ${data.command}`, "  Running..."]);
      } else if (data.step === "done") {
        setFixLogs((prev) => {
          const next = [...prev];
          if (next[next.length - 1] === "  Running...") next.pop();
          if (data.stdout) next.push(`  ${data.stdout}`);
          if (data.stderr) next.push(`  ⚠ ${data.stderr}`);
          next.push(
            data.code === 0 ? "  ✓ Success" : `  ✗ Exit code: ${data.code}`,
          );
          next.push("");
          return next;
        });
      } else if (data.step === "error") {
        setFixLogs((prev) => [...prev, `  ✗ Error: ${data.error}`, ""]);
      } else if (data.step === "complete") {
        setFixLogs((prev) => [
          ...prev,
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          "✅ Remediation complete! Re-run the scan to verify.",
        ]);
        setFixing(false);
        es.close();
        toast.success(t("security.fixSuccess", "Fix applied successfully!"));
      }
    });

    es.addEventListener("error", () => {
      setFixing(false);
      es.close();
    });
  }, [fixDialog, serverId, t]);

  useEffect(() => {
    fixLogsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [fixLogs]);

  const downloadPdf = async (scanId: string) => {
    try {
      const response = await api.get(
        `/servers/${serverId}/security-scans/${scanId}/pdf`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `security-report-${serverId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error(t("security.downloadPdfFailed"));
    }
  };

  useEffect(() => {
    fetchScans();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [serverId]);

  if (loading) {
    return <CircularProgress sx={{ display: "block", m: "2rem auto" }} />;
  }

  const latestScan = scans.length > 0 ? scans[0] : null;
  const displayScan =
    scanning || scanComplete ? null : selectedHistoryScan || latestScan;
  const displayChecks =
    scanning || scanComplete ? liveChecks : displayScan?.checks || [];
  const showPanel = scanning || scanComplete || displayChecks.length > 0;

  return (
    <Box sx={{ mt: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <SecurityIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h6">{t("security.title")}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t("security.subtitle")}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={
            scanning ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <PlayIcon />
            )
          }
          onClick={runScan}
          disabled={scanning}
          sx={{
            ...(scanning && {
              animation: `${pulseGlow} 2s ease-in-out infinite`,
            }),
          }}
        >
          {scanning
            ? t("security.scanning", "Scanning...")
            : t("security.runScan")}
        </Button>
      </Box>

      {/* Score card at the top when we have results */}
      {latestScan && !scanning && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                p: 3,
                height: "100%",
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t("security.overallScore")}
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  color:
                    latestScan.score >= 80
                      ? "#4ade80"
                      : latestScan.score >= 50
                        ? "#fbbf24"
                        : "#ef4444",
                  fontWeight: "bold",
                  my: 1,
                }}
              >
                {latestScan.score}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("security.lastScanned")}:{" "}
                {new Date(latestScan.scannedAt).toLocaleString("vi-VN")}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box sx={{ display: "flex", gap: 4, mb: 1 }}>
                  <Typography
                    variant="subtitle2"
                    onClick={scrollToResults}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      cursor: "pointer",
                      transition: "color 0.2s",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    <ErrorIcon sx={{ fontSize: 16, color: "#ef4444" }} />
                    {latestScan.issues.length} {t("security.issuesCount")}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    onClick={scrollToResults}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      cursor: "pointer",
                      transition: "color 0.2s",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#4ade80" }} />
                    {latestScan.passedChecks.length}{" "}
                    {t("security.passedChecks")}
                  </Typography>
                </Box>
                {/* Quick summary of top issues */}
                {latestScan.issues.slice(0, 3).map((issue, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1,
                      mb: 0.5,
                      borderRadius: 1,
                      borderLeft: "3px solid",
                      borderColor:
                        issue.severity === "high"
                          ? "error.main"
                          : "warning.main",
                      bgcolor: "rgba(255,0,0,0.04)",
                    }}
                  >
                    <Typography variant="caption" fontWeight="bold">
                      {issue.description}
                    </Typography>
                  </Box>
                ))}
                {latestScan.issues.length > 3 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    onClick={scrollToResults}
                    sx={{
                      cursor: "pointer",
                      display: "inline-block",
                      mt: 0.5,
                      transition: "color 0.2s",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    +{latestScan.issues.length - 3}{" "}
                    {t("security.moreIssues", "more issues...")}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Live / completed check results panel */}
      {showPanel && (
        <Card
          id="scan-results-panel"
          sx={{
            mb: 3,
            border: scanning
              ? "1px solid rgba(56, 189, 248, 0.3)"
              : "1px solid rgba(74, 222, 128, 0.2)",
            overflow: "hidden",
          }}
        >
          {scanning && (
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 4,
                "& .MuiLinearProgress-bar": {
                  background: "linear-gradient(90deg, #38bdf8, #818cf8)",
                },
              }}
            />
          )}
          <CardContent sx={{ p: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
            >
              {scanning ? (
                <>
                  <CircularProgress size={14} sx={{ color: "#38bdf8" }} />
                  {t("security.scanningProgress", "Scanning in progress...")} (
                  {progress}%)
                </>
              ) : (
                <>
                  <CheckCircleIcon sx={{ fontSize: 16, color: "#4ade80" }} />
                  {displayScan
                    ? t(
                        "security.scanResultsHistorial",
                        `Scan Results (${new Date(displayScan.scannedAt).toLocaleString("vi-VN")})`,
                      )
                    : t("security.scanResults", "Scan Results")}{" "}
                  — {t("security.clickToExpand", "click any item for details")}
                </>
              )}
            </Typography>
            <CheckList
              checks={displayChecks}
              expandedCheck={expandedCheck}
              setExpandedCheck={setExpandedCheck}
              onFix={openFixDialog}
              t={t}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!latestScan && !scanning ? (
        <Card
          sx={{
            p: 4,
            textAlign: "center",
            border: "1px dashed rgba(255,255,255,0.2)",
            bgcolor: "transparent",
          }}
        >
          <SecurityIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t("security.noScans")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t("security.noScansSubtitle")}
          </Typography>
          <Button variant="outlined" onClick={runScan} startIcon={<PlayIcon />}>
            {t("security.runFirstScan")}
          </Button>
        </Card>
      ) : null}

      {/* Scan history with expandable rows */}
      {scans.length > 0 && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                p: 2,
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {t("security.scanHistory")}
            </Typography>
            {scans.map((scan) => (
              <Box key={scan._id}>
                {/* Row */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    py: 1.5,
                    cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                    transition: "background 0.2s",
                  }}
                  onClick={() => setSelectedHistoryScan(scan)}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">
                      {new Date(scan.scannedAt).toLocaleString("vi-VN")}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Chip
                      label={scan.score}
                      size="small"
                      color={
                        scan.score >= 80
                          ? "success"
                          : scan.score >= 50
                            ? "warning"
                            : "error"
                      }
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ minWidth: 80 }}
                    >
                      {scan.issues.length} {t("security.issuesCount")} ·{" "}
                      {scan.passedChecks.length}{" "}
                      {t("security.passed", "passed")}
                    </Typography>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPdf(scan._id);
                      }}
                      title={t("security.downloadPdf")}
                    >
                      <PdfIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Remediation Dialog */}
      <Dialog
        open={!!fixDialog}
        onClose={() => !fixing && setFixDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FixIcon color="warning" />
          {t("security.autoRemediateTitle", "Auto-Remediate")}:{" "}
          {fixDialog?.label}
        </DialogTitle>
        <DialogContent>
          {!fixing && fixLogs.length === 0 && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {fixDialog?.description}
              </Typography>
              <Card
                sx={{
                  bgcolor: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  p: 2,
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <TerminalIcon sx={{ fontSize: 16 }} />
                  {t("security.whatWillHappen", "What will happen:")}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {fixDialog?.fixCommand}
                </Typography>
              </Card>
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ display: "block" }}
              >
                ⚠️{" "}
                {t(
                  "security.fixWarning",
                  "This will execute commands on your server. Make sure you have a backup.",
                )}
              </Typography>
            </Box>
          )}
          {(fixing || fixLogs.length > 0) && (
            <Box
              sx={{
                bgcolor: "#0d1117",
                color: "#c9d1d9",
                borderRadius: 1,
                p: 2,
                fontFamily: "monospace",
                fontSize: 12,
                maxHeight: 300,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
              }}
            >
              {fixLogs.map((line, i) => (
                <Box
                  key={i}
                  sx={{
                    color: line.startsWith("$")
                      ? "#58a6ff"
                      : line.includes("✓")
                        ? "#4ade80"
                        : line.includes("✗") || line.includes("⚠")
                          ? "#ef4444"
                          : line.includes("✅")
                            ? "#4ade80"
                            : line.startsWith("▶") || line.startsWith("━")
                              ? "#8b949e"
                              : "#c9d1d9",
                    fontWeight: line.startsWith("$") ? 600 : 400,
                  }}
                >
                  {line}
                </Box>
              ))}
              <div ref={fixLogsEndRef} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFixDialog(null)} disabled={fixing}>
            {t("common.close", "Close")}
          </Button>
          {fixLogs.length === 0 && (
            <Button
              variant="contained"
              color="warning"
              onClick={runFix}
              disabled={fixing}
              startIcon={
                fixing ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <FixIcon />
                )
              }
            >
              {t("security.confirmFix", "Apply Fix")}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Detail Drawer for History Scans */}
      <Drawer
        anchor="right"
        open={!!selectedHistoryScan}
        onClose={() => setSelectedHistoryScan(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 500 },
            bgcolor: "var(--terminal-bg, #1a1b26)",
            borderLeft: "1px solid var(--border-color, rgba(255,255,255,0.05))",
            color: "var(--terminal-text, #f9fafb)",
          },
        }}
      >
        {selectedHistoryScan && (
          <Box
            sx={{ height: "100%", display: "flex", flexDirection: "column" }}
          >
            <Box
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom:
                  "1px solid var(--border-color, rgba(255,255,255,0.05))",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t("security.scanResults")}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => downloadPdf(selectedHistoryScan._id)}
                  title={t("security.downloadPdf")}
                >
                  <PdfIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setSelectedHistoryScan(null)}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
            <Box
              sx={{ p: 2, borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t("security.score")}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color:
                        selectedHistoryScan.score >= 80
                          ? "#4ade80"
                          : selectedHistoryScan.score >= 50
                            ? "#fbbf24"
                            : "#ef4444",
                    }}
                  >
                    {selectedHistoryScan.score}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    {t("security.lastScanned")}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                    {new Date(selectedHistoryScan.scannedAt).toLocaleString(
                      "vi-VN",
                    )}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
              {selectedHistoryScan.issues.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: "#ef4444",
                    }}
                  >
                    <ErrorIcon sx={{ fontSize: 20 }} />
                    {t("security.issuesCount")} (
                    {selectedHistoryScan.issues.length})
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {selectedHistoryScan.issues.map((issue, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          borderLeft: "4px solid",
                          borderColor:
                            issue.severity === "high" ? "#ef4444" : "#f59e0b",
                          bgcolor: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <Chip
                            label={issue.severity.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: `${severityColor(issue.severity)}20`,
                              color: severityColor(issue.severity),
                              fontWeight: 700,
                              fontSize: 11,
                              height: 22,
                            }}
                          />
                          <Typography variant="body1" fontWeight="bold">
                            {issue.description}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 1, opacity: 0.1 }} />
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                          }}
                        >
                          <span>💡</span> {issue.recommendation}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {selectedHistoryScan.passedChecks.length > 0 && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: "#4ade80",
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 20 }} />
                    {t("security.passedChecks")} (
                    {selectedHistoryScan.passedChecks.length})
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {selectedHistoryScan.passedChecks.map((check, idx) => (
                      <Chip
                        key={idx}
                        icon={
                          <CheckCircleIcon
                            sx={{ fontSize: 16, color: "#4ade80" }}
                          />
                        }
                        label={check}
                        variant="outlined"
                        sx={{
                          borderColor: "rgba(74, 222, 128, 0.3)",
                          color: "#4ade80",
                          bgcolor: "rgba(74, 222, 128, 0.05)",
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};
