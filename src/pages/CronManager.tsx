import React, { useEffect, useState } from "react";
import { useServer } from "../contexts/ServerContext";
import api from "../services/api";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Skeleton,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CodeIcon from "@mui/icons-material/Code";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface CronJob {
  id: string; // generated uuid
  min: string;
  hour: string;
  dom: string;
  mon: string;
  dow: string;
  command: string;
  comment?: string;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const PRESETS = {
  everyMinute: "* * * * *",
  hourly: "0 * * * *",
  daily: "0 0 * * *",
  weekly: "0 0 * * 0",
  monthly: "0 0 1 * *",
};

const CronManager: React.FC = () => {
  const { selectedServer } = useServer();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"visual" | "raw">("visual");

  // Raw content state
  const [cronContent, setCronContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");

  // Visual state
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [rawLines, setRawLines] = useState<string[]>([]); // Store comments/empty lines to preserve them partially

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [formData, setFormData] = useState<CronJob>({
    id: "",
    min: "*",
    hour: "*",
    dom: "*",
    mon: "*",
    dow: "*",
    command: "",
  });

  // Simplified Form State
  const [frequency, setFrequency] = useState("daily"); // everyMinute, hourly, daily, weekly, monthly, custom
  const [simpleTime, setSimpleTime] = useState("00:00");
  const [simpleDayOfWeek, setSimpleDayOfWeek] = useState("0"); // 0=Sun
  const [simpleDayOfMonth, setSimpleDayOfMonth] = useState("1");
  const [simpleMinute, setSimpleMinute] = useState("0");

  useEffect(() => {
    if (selectedServer) {
      fetchCronJobs();
    }
  }, [selectedServer]);

  const fetchCronJobs = async () => {
    if (!selectedServer) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/cron/${selectedServer._id}`);
      const content = data.jobs || "";
      setCronContent(content);
      setOriginalContent(content);
      parseContent(content);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("cron.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const parseContent = (content: string) => {
    const lines = content.split("\n");
    const parsedJobs: CronJob[] = [];
    const others: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        others.push(line);
        return;
      }

      // Simple regex for standard cron: min hour dom mon dow command
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 6) {
        parsedJobs.push({
          id: generateId(),
          min: parts[0],
          hour: parts[1],
          dom: parts[2],
          mon: parts[3],
          dow: parts[4],
          command: parts.slice(5).join(" "),
        });
      } else {
        others.push(line);
      }
    });

    setJobs(parsedJobs);
    setRawLines(others);
  };

  const stringifyJobs = (currentJobs: CronJob[]) => {
    // Reconstruct content.
    // Note: We append jobs at the end of rawLines (headers/comments),
    // or just join them. Preserving exact position of comments vs jobs is hard
    // without a more complex parser. simpler approach: existing comments + jobs.

    // Better strategy: Filter rawLines to keep top-level comments/env vars,
    // but maybe discard old job lines?
    // Actually, simple approach: Re-generate full content from jobs.
    // Use rawLines only for initial non-job lines (like MAILTO or intro comments).

    const jobLines = currentJobs.map(
      (j) => `${j.min} ${j.hour} ${j.dom} ${j.mon} ${j.dow} ${j.command}`,
    );

    // Basic preservation: Keep lines that start with VAR=VAL or # comments
    // but try to avoid duplicating old jobs if they were in rawLines?
    // Since we parsed everything invalid into rawLines, valid jobs are gone from there.
    // So simply joining valid rawLines + new jobLines is safe-ish.

    return [...rawLines, ...jobLines].join("\n").trim() + "\n";
  };

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: "visual" | "raw" | null,
  ) => {
    if (newMode !== null) {
      if (newMode === "raw") {
        // Sync visual -> raw
        const newContent = stringifyJobs(jobs);
        setCronContent(newContent);
      } else {
        // Sync raw -> visual
        parseContent(cronContent);
      }
      setMode(newMode);
    }
  };

  const saveCronJobs = async () => {
    if (!selectedServer) return;
    setLoading(true);

    const contentToSave = mode === "visual" ? stringifyJobs(jobs) : cronContent;

    try {
      await api.post(`/cron/${selectedServer._id}`, { jobs: contentToSave });
      setOriginalContent(contentToSave);
      setCronContent(contentToSave); // Update raw content
      if (mode === "visual") parseContent(contentToSave); // Refresh visual state cleanly

      toast.success(t("cron.saveSuccess"));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("cron.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  // --- Helper to describe cron in natural language ---
  const describeCron = (job: CronJob) => {
    const { min, hour, dom, mon, dow } = job;
    const expr = `${min} ${hour} ${dom} ${mon} ${dow}`;

    if (expr === "* * * * *") return t("cron.desc.everyMinute");
    if (
      min === "0" &&
      hour === "*" &&
      dom === "*" &&
      mon === "*" &&
      dow === "*"
    )
      return t("cron.desc.hourly", { min: "00" });
    if (hour === "*" && dom === "*" && mon === "*" && dow === "*")
      return t("cron.desc.hourly", { min: min.padStart(2, "0") });

    if (
      min !== "*" &&
      hour !== "*" &&
      dom === "*" &&
      mon === "*" &&
      dow === "*"
    ) {
      return t("cron.desc.daily", {
        time: `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`,
      });
    }

    if (
      min !== "*" &&
      hour !== "*" &&
      dom === "*" &&
      mon === "*" &&
      dow !== "*"
    ) {
      const days = [
        t("common.sun"),
        t("common.mon"),
        t("common.tue"),
        t("common.wed"),
        t("common.thu"),
        t("common.fri"),
        t("common.sat"),
        t("common.sun"),
      ];
      const dayName = days[parseInt(dow)] || dow;
      return t("cron.desc.weekly", {
        day: dayName,
        time: `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`,
      });
    }

    if (
      min !== "*" &&
      hour !== "*" &&
      dom !== "*" &&
      mon === "*" &&
      dow === "*"
    ) {
      return t("cron.desc.monthly", {
        day: dom,
        time: `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`,
      });
    }

    return t("cron.desc.custom", { expression: expr });
  };

  // --- Form Logic ---

  const handleOpenDialog = (job?: CronJob) => {
    if (job) {
      setEditingJob(job);
      setFormData({ ...job });
      detectFrequency(job);
    } else {
      setEditingJob(null);
      setFormData({
        id: generateId(),
        min: "0",
        hour: "0",
        dom: "*",
        mon: "*",
        dow: "*",
        command: "",
      });
      setFrequency("daily");
      setSimpleTime("00:00");
      setSimpleDayOfWeek("1"); // Monday
      setSimpleDayOfMonth("1");
      setSimpleMinute("0");
    }
    setDialogOpen(true);
  };

  const detectFrequency = (job: CronJob) => {
    const { min, hour, dom, mon, dow } = job;
    if (
      min === "*" &&
      hour === "*" &&
      dom === "*" &&
      mon === "*" &&
      dow === "*"
    ) {
      setFrequency("everyMinute");
    } else if (hour === "*" && dom === "*" && mon === "*" && dow === "*") {
      setFrequency("hourly");
      setSimpleMinute(min === "*" ? "0" : min);
    } else if (dom === "*" && mon === "*" && dow === "*") {
      setFrequency("daily");
      setSimpleTime(`${hour.padStart(2, "0")}:${min.padStart(2, "0")}`);
    } else if (dom === "*" && mon === "*" && dow !== "*") {
      setFrequency("weekly");
      setSimpleTime(`${hour.padStart(2, "0")}:${min.padStart(2, "0")}`);
      setSimpleDayOfWeek(dow);
    } else if (dom !== "*" && mon === "*" && dow === "*") {
      setFrequency("monthly");
      setSimpleTime(`${hour.padStart(2, "0")}:${min.padStart(2, "0")}`);
      setSimpleDayOfMonth(dom);
    } else {
      setFrequency("custom");
    }
  };

  const updateFormDataFromSimple = (newFreq: string) => {
    const newData = { ...formData };
    switch (newFreq) {
      case "everyMinute":
        newData.min = "*";
        newData.hour = "*";
        newData.dom = "*";
        newData.mon = "*";
        newData.dow = "*";
        break;
      case "hourly":
        newData.min = simpleMinute;
        newData.hour = "*";
        newData.dom = "*";
        newData.mon = "*";
        newData.dow = "*";
        break;
      case "daily":
        const [dh, dm] = simpleTime.split(":");
        newData.min = parseInt(dm).toString();
        newData.hour = parseInt(dh).toString();
        newData.dom = "*";
        newData.mon = "*";
        newData.dow = "*";
        break;
      case "weekly":
        const [wh, wm] = simpleTime.split(":");
        newData.min = parseInt(wm).toString();
        newData.hour = parseInt(wh).toString();
        newData.dom = "*";
        newData.mon = "*";
        newData.dow = simpleDayOfWeek;
        break;
      case "monthly":
        const [mh, mm] = simpleTime.split(":");
        newData.min = parseInt(mm).toString();
        newData.hour = parseInt(mh).toString();
        newData.dom = simpleDayOfMonth;
        newData.mon = "*";
        newData.dow = "*";
        break;
      case "custom":
        // When switching to custom, keep current formData as is.
        break;
    }
    setFormData(newData);
    setFrequency(newFreq);
  };

  const handleSimpleChange = (field: string, value: string) => {
    if (field === "time") setSimpleTime(value);
    if (field === "dayOfWeek") setSimpleDayOfWeek(value);
    if (field === "dayOfMonth") setSimpleDayOfMonth(value);
    if (field === "minute") setSimpleMinute(value);

    // Defer updating formData until frequency logic runs or run immediately?
    // Need complex logic to sync state.
    // Better approach: Re-run updateFormDataFromSimple with current frequency but new values
    // Wait, updateFormDataFromSimple uses state values which might be stale if we just set them.
    // So let's pass explicit values.

    const effectiveTime = field === "time" ? value : simpleTime;
    const effectiveDow = field === "dayOfWeek" ? value : simpleDayOfWeek;
    const effectiveDom = field === "dayOfMonth" ? value : simpleDayOfMonth;
    const effectiveMin = field === "minute" ? value : simpleMinute;

    const newData = { ...formData };
    switch (frequency) {
      case "hourly":
        newData.min = effectiveMin;
        break;
      case "daily":
        const [dh, dm] = effectiveTime.split(":");
        newData.min = parseInt(dm).toString();
        newData.hour = parseInt(dh).toString();
        break;
      case "weekly":
        const [wh, wm] = effectiveTime.split(":");
        newData.min = parseInt(wm).toString();
        newData.hour = parseInt(wh).toString();
        newData.dow = effectiveDow;
        break;
      case "monthly":
        const [mh, mm] = effectiveTime.split(":");
        newData.min = parseInt(mm).toString();
        newData.hour = parseInt(mh).toString();
        newData.dom = effectiveDom;
        break;
    }
    setFormData(newData);
  };

  const handleSaveJob = () => {
    if (editingJob) {
      setJobs(jobs.map((j) => (j.id === editingJob.id ? formData : j)));
    } else {
      setJobs([...jobs, formData]);
    }
    setDialogOpen(false);
  };

  const handleDeleteJob = (id: string) => {
    if (window.confirm("Delete this cron job?")) {
      setJobs(jobs.filter((j) => j.id !== id));
    }
  };

  const hasChanges =
    mode === "visual"
      ? stringifyJobs(jobs) !== originalContent
      : cronContent !== originalContent;

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
          gap: { xs: 2, sm: 2 },
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
          <AccessTimeIcon sx={{ color: "primary.main", fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {t("cron.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("cron.subtitle", { server: selectedServer.name })}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            ml: { sm: "auto" },
            width: { xs: "100%", sm: "auto" },
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            size="small"
            sx={{ flex: { xs: 1, sm: "none" } }}
          >
            <ToggleButton value="visual" sx={{ flex: 1 }}>
              <ListAltIcon sx={{ mr: 1, fontSize: 18 }} />
              {t("cron.visualMode")}
            </ToggleButton>
            <ToggleButton value="raw" sx={{ flex: 1 }}>
              <CodeIcon sx={{ mr: 1, fontSize: 18 }} />
              {t("cron.rawMode")}
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchCronJobs}
            disabled={loading}
            variant="outlined"
            size="small"
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {t("common.refresh")}
          </Button>
        </Box>
      </Box>

      {/* VISUAL MODE */}
      {mode === "visual" && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid",
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                bgcolor: "background.paper",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
              }}
            >
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                fullWidth={false}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {t("cron.addJob")}
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveCronJobs}
                disabled={loading || !hasChanges}
                color={hasChanges ? "primary" : "inherit"}
                fullWidth={false}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {loading ? t("common.saving") : t("common.save")}
              </Button>
            </Box>

            {loading && jobs.length === 0 ? (
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
            ) : jobs.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  {t("common.noData")}
                </Typography>
              </Box>
            ) : (
              <>
                {/* Desktop Table View */}
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{ display: { xs: "none", md: "block" } }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("cron.schedule")}</TableCell>
                        <TableCell>{t("cron.command")}</TableCell>
                        <TableCell width={100}>{t("common.actions")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <Box
                              sx={{ display: "flex", flexDirection: "column" }}
                            >
                              <Typography variant="body2" fontWeight={600}>
                                {describeCron(job)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontFamily: "monospace" }}
                              >
                                {`${job.min} ${job.hour} ${job.dom} ${job.mon} ${job.dow}`}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: "monospace", fontSize: 13 }}
                            >
                              {job.command}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex" }}>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(job)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteJob(job.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
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
                    gap: 1,
                    p: 2,
                  }}
                >
                  {jobs.map((job) => (
                    <Card
                      key={job.id}
                      variant="outlined"
                      sx={{ bgcolor: "background.default" }}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
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
                              {describeCron(job)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFamily: "monospace" }}
                            >
                              {`${job.min} ${job.hour} ${job.dom} ${job.mon} ${job.dow}`}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(job)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            bgcolor: "action.hover",
                            p: 1,
                            borderRadius: 1,
                            wordBreak: "break-all",
                          }}
                        >
                          {job.command}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* RAW MODE */}
      {mode === "raw" && (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box
              sx={{
                p: 2,
                borderBottom: "1px solid",
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                bgcolor: "background.paper",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                Raw Crontab
                <Tooltip title="Directly edit the crontab file. Be careful with syntax!">
                  <HelpOutlineIcon fontSize="small" color="action" />
                </Tooltip>
              </Typography>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveCronJobs}
                disabled={loading || !hasChanges}
              >
                {loading ? t("common.saving") : t("common.save")}
              </Button>
            </Box>
            <TextField
              fullWidth
              multiline
              minRows={15}
              value={cronContent}
              onChange={(e) => setCronContent(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14,
                  lineHeight: 1.5,
                  bgcolor: "#1e1e1e",
                  color: "#d4d4d4",
                  borderRadius: 0,
                },
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingJob ? t("cron.editJob") : t("cron.addJob")}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              fullWidth
              label={t("cron.command")}
              value={formData.command}
              onChange={(e) =>
                setFormData({ ...formData, command: e.target.value })
              }
              placeholder="/usr/bin/php /var/www/script.php >> /logs/cron.log"
              InputProps={{ sx: { fontFamily: "monospace" } }}
            />

            <Box>
              <FormLabel>{t("cron.form.frequency")}</FormLabel>
              <RadioGroup
                row
                value={frequency}
                onChange={(e) => updateFormDataFromSimple(e.target.value)}
              >
                <FormControlLabel
                  value="everyMinute"
                  control={<Radio />}
                  label={t("cron.presets.everyMinute")}
                />
                <FormControlLabel
                  value="hourly"
                  control={<Radio />}
                  label={t("cron.presets.hourly")}
                />
                <FormControlLabel
                  value="daily"
                  control={<Radio />}
                  label={t("cron.presets.daily")}
                />
                <FormControlLabel
                  value="weekly"
                  control={<Radio />}
                  label={t("cron.presets.weekly")}
                />
                <FormControlLabel
                  value="monthly"
                  control={<Radio />}
                  label={t("cron.presets.monthly")}
                />
                <FormControlLabel
                  value="custom"
                  control={<Radio />}
                  label={t("cron.presets.custom")}
                />
              </RadioGroup>

              {/* Conditional Inputs */}
              <Box
                sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 1 }}
              >
                {frequency === "everyMinute" && (
                  <Typography color="text.secondary">
                    {t("cron.desc.everyMinute")}
                  </Typography>
                )}

                {frequency === "hourly" && (
                  <TextField
                    type="number"
                    label={t("cron.form.minutes")}
                    value={simpleMinute}
                    onChange={(e) =>
                      handleSimpleChange("minute", e.target.value)
                    }
                    size="small"
                    inputProps={{ min: 0, max: 59 }}
                  />
                )}

                {(frequency === "daily" ||
                  frequency === "weekly" ||
                  frequency === "monthly") && (
                  <TextField
                    type="time"
                    label={t("cron.form.atTime")}
                    value={simpleTime}
                    onChange={(e) => handleSimpleChange("time", e.target.value)}
                    size="small"
                    sx={{ mr: 2 }}
                    InputLabelProps={{ shrink: true }}
                  />
                )}

                {frequency === "weekly" && (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>{t("cron.form.onDay")}</InputLabel>
                    <Select
                      value={simpleDayOfWeek}
                      label={t("cron.form.onDay")}
                      onChange={(e) =>
                        handleSimpleChange("dayOfWeek", e.target.value)
                      }
                    >
                      <MenuItem value="1">{t("common.mon")}</MenuItem>
                      <MenuItem value="2">{t("common.tue")}</MenuItem>
                      <MenuItem value="3">{t("common.wed")}</MenuItem>
                      <MenuItem value="4">{t("common.thu")}</MenuItem>
                      <MenuItem value="5">{t("common.fri")}</MenuItem>
                      <MenuItem value="6">{t("common.sat")}</MenuItem>
                      <MenuItem value="0">{t("common.sun")}</MenuItem>
                    </Select>
                  </FormControl>
                )}

                {frequency === "monthly" && (
                  <TextField
                    type="number"
                    label={t("cron.form.onDay")}
                    value={simpleDayOfMonth}
                    onChange={(e) =>
                      handleSimpleChange("dayOfMonth", e.target.value)
                    }
                    size="small"
                    inputProps={{ min: 1, max: 31 }}
                  />
                )}

                {frequency === "custom" && (
                  <Grid container spacing={2}>
                    {["min", "hour", "dom", "mon", "dow"].map((field) => (
                      <Grid item xs={2.4} key={field}>
                        <TextField
                          label={t(
                            `cron.fields.${field === "dom" ? "dayOfMonth" : field === "dow" ? "dayOfWeek" : field === "mon" ? "month" : field === "min" ? "minute" : "hour"}`,
                          )}
                          value={formData[field as keyof CronJob] as string}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [field]: e.target.value,
                            })
                          }
                          size="small"
                          fullWidth
                          inputProps={{ style: { textAlign: "center" } }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSaveJob}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CronManager;
