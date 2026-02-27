import React, { useEffect, useState } from "react";
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
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Skeleton,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import LockIcon from "@mui/icons-material/Lock";
import SearchIcon from "@mui/icons-material/Search";
import SEO from "../components/SEO";

interface SecretItem {
  _id: string;
  name: string;
  type: string;
  description?: string;
  project?: { _id: string; name: string };
  server?: { _id: string; name: string };
  tags: string[];
  lastAccessedAt?: string;
  lastRotatedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  env: "🔧",
  key: "🔑",
  token: "🎫",
  password: "🔐",
  certificate: "📜",
  other: "📦",
};

const SecretVault: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [secrets, setSecrets] = useState<SecretItem[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createDialog, setCreateDialog] = useState(false);
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>(
    {},
  );
  const [revealLoading, setRevealLoading] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState({
    name: "",
    value: "",
    type: "env",
    description: "",
    tags: "",
  });

  const fetchSecrets = async () => {
    setLoading(true);
    try {
      const params = typeFilter !== "all" ? `?type=${typeFilter}` : "";
      const { data } = await api.get(`/secrets${params}`);
      setSecrets(data.secrets || []);
    } catch {
      toast.error("Failed to load secrets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, [typeFilter]);

  const handleCreate = async () => {
    if (!newSecret.name || !newSecret.value) return;
    try {
      await api.post("/secrets", {
        ...newSecret,
        tags: newSecret.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast.success("Secret created");
      setCreateDialog(false);
      setNewSecret({
        name: "",
        value: "",
        type: "env",
        description: "",
        tags: "",
      });
      fetchSecrets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const handleReveal = async (id: string) => {
    if (revealedValues[id]) {
      // Toggle off
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    setRevealLoading(id);
    try {
      const { data } = await api.get(`/secrets/${id}/reveal`);
      setRevealedValues((prev) => ({ ...prev, [id]: data.value }));
      // Auto-hide after 30s
      setTimeout(() => {
        setRevealedValues((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 30000);
    } catch {
      toast.error("Failed to reveal");
    } finally {
      setRevealLoading(null);
    }
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard!");
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/secrets/${id}`);
      toast.success("Secret deleted");
      fetchSecrets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const filtered = secrets.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      <SEO title="Secret Vault" description="Manage encrypted secrets" />

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
            🔐 {t("secrets.title", "Secret Vault")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("secrets.subtitle", "AES-256 encrypted secrets management")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon
                  sx={{ fontSize: 18, mr: 0.5, color: "text.secondary" }}
                />
              ),
            }}
            sx={{ width: 180, "& .MuiOutlinedInput-root": { height: 36 } }}
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            size="small"
            sx={{ width: 120, height: 36 }}
          >
            <MenuItem value="all">{t("secretVault.allTypes", "All Types")}</MenuItem>
            <MenuItem value="env">{t("secretVault.env", "🔧 Env")}</MenuItem>
            <MenuItem value="key">{t("secretVault.key", "🔑 Key")}</MenuItem>
            <MenuItem value="token">{t("secretVault.token", "🎫 Token")}</MenuItem>
            <MenuItem value="password">{t("secretVault.password", "🔐 Password")}</MenuItem>
            <MenuItem value="certificate">{t("secretVault.cert", "📜 Cert")}</MenuItem>
            <MenuItem value="other">{t("secretVault.other", "📦 Other")}</MenuItem>
          </Select>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
            size="small"
          >
            {t("secretVault.addSecret", "Add Secret")}</Button>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchSecrets} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* List */}
      {loading ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={70} sx={{ mb: 1.5 }} />
          ))}
        </Box>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <LockIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
            <Typography color="text.secondary">
              {t("secrets.noSecrets", "No secrets stored")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("secretVault.addEncryptedSecretsLike", "Add encrypted secrets like API keys, tokens, and passwords.")}</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filtered.map((secret) => (
            <Card
              key={secret._id}
              sx={{
                transition: "all 0.2s",
                "&:hover": { transform: "translateY(-1px)" },
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Name + Type */}
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 13,
                        }}
                      >
                        {typeIcons[secret.type] || "📦"} {secret.name}
                      </Typography>
                      <Chip
                        label={secret.type}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10, height: 18 }}
                      />
                    </Box>
                    {secret.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: 11 }}
                      >
                        {secret.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Value (hidden/revealed) */}
                  <Box
                    sx={{
                      minWidth: 160,
                      maxWidth: 300,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                    }}
                  >
                    {revealedValues[secret._id] ? (
                      <Typography
                        variant="body2"
                        sx={{
                          bgcolor: "rgba(34,197,94,0.08)",
                          p: 0.5,
                          borderRadius: 1,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          wordBreak: "break-all",
                        }}
                      >
                        {revealedValues[secret._id]}
                      </Typography>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.disabled",
                          fontSize: 12,
                          letterSpacing: 2,
                        }}
                      >
                        ••••••••••••
                      </Typography>
                    )}
                  </Box>

                  {/* Tags */}
                  {secret.tags.length > 0 && (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {secret.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{ fontSize: 9, height: 16 }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Scope */}
                  {(secret.project || secret.server) && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 10 }}
                    >
                      {secret.project ? `📦 ${secret.project.name}` : ""}
                      {secret.server ? `🖥️ ${secret.server.name}` : ""}
                    </Typography>
                  )}

                  {/* Actions */}
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip
                      title={revealedValues[secret._id] ? "Hide" : "Reveal"}
                    >
                      <IconButton
                        size="small"
                        onClick={() => handleReveal(secret._id)}
                        disabled={revealLoading === secret._id}
                      >
                        {revealedValues[secret._id] ? (
                          <VisibilityOffIcon fontSize="small" />
                        ) : (
                          <VisibilityIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    {revealedValues[secret._id] && (
                      <Tooltip title="Copy">
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(revealedValues[secret._id])}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(secret._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <VpnKeyIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          {t("secretVault.addSecret", "Add Secret")}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "8px !important",
          }}
        >
          <TextField
            label="Name"
            placeholder="e.g. DATABASE_URL, API_KEY"
            value={newSecret.name}
            onChange={(e) =>
              setNewSecret((p) => ({ ...p, name: e.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Value"
            type="password"
            value={newSecret.value}
            onChange={(e) =>
              setNewSecret((p) => ({ ...p, value: e.target.value }))
            }
            fullWidth
          />
          <FormControl size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={newSecret.type}
              label="Type"
              onChange={(e) =>
                setNewSecret((p) => ({ ...p, type: e.target.value }))
              }
            >
              <MenuItem value="env">{t("secretVault.environmentVariable", "🔧 Environment Variable")}</MenuItem>
              <MenuItem value="key">{t("secretVault.aPIKey", "🔑 API Key")}</MenuItem>
              <MenuItem value="token">{t("secretVault.token", "🎫 Token")}</MenuItem>
              <MenuItem value="password">{t("secretVault.password", "🔐 Password")}</MenuItem>
              <MenuItem value="certificate">{t("secretVault.certificate", "📜 Certificate")}</MenuItem>
              <MenuItem value="other">{t("secretVault.other", "📦 Other")}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Description (optional)"
            value={newSecret.description}
            onChange={(e) =>
              setNewSecret((p) => ({ ...p, description: e.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Tags (comma separated)"
            placeholder="production, database"
            value={newSecret.tags}
            onChange={(e) =>
              setNewSecret((p) => ({ ...p, tags: e.target.value }))
            }
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>{t("secretVault.cancel", "Cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newSecret.name || !newSecret.value}
          >
            {t("secretVault.encryptSave", "Encrypt & Save")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecretVault;
