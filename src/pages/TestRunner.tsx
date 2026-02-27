import React, { useState, useEffect } from "react";
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
  TextField,
  Skeleton,
  LinearProgress,
  useTheme,
  MenuItem,
  Drawer,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ScienceIcon from "@mui/icons-material/Science";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import HistoryIcon from "@mui/icons-material/History";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import SEO from "../components/SEO";

interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip" | "running";
  duration?: number;
  output?: string;
  error?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

const statusIcons: Record<string, React.ReactNode> = {
  pass: <CheckCircleIcon sx={{ color: "#22c55e", fontSize: 20 }} />,
  fail: <ErrorIcon sx={{ color: "#ef4444", fontSize: 20 }} />,
  skip: <SkipNextIcon sx={{ color: "#64748b", fontSize: 20 }} />,
  running: <Skeleton variant="circular" width={20} height={20} />,
};

const statusColors: Record<string, string> = {
  pass: "#22c55e",
  fail: "#ef4444",
  skip: "#64748b",
};

const TestRunner: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [projectId, setProjectId] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [canDeploy, setCanDeploy] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  // History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);

  const fetchHistory = async () => {
    if (!projectId) return;
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/test-runner/${projectId}/history`);
      setHistory(data.history || []);
    } catch {
      toast.error(t("testRunner.historyError", "Failed to load history"));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    api
      .get("/projects")
      .then((res) => setProjects(res.data))
      .catch(() => {});
  }, []);

  const runTests = async () => {
    if (!projectId) return;
    setRunning(true);
    setResults([]);
    setSummary(null);
    setCanDeploy(null);

    const token = localStorage.getItem("accessToken");
    const API_URL = import.meta.env.VITE_API_URL || "";

    try {
      const response = await fetch(
        `${API_URL}/api/test-runner/${projectId}/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() || ""; // keep incomplete chunk

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
                  // Add a running skeleton entry
                  setResults((prev) => [
                    ...prev.filter((r) => r.name !== json.name),
                    { name: json.name, status: "running" },
                  ]);
                } else if (event === "result") {
                  // Replace skeleton with actual result
                  setResults((prev) => [
                    ...prev.filter((r) => r.name !== json.name),
                    json,
                  ]);
                } else if (event === "complete") {
                  // End of tests
                  setSummary(json.summary);
                  setCanDeploy(json.canDeploy);
                  if (json.canDeploy) {
                    toast.success(
                      t(
                        "testRunner.checksPassed",
                        "All checks passed! Ready to deploy.",
                      ),
                    );
                  } else {
                    toast.error(
                      t(
                        "testRunner.checksFailed",
                        "Some checks failed. Review before deploying.",
                      ),
                    );
                  }
                } else if (event === "error") {
                  toast.error(
                    json.message ||
                      t("testRunner.runFailed", "Failed to run tests"),
                  );
                }
              } catch (e) {
                // ignore JSON parse errors for incomplete chunks just in case
              }
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(
        error.message || t("testRunner.runFailed", "Failed to run tests"),
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <Box>
      <SEO title="Test Runner" description="Pre-deploy test runner" />

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            🧪 {t("testRunner.title", "Pre-Deploy Test Runner")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("testRunner.subtitle", "Run pre-flight checks before deploying")}
          </Typography>
        </Box>
        <Box>
          <Tooltip title="View History">
            <span>
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => {
                  setHistoryOpen(true);
                  fetchHistory();
                }}
                disabled={!projectId}
                size="small"
              >
                {t("testRunner.history", "History")}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent
          sx={{
            display: "flex",
            gap: 1.5,
            alignItems: "center",
            flexWrap: "wrap",
            p: 2,
            "&:last-child": { pb: 2 },
          }}
        >
          <TextField
            select
            size="small"
            label={t("testRunner.selectProject", "Select Project")}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            sx={{ width: 280 }}
          >
            {projects.map((p) => (
              <MenuItem key={p._id} value={p._id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={running ? undefined : <PlayArrowIcon />}
            onClick={runTests}
            disabled={!projectId || running}
            size="small"
          >
            {running
              ? t("testRunner.running", "Running...")
              : t("testRunner.runTests", "Run Tests")}
          </Button>

          {canDeploy !== null && (
            <Chip
              icon={
                canDeploy ? (
                  <RocketLaunchIcon sx={{ fontSize: "16px !important" }} />
                ) : (
                  <ErrorIcon sx={{ fontSize: "16px !important" }} />
                )
              }
              label={
                canDeploy
                  ? t("testRunner.readyToDeploy", "Ready to Deploy")
                  : t("testRunner.notReady", "Not Ready")
              }
              color={canDeploy ? "success" : "error"}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
        </CardContent>
        {running && <LinearProgress />}
      </Card>

      {/* Summary */}
      {summary && (
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          {[
            {
              label: t("testRunner.passed", "Passed"),
              value: summary.passed,
              color: "#22c55e",
            },
            {
              label: t("testRunner.failed", "Failed"),
              value: summary.failed,
              color: "#ef4444",
            },
            {
              label: t("testRunner.skipped", "Skipped"),
              value: summary.skipped,
              color: "#64748b",
            },
          ].map(({ label, value, color }) => (
            <Card key={label} sx={{ flex: 1, minWidth: 100 }}>
              <CardContent
                sx={{ p: 2, textAlign: "center", "&:last-child": { pb: 2 } }}
              >
                <Typography variant="h4" fontWeight={800} sx={{ color }}>
                  {value}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                >
                  {label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Results */}
      {results.length === 0 && !running ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <ScienceIcon
              sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
            />
            <Typography color="text.secondary">
              {t(
                "testRunner.selectAProjectAnd",
                "Select a Project and run tests",
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(
                "testRunner.checksDirectoryGitDisk",
                "Checks: directory, git, disk, node, package.json, ports, memory,               npm test",
              )}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {results.map((result, idx) => (
            <Card
              key={idx}
              sx={{
                borderLeft: `3px solid ${statusColors[result.status] || "#64748b"}`,
                transition: "all 0.2s",
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  {statusIcons[result.status]}
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{ minWidth: 140 }}
                  >
                    {result.name}
                  </Typography>
                  <Chip
                    label={result.status.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: `${statusColors[result.status] || "#64748b"}15`,
                      color: statusColors[result.status] || "#64748b",
                      fontWeight: 700,
                      fontSize: 10,
                      height: 20,
                    }}
                  />
                  {result.duration != null && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 10 }}
                    >
                      {result.duration}
                      {t("testRunner.ms", "ms")}
                    </Typography>
                  )}
                  <Box sx={{ flex: 1 }} />
                  {result.output && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: "text.secondary",
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {result.output.slice(0, 100)}
                    </Typography>
                  )}
                </Box>
                {result.error && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, display: "block", fontSize: 11 }}
                  >
                    ⚠️ {result.error}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* History Drawer */}
      <Drawer
        anchor="right"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 400 } } }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            {t("testRunner.runHistory", "Run History")}
          </Typography>
          <IconButton onClick={() => setHistoryOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ p: 2, overflow: "auto" }}>
          {historyLoading ? (
            <Box>
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={80}
                  sx={{ mb: 2 }}
                />
              ))}
            </Box>
          ) : history.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" mt={4}>
              {t(
                "testRunner.noHistoryFoundFor",
                "No history found for this project",
              )}
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {history.map((run) => (
                <Card
                  key={run._id}
                  variant="outlined"
                  sx={{
                    borderLeft: `3px solid ${
                      run.status === "success" ? "#22c55e" : "#ef4444"
                    }`,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => setSelectedRun(run)}
                >
                  <CardContent sx={{ p: "12px !important", pb: "12px" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {run.status === "success"
                            ? t("testRunner.success", "Success")
                            : t("testRunner.failed", "Failed")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(run.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${run.summary?.passed || 0}/${
                          run.summary?.total || 0
                        } ${t("testRunner.passedCount", "Passed")}`}
                        size="small"
                        color={run.status === "success" ? "success" : "error"}
                        sx={{ height: 20, fontSize: 10 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Selected Run Details Modal */}
      {selectedRun && (
        <Dialog
          open={!!selectedRun}
          onClose={() => setSelectedRun(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {t("testRunner.testRunDetails", "Test Run Details")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(selectedRun.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <IconButton onClick={() => setSelectedRun(null)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ p: 2, bgcolor: "background.default" }}>
            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              {["passed", "failed", "skipped"].map((lbl) => (
                <Card key={lbl} sx={{ flex: 1 }}>
                  <CardContent
                    sx={{
                      p: 1.5,
                      textAlign: "center",
                      "&:last-child": { pb: 1.5 },
                    }}
                  >
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      color={
                        lbl === "passed"
                          ? "#22c55e"
                          : lbl === "failed"
                            ? "#ef4444"
                            : "#64748b"
                      }
                    >
                      {selectedRun.summary[lbl]}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      {lbl.toUpperCase()}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {selectedRun.results?.map((res: any, idx: number) => (
                <Card
                  key={idx}
                  sx={{
                    borderLeft: `3px solid ${
                      statusColors[res.status] || "#64748b"
                    }`,
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      {statusIcons[res.status]}
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{ minWidth: 140 }}
                      >
                        {res.name}
                      </Typography>
                      <Chip
                        label={res.status.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: `${statusColors[res.status] || "#64748b"}15`,
                          color: statusColors[res.status] || "#64748b",
                          fontWeight: 700,
                          fontSize: 10,
                          height: 20,
                        }}
                      />
                      {res.duration != null && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 10 }}
                        >
                          {res.duration}
                          {t("testRunner.ms", "ms")}
                        </Typography>
                      )}
                    </Box>
                    {(res.output || res.error) && (
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 1.5,
                          bgcolor: isDark
                            ? "rgba(0,0,0,0.3)"
                            : "rgba(0,0,0,0.04)",
                          borderRadius: 1,
                        }}
                      >
                        {res.output && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11,
                              color: "text.secondary",
                              display: "block",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {res.output}
                          </Typography>
                        )}
                        {res.error && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ mt: 0.5, display: "block", fontSize: 11 }}
                          >
                            ⚠️ {res.error}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default TestRunner;
