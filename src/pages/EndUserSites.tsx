import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Skeleton,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  useTheme,
  alpha,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  keyframes,
  LinearProgress,
  Tabs,
  Tab,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SettingsIcon from "@mui/icons-material/Settings";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import GitHubIcon from "@mui/icons-material/GitHub";
import FolderIcon from "@mui/icons-material/Folder";
import FilterListIcon from "@mui/icons-material/FilterList";
import SEO from "../components/SEO";

/* ─── animations ─── */
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

/* ─── types ─── */
interface SiteInfo {
  _id: string;
  name: string;
  repoUrl?: string;
  status: string;
  lastDeployedAt?: string;
  server?: { name: string; status: string; _id: string };
  autoDeploy?: boolean;
  branch?: string;
  environment?: string;
  sourceType?: string;
}

/* ─── helpers ─── */
const statusMap: Record<
  string,
  { color: string; label: string; dotGlow: boolean }
> = {
  running: { color: "#10b981", label: "Live", dotGlow: true },
  online: { color: "#10b981", label: "Live", dotGlow: true },
  stopped: { color: "#ef4444", label: "Stopped", dotGlow: false },
  failed: { color: "#ef4444", label: "Error", dotGlow: false },
  deploying: { color: "#f59e0b", label: "Deploying", dotGlow: false },
  building: { color: "#f59e0b", label: "Building", dotGlow: false },
  cloning: { color: "#f59e0b", label: "Setting up", dotGlow: false },
  installing: { color: "#f59e0b", label: "Installing", dotGlow: false },
  starting: { color: "#f59e0b", label: "Starting", dotGlow: false },
  idle: { color: "#6b7280", label: "Idle", dotGlow: false },
  pending: { color: "#6b7280", label: "Pending", dotGlow: false },
  unknown: { color: "#6b7280", label: "—", dotGlow: false },
};
const getStatus = (s: string) => statusMap[s] || statusMap.unknown;

const timeAgo = (d?: string): string => {
  if (!d) return "Never";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
};

const envIcons: Record<string, string> = {
  node: "⬢",
  python: "🐍",
  static: "📄",
  "docker-compose": "🐳",
};

/* ─── component ─── */
const EndUserSites: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primary = theme.palette.primary.main;

  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tabFilter, setTabFilter] = useState(0); // 0=all, 1=live, 2=stopped/error
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuSite, setMenuSite] = useState<SiteInfo | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      const { data } = await api.get("/projects");
      setSites(data.projects || data || []);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  /* Filter logic */
  const filtered = sites
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .filter((s) => {
      if (tabFilter === 1) return ["running", "online"].includes(s.status);
      if (tabFilter === 2)
        return ["stopped", "failed", "error"].includes(s.status);
      return true;
    });

  const liveCount = sites.filter((s) =>
    ["running", "online"].includes(s.status),
  ).length;
  const errorCount = sites.filter((s) =>
    ["stopped", "failed"].includes(s.status),
  ).length;

  const handleDeploy = async (siteId: string) => {
    setMenuAnchor(null);
    try {
      await api.post(`/projects/${siteId}/deploy`);
      toast.success(t("enduser.deployStarted", "Deployment started!"));
      fetchSites();
    } catch {
      toast.error("Failed");
    }
  };

  /* ─── glass ─── */
  const glass = {
    background: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.7)",
    backdropFilter: "blur(24px)",
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    borderRadius: 4,
  };

  /* ─── loading ─── */
  if (loading) {
    return (
      <Box>
        <Skeleton
          variant="rounded"
          width={200}
          height={32}
          sx={{ mb: 1, borderRadius: 2 }}
        />
        <Skeleton variant="text" width={300} height={20} sx={{ mb: 4 }} />
        <Skeleton
          variant="rounded"
          height={42}
          sx={{ borderRadius: 3, mb: 4, maxWidth: 380 }}
        />
        <Grid container spacing={2.5}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton
                variant="rounded"
                height={190}
                sx={{ borderRadius: 4 }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <SEO
        title={t("enduser.mySitesTitle")}
        description={t("enduser.mySitesDesc")}
      />

      {/* ════════ Header ════════ */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 4,
          animation: `${fadeInUp} 0.4s ease-out`,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.5rem", md: "1.8rem" },
              letterSpacing: "-0.03em",
              mb: 0.5,
            }}
          >
            {t("enduser.mySitesTitle", "My Sites")}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontSize: 14 }}
          >
            {t("enduser.mySitesDesc", "Manage and monitor all your websites.")}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            borderRadius: 2.5,
            textTransform: "none",
            fontWeight: 600,
            fontSize: 13,
            px: 2.5,
            py: 0.8,
            flexShrink: 0,
            boxShadow: `0 4px 14px ${alpha(primary, 0.3)}`,
            "&:hover": { boxShadow: `0 6px 20px ${alpha(primary, 0.4)}` },
          }}
          onClick={() => navigate("/smart-deploy")}
        >
          {t("enduser.addNewSite", "Add New Site")}
        </Button>
      </Box>

      {/* ════════ Filters ════════ */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
          mb: 3,
          animation: `${fadeInUp} 0.4s ease-out 0.1s both`,
        }}
      >
        <TextField
          placeholder={t("enduser.searchSites", "Search sites...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: 280,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2.5,
              fontSize: 13,
              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              "& fieldset": {
                borderColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              },
            },
          }}
        />
        <Tabs
          value={tabFilter}
          onChange={(_, v) => setTabFilter(v)}
          sx={{
            minHeight: 32,
            "& .MuiTab-root": {
              minHeight: 32,
              py: 0.5,
              px: 1.5,
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 2,
              textTransform: "none",
              minWidth: 0,
              mr: 0.5,
            },
            "& .MuiTabs-indicator": { display: "none" },
            "& .Mui-selected": {
              bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            },
          }}
        >
          <Tab label={`All (${sites.length})`} />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: "#10b981",
                  }}
                />
                {`Live (${liveCount})`}
              </Box>
            }
          />
          {errorCount > 0 && (
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "#ef4444",
                    }}
                  />
                  {`Issues (${errorCount})`}
                </Box>
              }
            />
          )}
        </Tabs>
      </Box>

      {/* ════════ Sites Grid ════════ */}
      {filtered.length === 0 ? (
        <Card
          sx={{
            ...glass,
            textAlign: "center",
            py: 8,
            animation: `${fadeInUp} 0.5s ease-out 0.2s both`,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              mx: "auto",
              mb: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${alpha(primary, 0.15)}, ${alpha(primary, 0.05)})`,
            }}
          >
            {search ? (
              <SearchIcon sx={{ fontSize: 32, color: primary }} />
            ) : (
              <RocketLaunchIcon sx={{ fontSize: 32, color: primary }} />
            )}
          </Box>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {search
              ? t("enduser.noSearchResults", "No matching sites")
              : t("enduser.noSitesTitle")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, maxWidth: 380, mx: "auto" }}
          >
            {search
              ? t("enduser.tryDifferentSearch", "Try a different search term.")
              : t("enduser.noSitesDesc")}
          </Typography>
          {!search && (
            <Button
              variant="contained"
              startIcon={<RocketLaunchIcon />}
              onClick={() => navigate("/smart-deploy")}
              sx={{
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 600,
                px: 3,
              }}
            >
              {t("enduser.createFirst")}
            </Button>
          )}
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((site, idx) => {
            const st = getStatus(site.status);
            const isDeploying = [
              "deploying",
              "building",
              "cloning",
              "installing",
              "starting",
            ].includes(site.status);
            const envIcon = envIcons[site.environment || "node"] || "⬢";

            return (
              <Grid key={site._id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  onClick={() => navigate(`/projects/${site._id}/deploy`)}
                  sx={{
                    ...glass,
                    cursor: "pointer",
                    overflow: "hidden",
                    position: "relative",
                    animation: `${fadeInUp} 0.4s ease-out ${0.15 + idx * 0.05}s both`,
                    transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: isDark
                        ? `0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px ${alpha(primary, 0.12)}`
                        : `0 20px 50px rgba(0,0,0,0.06), 0 0 0 1px ${alpha(primary, 0.12)}`,
                      borderColor: alpha(primary, 0.15),
                      "& .card-arrow": {
                        opacity: 1,
                        transform: "translateX(0)",
                      },
                    },
                  }}
                >
                  {/* Deploying progress */}
                  {isDeploying && (
                    <LinearProgress
                      sx={{
                        height: 2,
                        "& .MuiLinearProgress-bar": {
                          background: `linear-gradient(90deg, ${st.color}, ${alpha(st.color, 0.4)})`,
                          backgroundSize: "200% 100%",
                          animation: `${shimmer} 1.5s linear infinite`,
                        },
                      }}
                    />
                  )}

                  <CardContent sx={{ p: 2.5 }}>
                    {/* Row 1: Avatar + Status + Menu */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `linear-gradient(135deg, ${alpha(primary, 0.12)}, ${alpha(primary, 0.04)})`,
                            color: primary,
                            fontSize: 15,
                            fontWeight: 800,
                          }}
                        >
                          {site.name.charAt(0).toUpperCase()}
                        </Box>
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: 14,
                              lineHeight: 1.2,
                              mb: 0.15,
                            }}
                          >
                            {site.name}
                          </Typography>
                          <Typography
                            sx={{ fontSize: 11, color: "text.secondary" }}
                          >
                            {site.server?.name || "—"}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuAnchor(e.currentTarget);
                          setMenuSite(site);
                        }}
                        sx={{
                          color: "text.secondary",
                          "&:hover": {
                            bgcolor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                          },
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>

                    {/* Tags row */}
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.6,
                        mb: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        icon={
                          st.dotGlow
                            ? ((
                                <Box
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    bgcolor: st.color,
                                    boxShadow: `0 0 6px ${st.color}`,
                                    ml: 0.5,
                                  }}
                                />
                              ) as any)
                            : undefined
                        }
                        label={st.label}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 10.5,
                          fontWeight: 600,
                          bgcolor: alpha(st.color, isDark ? 0.12 : 0.08),
                          color: st.color,
                          "& .MuiChip-icon": { mr: -0.3 },
                        }}
                      />
                      <Chip
                        label={`${envIcon} ${(site.environment || "node").charAt(0).toUpperCase() + (site.environment || "node").slice(1)}`}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 10.5,
                          fontWeight: 500,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                          color: "text.secondary",
                        }}
                      />
                      <Chip
                        label={site.branch || "main"}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 10.5,
                          fontWeight: 500,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(0,0,0,0.03)",
                          color: "text.secondary",
                        }}
                      />
                      {site.autoDeploy && (
                        <Chip
                          label="Auto"
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: 10,
                            fontWeight: 600,
                            bgcolor: alpha("#10b981", isDark ? 0.12 : 0.08),
                            color: "#10b981",
                          }}
                        />
                      )}
                    </Box>

                    {/* Footer */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        pt: 1.5,
                        borderTop: "1px solid",
                        borderColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.04)",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: "text.secondary",
                          display: "flex",
                          alignItems: "center",
                          gap: 0.4,
                        }}
                      >
                        <AccessTimeIcon sx={{ fontSize: 12 }} />
                        {site.lastDeployedAt
                          ? timeAgo(site.lastDeployedAt)
                          : t("enduser.neverPublished", "Never published")}
                      </Typography>
                      <ArrowForwardIcon
                        className="card-arrow"
                        sx={{
                          fontSize: 14,
                          color: "text.secondary",
                          opacity: 0,
                          transform: "translateX(-4px)",
                          transition: "all 0.25s ease",
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ════════ Context Menu ════════ */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          setMenuSite(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2.5,
              minWidth: 190,
              boxShadow: isDark
                ? "0 12px 40px rgba(0,0,0,0.5)"
                : "0 12px 40px rgba(0,0,0,0.12)",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
              bgcolor: isDark ? "rgba(24,24,32,0.95)" : "#fff",
              backdropFilter: "blur(20px)",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuSite) handleDeploy(menuSite._id);
          }}
          sx={{ fontSize: 13, py: 1 }}
        >
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
          >
            {t("enduser.publish", "Publish")}
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuSite) navigate(`/projects/${menuSite._id}/deploy`);
            setMenuAnchor(null);
          }}
          sx={{ fontSize: 13, py: 1 }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
          >
            {t("enduser.viewDetails", "View Details")}
          </ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
          }}
          sx={{ fontSize: 13, py: 1 }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }}
          >
            {t("enduser.siteSettings", "Settings")}
          </ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EndUserSites;
