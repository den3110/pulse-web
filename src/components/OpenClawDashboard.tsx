import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Button,
  Chip,
  Alert,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  InputAdornment,
  IconButton,
  Autocomplete,
  Drawer,
  Radio,
  RadioGroup,
  FormControlLabel,
  Pagination,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  SmartToy as RobotIcon,
  Code as CodeIcon,
  Lightbulb as ThoughtIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Visibility,
  VisibilityOff,
  Save as SaveIcon,
  SettingsSuggest as SettingsSuggestIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import api from "../services/api";

interface OpenClawDashboardProps {
  serverId: string;
  appId: string;
  refreshTrigger?: number;
}

interface ActionLog {
  timestamp: string;
  content: string;
  type: "tool" | "thought" | "action" | "error" | "info";
}

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview", "o1-mini"],
  anthropic: [
    "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-latest",
    "claude-3-opus-20240229",
  ],
  google: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-exp"],
  ollama: ["llama3.1", "llama3.2", "mistral", "qwen2.5", "phi3"],
};

export const OpenClawDashboard: React.FC<OpenClawDashboardProps> = ({
  serverId,
  appId,
  refreshTrigger = 0,
}) => {
  const [loading, setLoading] = useState(true);
  const [configStr, setConfigStr] = useState("");
  const [configObj, setConfigObj] = useState<any>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // LLM Config State
  const [llmProvider, setLlmProvider] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [braveApiKey, setBraveApiKey] = useState("");

  // Channels Config State
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramDmPolicy, setTelegramDmPolicy] = useState("pairing");
  const [telegramAllowFrom, setTelegramAllowFrom] = useState("");

  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [discordToken, setDiscordToken] = useState("");
  const [discordDmPolicy, setDiscordDmPolicy] = useState("pairing");
  const [discordAllowFrom, setDiscordAllowFrom] = useState("");

  // Drawer & Pairing State
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<
    "telegram" | "discord" | null
  >(null);
  const [pairingCode, setPairingCode] = useState("");
  const [submittingPairing, setSubmittingPairing] = useState(false);

  const [logsLoading, setLogsLoading] = useState(true);
  const [recentActions, setRecentActions] = useState<ActionLog[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityFilter, setActivityFilter] = useState("all");

  // Dynamic Models State
  const [dynamicModels, setDynamicModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Container Logs State
  const [containerLogs, setContainerLogs] = useState("");
  const [containerLogsLoading, setContainerLogsLoading] = useState(false);
  const [logsPaused, setLogsPaused] = useState(false);
  const [logLines, setLogLines] = useState(200);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/servers/${serverId}/one-click/${appId}/config`,
      );
      const content = res.data.content;
      setConfigStr(content);

      try {
        const parsed = (content ? JSON.parse(content) : {}) as any;
        setConfigObj(parsed);

        if (parsed?.agents?.defaults?.model) {
          const modelRef = parsed.agents.defaults.model;
          const primary =
            typeof modelRef === "string" ? modelRef : modelRef?.primary || "";
          if (primary && primary.includes("/")) {
            const [prov, ...rest] = primary.split("/");
            setLlmProvider(prov);
            setLlmModel(primary);
          } else if (primary) {
            setLlmModel(primary);
          }
          // Try to read API key from env block first (correct format)
          if (parsed?.env) {
            const envVarMap: Record<string, string> = {
              openai: "OPENAI_API_KEY",
              anthropic: "ANTHROPIC_API_KEY",
              google: "GOOGLE_API_KEY",
              openrouter: "OPENROUTER_API_KEY",
            };
            const prov = primary.split("/")[0];
            const envVar = envVarMap[prov] || `${prov.toUpperCase()}_API_KEY`;
            if (parsed.env[envVar]) {
              setLlmApiKey(parsed.env[envVar]);
            }
            // Load Brave Search API key
            if (parsed.env.BRAVE_API_KEY) {
              setBraveApiKey(parsed.env.BRAVE_API_KEY);
            }
          }
          // Legacy fallback: models.providers
          if (!llmApiKey && parsed?.models?.providers) {
            for (const [provName, provConf] of Object.entries(
              parsed.models.providers,
            )) {
              if ((provConf as any)?.apiKey) {
                setLlmApiKey((provConf as any).apiKey);
                break;
              }
            }
          }
        } else if (parsed?.llm) {
          // Legacy fallback for old config format
          setLlmProvider(parsed.llm.provider || "openai");
          setLlmModel(parsed.llm.model || "");
          if (parsed.llm.apiKey) setLlmApiKey(parsed.llm.apiKey);
        }

        // Load system prompt from AGENTS.md file
        try {
          const agentsMdRes = await api.get(
            `/servers/${serverId}/one-click/openclaw/agents-md`,
          );
          if (agentsMdRes.data?.content) {
            setSystemPrompt(agentsMdRes.data.content);
          }
        } catch {}

        if (parsed?.channels) {
          if (parsed.channels.telegram) {
            setTelegramEnabled(parsed.channels.telegram.enabled === true);
            setTelegramToken(
              parsed.channels.telegram.botToken ||
                parsed.channels.telegram.token ||
                parsed.channels.telegram.bot_token ||
                "",
            );
            setTelegramDmPolicy(parsed.channels.telegram.dmPolicy || "pairing");
            setTelegramAllowFrom(
              VectorToStr(parsed.channels.telegram.allowFrom),
            );
          }
          if (parsed.channels.discord) {
            setDiscordEnabled(parsed.channels.discord.enabled === true);
            setDiscordToken(
              parsed.channels.discord.botToken ||
                parsed.channels.discord.token ||
                parsed.channels.discord.bot_token ||
                "",
            );
            setDiscordDmPolicy(parsed.channels.discord.dmPolicy || "pairing");
            setDiscordAllowFrom(VectorToStr(parsed.channels.discord.allowFrom));
          }
        }
      } catch (parseError) {
        console.error("Failed to parse config:", parseError);
        setConfigObj({});
      }
    } catch (err) {
      console.error("Failed to load config:", err);
      toast.error("Failed to load OpenClaw configuration");
    } finally {
      setLoading(false);
    }
  };

  const VectorToStr = (val: any) => {
    if (Array.isArray(val)) return val.join(", ");
    return "";
  };

  const strToVector = (val: string) => {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const loadLogs = async (isBackground = false) => {
    try {
      if (!isBackground) setLogsLoading(true);
      // Trigger parsing + DB save in background
      api
        .get(`/servers/${serverId}/one-click/openclaw/parsed-logs`)
        .catch(() => {});
      // Fetch paginated stored logs from DB
      const res = await api.get(
        `/servers/${serverId}/one-click/openclaw/stored-logs?page=${activityPage}&limit=20&type=${activityFilter}`,
      );
      setRecentActions(
        (res.data.logs || []).map((l: any) => ({
          timestamp: l.timestamp,
          content: l.content,
          type: l.type,
        })),
      );
      if (res.data.pagination) {
        setActivityTotalPages(res.data.pagination.totalPages);
        setActivityTotal(res.data.pagination.total);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      if (!isBackground) setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (serverId && appId === "openclaw") {
      loadConfig();
      loadLogs();
      const logsInterval = setInterval(() => loadLogs(true), 30000);
      return () => clearInterval(logsInterval);
    }
  }, [serverId, appId, refreshTrigger, activityPage, activityFilter]);

  // Container log polling
  const loadContainerLogs = async () => {
    try {
      setContainerLogsLoading(true);
      const res = await api.get(
        `/servers/${serverId}/one-click/openclaw/logs?lines=${logLines}`,
      );
      setContainerLogs(res.data.logs || "");
    } catch (err) {
      console.error("Failed to load container logs:", err);
    } finally {
      setContainerLogsLoading(false);
    }
  };

  useEffect(() => {
    if (serverId && appId === "openclaw") {
      loadContainerLogs();
      if (!logsPaused) {
        const interval = setInterval(loadContainerLogs, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [serverId, appId, logsPaused, logLines]);

  const fetchModels = async () => {
    if (!llmProvider) return;

    // Some providers require apiKey, except Ollama which uses serverId
    if (llmProvider !== "ollama" && !llmApiKey && !configObj?.llm?.apiKey) {
      toast.error(
        `Please enter an API Key for ${llmProvider} to fetch models.`,
      );
      return;
    }

    setFetchingModels(true);
    try {
      const activeKey = llmApiKey || configObj?.llm?.apiKey;
      const res = await api.get(
        `/servers/${serverId}/one-click/openclaw/models?provider=${llmProvider}&apiKey=${encodeURIComponent(activeKey || "")}`,
      );
      if (res.data.models && res.data.models.length > 0) {
        setDynamicModels(res.data.models);
        toast.success(
          `Fetched ${res.data.models.length} models for ${llmProvider}`,
        );
      } else {
        toast.error(`No models found for ${llmProvider}`);
      }
    } catch (err: any) {
      console.error("Failed to fetch dynamic models:", err);
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to fetch models",
      );
    } finally {
      setFetchingModels(false);
    }
  };

  const toggleSkill = async (skillName: string, active: boolean) => {
    if (!configObj) return;

    setSavingConfig(true);
    try {
      // Create deep copy
      const newConfig = JSON.parse(JSON.stringify(configObj));

      // Ensure skills.entries object exists
      if (!newConfig.skills) {
        newConfig.skills = {};
      }
      if (!newConfig.skills.entries) {
        newConfig.skills.entries = {};
      }

      if (!newConfig.skills.entries[skillName]) {
        newConfig.skills.entries[skillName] = {};
      }
      newConfig.skills.entries[skillName].enabled = active;

      const newJsonStr = JSON.stringify(newConfig, null, 2);

      await api.post(`/servers/${serverId}/one-click/openclaw/config`, {
        content: newJsonStr,
      });

      setConfigObj(newConfig);
      setConfigStr(newJsonStr);
      toast.success(
        `${skillName} turned ${active ? "on" : "off"}. Container restarting...`,
      );

      // Reload logs after a delay since container restarts
      setTimeout(loadLogs, 3000);
    } catch (err: any) {
      console.error("Save config error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update skill configuration",
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const saveLlmConfig = async () => {
    setSavingConfig(true);
    try {
      const newConfig = configObj ? JSON.parse(JSON.stringify(configObj)) : {};

      // Remove legacy llm.* keys if they exist (invalid in OpenClaw)
      delete newConfig.llm;

      // Set model using OpenClaw's agents.defaults.model format
      if (!newConfig.agents) newConfig.agents = {};
      if (!newConfig.agents.defaults) newConfig.agents.defaults = {};

      // Model primary = "provider/model" format
      const modelPrimary = llmModel.includes("/")
        ? llmModel
        : `${llmProvider}/${llmModel}`;
      newConfig.agents.defaults.model = { primary: modelPrimary };

      // Save system prompt as AGENTS.md file (not in openclaw.json)
      // Remove any invalid systemPrompt key from previous saves
      delete newConfig.agents?.defaults?.systemPrompt;

      // Set API key using env block (built-in providers use standard env var names)
      if (llmApiKey) {
        if (!newConfig.env) newConfig.env = {};
        const envVarMap: Record<string, string> = {
          openai: "OPENAI_API_KEY",
          anthropic: "ANTHROPIC_API_KEY",
          google: "GOOGLE_API_KEY",
          openrouter: "OPENROUTER_API_KEY",
        };
        const envVar =
          envVarMap[llmProvider] || `${llmProvider.toUpperCase()}_API_KEY`;
        newConfig.env[envVar] = llmApiKey;
      }

      // Save Brave Search API key
      if (braveApiKey.trim()) {
        if (!newConfig.env) newConfig.env = {};
        newConfig.env.BRAVE_API_KEY = braveApiKey.trim();
      }

      // Clean up any invalid models.providers entries from previous saves
      if (newConfig.models?.providers) {
        delete newConfig.models.providers;
        if (Object.keys(newConfig.models).length === 0) {
          delete newConfig.models;
        }
      }

      const newJsonStr = JSON.stringify(newConfig, null, 2);

      await api.post(`/servers/${serverId}/one-click/openclaw/config`, {
        content: newJsonStr,
      });

      // Save system prompt as AGENTS.md
      if (systemPrompt.trim()) {
        await api.post(`/servers/${serverId}/one-click/openclaw/agents-md`, {
          content: systemPrompt.trim(),
        });
      }

      setConfigObj(newConfig);
      setConfigStr(newJsonStr);
      toast.success("LLM Configuration saved. Container restarting...");

      setTimeout(loadLogs, 3000);
    } catch (err: any) {
      console.error("Save config error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update LLM configuration",
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const saveChannelsConfig = async () => {
    setSavingConfig(true);
    try {
      const newConfig = configObj ? JSON.parse(JSON.stringify(configObj)) : {};
      if (!newConfig.channels) newConfig.channels = {};

      if (telegramToken || telegramEnabled) {
        newConfig.channels.telegram = {
          enabled: telegramEnabled,
          botToken: telegramToken,
          dmPolicy: telegramDmPolicy,
        };
        if (telegramDmPolicy === "allowlist") {
          newConfig.channels.telegram.allowFrom =
            strToVector(telegramAllowFrom);
        }
      } else {
        delete newConfig.channels.telegram;
      }

      if (discordToken || discordEnabled) {
        newConfig.channels.discord = {
          enabled: discordEnabled,
          botToken: discordToken,
          dmPolicy: discordDmPolicy,
        };
        if (discordDmPolicy === "allowlist") {
          newConfig.channels.discord.allowFrom = strToVector(discordAllowFrom);
        }
      } else {
        delete newConfig.channels.discord;
      }

      const newJsonStr = JSON.stringify(newConfig, null, 2);

      await api.post(`/servers/${serverId}/one-click/openclaw/config`, {
        content: newJsonStr,
      });

      setConfigObj(newConfig);
      setConfigStr(newJsonStr);
      toast.success("Chat Platforms saved. Container restarting...");

      setTimeout(loadLogs, 3000);
    } catch (err: any) {
      console.error("Save channels error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update chat platforms",
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const approvePairingCode = async (platform: "telegram" | "discord") => {
    if (!pairingCode) {
      toast.error("Please enter a pairing code");
      return;
    }

    setSubmittingPairing(true);
    try {
      const res = await api.post(
        `/servers/${serverId}/one-click/openclaw/pairing`,
        {
          platform,
          code: pairingCode,
        },
      );
      toast.success(res.data.message || "Pairing code approved!");
      setPairingCode("");
      // Close drawer after success
      setSettingsDrawerOpen(false);
    } catch (err: any) {
      console.error("Pairing approval failed:", err);
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.details ||
          "Failed to approve pairing code",
      );
    } finally {
      setSubmittingPairing(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "tool":
        return <CodeIcon fontSize="small" color="primary" />;
      case "thought":
        return <ThoughtIcon fontSize="small" color="warning" />;
      case "error":
        return <ErrorIcon fontSize="small" color="error" />;
      case "action":
        return <RobotIcon fontSize="small" color="secondary" />;
      default:
        return <InfoIcon fontSize="small" color="info" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "tool":
        return "primary.main";
      case "thought":
        return "warning.main";
      case "error":
        return "error.main";
      case "action":
        return "secondary.main";
      default:
        return "text.secondary";
    }
  };

  if (loading && !configStr) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Common OpenClaw skills based on documentation patterns
  const knownSkills = [
    {
      id: "shell",
      name: "Execute Shell Commands",
      desc: "Allows agent to run bash commands",
    },
    {
      id: "browser",
      name: "Web Browser Automation",
      desc: "Allows agent to open sites and scrape data",
    },
    {
      id: "fs",
      name: "File System Operations",
      desc: "Read and write to local files",
    },
    { id: "email", name: "Email Integration", desc: "Read and send emails" },
  ];

  const activeModel = (() => {
    const modelRef = configObj?.agents?.defaults?.model;
    if (modelRef) {
      return typeof modelRef === "string"
        ? modelRef
        : modelRef?.primary || "Unknown Model";
    }
    return configObj?.llm?.provider || "Unknown Model";
  })();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Top row: Status and Global Controls */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {/* Agent Info Card */}
        <Paper sx={{ p: 3, flex: "1 1 300px", borderRadius: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: "primary.main",
                color: "white",
                display: "flex",
              }}
            >
              <RobotIcon />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, lineHeight: 1.2 }}
              >
                OpenClaw Agent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Autonomous Mode
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Active LLM:
            </Typography>
            <Chip
              label={activeModel}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              Memory Enabled:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {configObj?.memory?.enabled !== false ? "Yes" : "No"}
            </Typography>
          </Box>
        </Paper>

        {/* LLM Configuration */}
        <Paper sx={{ p: 3, flex: "2 1 400px", borderRadius: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <SettingsIcon color="action" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Model Configuration
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Set the API Key and Model for the OpenClaw Agent to use.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <FormControl size="small" sx={{ width: 180 }}>
              <InputLabel>Provider</InputLabel>
              <Select
                value={llmProvider}
                label="Provider"
                onChange={(e) => {
                  const newProvider = e.target.value;
                  setLlmProvider(newProvider);
                  setDynamicModels([]); // Reset dynamic models on provider change
                  setLlmModel(""); // Reset model selection too
                }}
              >
                <MenuItem value="" disabled>
                  Select Provider
                </MenuItem>
                <MenuItem value="openai">OpenAI</MenuItem>
                <MenuItem value="anthropic">Anthropic</MenuItem>
                <MenuItem value="google">Google</MenuItem>
                <MenuItem value="ollama">Ollama (Local)</MenuItem>
              </Select>
            </FormControl>

            {llmProvider && llmProvider !== "ollama" && (
              <TextField
                size="small"
                label="API Key"
                type={showApiKey ? "text" : "password"}
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                fullWidth
                placeholder={
                  configObj?.llm?.apiKey ? "••••••••••••••••" : "Enter API Key"
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          </Box>

          <Box
            sx={{ display: "flex", gap: 2, mb: 3, alignItems: "flex-start" }}
          >
            {llmProvider &&
              (llmApiKey ||
                configObj?.llm?.apiKey ||
                llmProvider === "ollama") && (
                <Button
                  variant="outlined"
                  onClick={fetchModels}
                  disabled={fetchingModels}
                  startIcon={
                    fetchingModels ? (
                      <CircularProgress size={20} />
                    ) : (
                      <RefreshIcon />
                    )
                  }
                  sx={{ whiteSpace: "nowrap", height: "40px" }}
                >
                  Load Models
                </Button>
              )}

            {dynamicModels.length > 0 && (
              <FormControl size="small" sx={{ flexGrow: 1 }}>
                <InputLabel>Model Name</InputLabel>
                <Select
                  value={llmModel}
                  label="Model Name"
                  onChange={(e) => setLlmModel(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    Select Model
                  </MenuItem>
                  {dynamicModels.map((modelName) => (
                    <MenuItem key={modelName} value={modelName}>
                      {modelName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* System Prompt */}
          <TextField
            label="System Prompt (Behavioral Instructions)"
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="E.g. Bạn là trợ lý AI thông minh. Trả lời bằng tiếng Việt, thân thiện và ngắn gọn."
            sx={{ mb: 2 }}
          />

          {/* Brave Search API Key */}
          <Box
            sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 2 }}
          >
            <TextField
              label="Brave Search API Key (Optional)"
              size="small"
              fullWidth
              value={braveApiKey}
              onChange={(e) => setBraveApiKey(e.target.value)}
              placeholder="BSA..."
              type={showApiKey ? "text" : "password"}
              helperText="Optional (paid plans from $5/mo). Bot can also search via browser automation."
            />
            <Button
              variant="outlined"
              size="small"
              sx={{ whiteSpace: "nowrap", mt: "4px", minWidth: "auto" }}
              onClick={() =>
                window.open("https://api.search.brave.com/register", "_blank")
              }
            >
              Get Key
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Current Target Model:{" "}
              <Typography component="span" fontWeight="bold">
                {llmModel || activeModel || "None"}
              </Typography>
            </Typography>
            <Button
              variant="contained"
              onClick={saveLlmConfig}
              disabled={
                savingConfig ||
                !llmModel ||
                (llmProvider !== "ollama" &&
                  !llmApiKey &&
                  !configObj?.llm?.apiKey)
              }
              startIcon={<SaveIcon />}
              sx={{ whiteSpace: "nowrap" }}
            >
              Save Configuration
            </Button>
          </Box>
        </Paper>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flex: "1 1 300px",
          }}
        >
          {/* Skills Management */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <SettingsIcon color="action" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Skills Array
              </Typography>
            </Box>
            {configObj ? (
              <List disablePadding>
                {knownSkills.map((skill) => {
                  const isActive =
                    configObj?.skills?.entries?.[skill.id]?.enabled === true ||
                    configObj?.skills?.[skill.id] === true ||
                    configObj?.skills?.[skill.id] === "true";
                  return (
                    <ListItem key={skill.id} disableGutters sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={skill.name}
                        secondary={skill.desc}
                        primaryTypographyProps={{
                          variant: "body2",
                          fontWeight: 500,
                        }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          edge="end"
                          size="small"
                          checked={isActive}
                          onChange={(e) =>
                            toggleSkill(skill.id, e.target.checked)
                          }
                          disabled={savingConfig}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Config file could not be parsed. Skills management disabled.
              </Alert>
            )}
          </Paper>

          {/* Chat Platforms */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <SettingsIcon color="action" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Chat Platforms
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Map bot tokens for OpenClaw to reply in channels.
            </Typography>

            <List disablePadding>
              {/* Telegram */}
              <ListItem
                disableGutters
                sx={{
                  py: 1,
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      Telegram
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setActivePlatform("telegram");
                        setSettingsDrawerOpen(true);
                      }}
                      disabled={savingConfig}
                    >
                      <SettingsSuggestIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Switch
                    size="small"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    disabled={savingConfig}
                  />
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Bot Token (e.g. 1234:ABC...)"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  type="password"
                  disabled={!telegramEnabled || savingConfig}
                />
              </ListItem>

              <Divider sx={{ my: 1 }} />

              {/* Discord */}
              <ListItem
                disableGutters
                sx={{
                  py: 1,
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" fontWeight={500}>
                      Discord
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setActivePlatform("discord");
                        setSettingsDrawerOpen(true);
                      }}
                      disabled={savingConfig}
                    >
                      <SettingsSuggestIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Switch
                    size="small"
                    checked={discordEnabled}
                    onChange={(e) => setDiscordEnabled(e.target.checked)}
                    disabled={savingConfig}
                  />
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Bot Token"
                  value={discordToken}
                  onChange={(e) => setDiscordToken(e.target.value)}
                  type="password"
                  disabled={!discordEnabled || savingConfig}
                />
              </ListItem>
            </List>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                onClick={saveChannelsConfig}
                disabled={
                  savingConfig ||
                  (!telegramToken &&
                    !discordToken &&
                    !telegramEnabled &&
                    !discordEnabled)
                }
                startIcon={<SaveIcon />}
                size="small"
              >
                Save
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Bottom row: Timeline */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TimelineIcon color="action" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recent Activity
            </Typography>
            {activityTotal > 0 && (
              <Typography variant="caption" color="text.secondary">
                ({activityTotal})
              </Typography>
            )}
          </Box>
          <Button
            startIcon={<RefreshIcon />}
            size="small"
            onClick={() => loadLogs()}
            disabled={logsLoading}
          >
            Refresh
          </Button>
        </Box>

        {/* Type filter chips */}
        <Box sx={{ display: "flex", gap: 0.5, mb: 2, flexWrap: "wrap" }}>
          {["all", "error", "tool", "action", "thought", "info"].map((t) => (
            <Button
              key={t}
              size="small"
              variant={activityFilter === t ? "contained" : "outlined"}
              color={
                t === "error"
                  ? "error"
                  : t === "tool"
                    ? "primary"
                    : t === "action"
                      ? "secondary"
                      : t === "thought"
                        ? "warning"
                        : "inherit"
              }
              onClick={() => {
                setActivityFilter(t);
                setActivityPage(1);
              }}
              sx={{
                textTransform: "capitalize",
                minWidth: 50,
                py: 0.25,
                fontSize: "0.75rem",
              }}
            >
              {t}
            </Button>
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {logsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={30} />
          </Box>
        ) : recentActions.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
            <Typography variant="body2">
              No recent autonomous actions found in logs.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              position: "relative",
              ml: 2,
              pl: 3,
              borderLeft: "2px solid",
              borderColor: "divider",
            }}
          >
            {recentActions.map((action, i) => (
              <Box key={i} sx={{ position: "relative", mb: 2 }}>
                {/* Timeline node */}
                <Box
                  sx={{
                    position: "absolute",
                    left: -37, // Adjusted for pl: 3 + border 2
                    top: 0,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "background.paper",
                    border: "2px solid",
                    borderColor: getActionColor(action.type),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Box sx={{ transform: "scale(0.7)" }}>
                    {getActionIcon(action.type)}
                  </Box>
                </Box>

                {/* Timeline content */}
                <Box
                  sx={{
                    bgcolor: "background.default",
                    p: 1.5,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
                  >
                    {new Date(action.timestamp).toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: getActionColor(action.type),
                      fontFamily:
                        action.type === "tool" ? "monospace" : "inherit",
                      wordBreak: "break-word",
                    }}
                  >
                    {action.content}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Pagination */}
        {activityTotalPages > 1 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 2,
              pt: 2,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Pagination
              count={activityTotalPages}
              page={activityPage}
              onChange={(_, p) => setActivityPage(p)}
              size="small"
              color="primary"
            />
          </Box>
        )}
      </Paper>

      {/* Container Logs (Real-time) */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CodeIcon color="action" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Container Logs
            </Typography>
            {!logsPaused && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "success.main",
                  animation: "pulse 1.5s infinite",
                  "@keyframes pulse": {
                    "0%": { opacity: 1 },
                    "50%": { opacity: 0.3 },
                    "100%": { opacity: 1 },
                  },
                }}
              />
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: 0.5 }}
            >
              {logsPaused ? "Paused" : "Live"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              select
              size="small"
              value={logLines}
              onChange={(e) => setLogLines(Number(e.target.value))}
              sx={{ minWidth: 90 }}
              SelectProps={{ native: true }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </TextField>
            <Button
              size="small"
              variant={logsPaused ? "contained" : "outlined"}
              color={logsPaused ? "warning" : "primary"}
              onClick={() => setLogsPaused(!logsPaused)}
              sx={{ minWidth: 80 }}
            >
              {logsPaused ? "Resume" : "Pause"}
            </Button>
            <IconButton
              size="small"
              onClick={loadContainerLogs}
              disabled={containerLogsLoading}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box
          sx={{
            bgcolor: "#0d1117",
            color: "#c9d1d9",
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontSize: "0.8rem",
            lineHeight: 1.6,
            p: 2,
            borderRadius: 1.5,
            maxHeight: 400,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            position: "relative",
            "&::-webkit-scrollbar": {
              width: 8,
            },
            "&::-webkit-scrollbar-track": {
              bgcolor: "#161b22",
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#30363d",
              borderRadius: 4,
            },
          }}
        >
          {containerLogsLoading && !containerLogs ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} sx={{ color: "#58a6ff" }} />
            </Box>
          ) : containerLogs ? (
            containerLogs
          ) : (
            <Typography
              variant="body2"
              sx={{ color: "#8b949e", textAlign: "center", py: 4 }}
            >
              No container logs available. Is the container running?
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Platform Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 400 }, p: 3 } }}
      >
        {activePlatform && (
          <>
            <Typography
              variant="h6"
              sx={{ mb: 2, textTransform: "capitalize" }}
            >
              {activePlatform} Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Authentication Mode
            </Typography>
            <RadioGroup
              value={
                activePlatform === "telegram"
                  ? telegramDmPolicy
                  : discordDmPolicy
              }
              onChange={(e) => {
                if (activePlatform === "telegram") {
                  setTelegramDmPolicy(e.target.value);
                } else {
                  setDiscordDmPolicy(e.target.value);
                }
              }}
              sx={{ mb: 3 }}
            >
              <FormControlLabel
                value="pairing"
                control={<Radio />}
                label="Pairing Code (Default, Manual CLI approval)"
              />
              <FormControlLabel
                value="allowlist"
                control={<Radio />}
                label="Allowlist (Input User ID directly)"
              />
            </RadioGroup>

            {(activePlatform === "telegram"
              ? telegramDmPolicy
              : discordDmPolicy) === "pairing" && (
              <Box
                sx={{
                  bgcolor: "background.default",
                  p: 2,
                  borderRadius: 1,
                  mb: 3,
                }}
              >
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Message{" "}
                  {activePlatform === "telegram"
                    ? "`/start` to your bot on Telegram"
                    : "your bot on Discord"}{" "}
                  to receive a Pairing Code. Enter it below to authorize.
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Enter Pairing Code"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => approvePairingCode(activePlatform)}
                  disabled={submittingPairing || !pairingCode}
                >
                  {submittingPairing ? (
                    <CircularProgress size={24} />
                  ) : (
                    "Approve Code"
                  )}
                </Button>
              </Box>
            )}

            {(activePlatform === "telegram"
              ? telegramDmPolicy
              : discordDmPolicy) === "allowlist" && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Allowlist User IDs (comma separated):
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="e.g. 12345678, 87654321"
                  value={
                    activePlatform === "telegram"
                      ? telegramAllowFrom
                      : discordAllowFrom
                  }
                  onChange={(e) => {
                    if (activePlatform === "telegram") {
                      setTelegramAllowFrom(e.target.value);
                    } else {
                      setDiscordAllowFrom(e.target.value);
                    }
                  }}
                  helperText="Only these IDs can interact with the bot"
                />
              </Box>
            )}

            <Box
              sx={{
                mt: "auto",
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              <Button onClick={() => setSettingsDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setSettingsDrawerOpen(false);
                  toast.success(
                    'Settings confirmed. Remember to click "Save" on the main dashboard to apply changes.',
                  );
                }}
              >
                Confirm
              </Button>
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
};
