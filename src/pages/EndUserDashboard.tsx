import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Skeleton,
  Chip,
  useTheme,
  alpha,
  Tooltip,
  keyframes,
  LinearProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import AddIcon from "@mui/icons-material/Add";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PublicIcon from "@mui/icons-material/Public";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import SEO from "../components/SEO";

/* ─── animations ─── */
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
  server?: { name: string; status: string };
  autoDeploy?: boolean;
  branch?: string;
  environment?: string;
}

/* ─── helpers ─── */
const statusMap: Record<
  string,
  { color: string; bg: string; label: string; dot: boolean }
> = {
  running: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    label: "Live",
    dot: true,
  },
  online: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    label: "Live",
    dot: true,
  },
  stopped: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    label: "Stopped",
    dot: false,
  },
  failed: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    label: "Error",
    dot: false,
  },
  deploying: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    label: "Deploying",
    dot: false,
  },
  building: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    label: "Building",
    dot: false,
  },
  idle: {
    color: "#6b7280",
    bg: "rgba(107,114,128,0.08)",
    label: "Idle",
    dot: false,
  },
  unknown: {
    color: "#6b7280",
    bg: "rgba(107,114,128,0.08)",
    label: "—",
    dot: false,
  },
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

/* ─── component ─── */
const EndUserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primary = theme.palette.primary.main;

  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ live: 0, total: 0, deploys: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          api.get("/projects"),
          api.get("/dashboard/stats"),
        ]);
        const p = pRes.data.projects || pRes.data || [];
        setSites(p.slice(0, 8));
        setStats({
          live: p.filter((x: any) => ["running", "online"].includes(x.status))
            .length,
          total: p.length,
          deploys: sRes.data?.deployments?.total || 0,
        });
      } catch {
        /* */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ─── shared styles ─── */
  const glass = {
    background: isDark ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.7)",
    backdropFilter: "blur(24px)",
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    borderRadius: 4,
  };

  /* ─── loading skeleton ─── */
  if (loading) {
    return (
      <Box sx={{ animation: `${pulse} 1.5s ease-in-out infinite` }}>
        <Skeleton
          variant="rounded"
          width={320}
          height={38}
          sx={{ mb: 1, borderRadius: 2 }}
        />
        <Skeleton variant="text" width={240} height={22} sx={{ mb: 5 }} />
        <Grid container spacing={2.5}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 4 }}>
              <Skeleton
                variant="rounded"
                height={100}
                sx={{ borderRadius: 4 }}
              />
            </Grid>
          ))}
        </Grid>
        <Skeleton
          variant="text"
          width={140}
          height={28}
          sx={{ mt: 5, mb: 2 }}
        />
        <Grid container spacing={2.5}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton
                variant="rounded"
                height={170}
                sx={{ borderRadius: 4 }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  /* ─── stat items ─── */
  const statItems = [
    {
      icon: <CloudDoneIcon />,
      value: stats.live,
      label: t("enduser.sitesLive", "Sites Live"),
      color: "#10b981",
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    },
    {
      icon: <PublicIcon />,
      value: stats.total,
      label: t("enduser.totalSites", "Total Sites"),
      color: primary,
      gradient: `linear-gradient(135deg, ${primary} 0%, ${theme.palette.primary.dark} 100%)`,
    },
    {
      icon: <TrendingUpIcon />,
      value: stats.deploys,
      label: t("enduser.totalPublishes", "Total Deploys"),
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    },
  ];

  return (
    <Box>
      <SEO title="Dashboard" description="Your sites overview" />

      {/* ════════ Hero Section ════════ */}
      <Box
        sx={{
          position: "relative",
          mb: 5,
          animation: `${fadeInUp} 0.5s ease-out`,
        }}
      >
        {/* Decorative gradient blob */}
        <Box
          sx={{
            position: "absolute",
            top: -80,
            right: -60,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${alpha(primary, 0.12)} 0%, transparent 70%)`,
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: { xs: "1.6rem", md: "2rem" },
            letterSpacing: "-0.03em",
            mb: 0.5,
          }}
        >
          {t("enduser.welcome", { name: user?.username || "there" })} 👋
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: "text.secondary", fontSize: 15 }}
        >
          {t(
            "enduser.welcomeDesc",
            "Here's what's happening with your websites.",
          )}
        </Typography>
      </Box>

      {/* ════════ Stat Cards ════════ */}
      <Grid container spacing={2.5} sx={{ mb: 5 }}>
        {statItems.map((s, i) => (
          <Grid key={i} size={{ xs: 12, sm: 4 }}>
            <Card
              sx={{
                ...glass,
                overflow: "hidden",
                position: "relative",
                animation: `${fadeInUp} 0.5s ease-out ${i * 0.1}s both`,
                transition: "transform 0.25s, box-shadow 0.25s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: `0 8px 30px ${alpha(s.color, 0.15)}`,
                },
              }}
            >
              {/* Top accent line */}
              <Box sx={{ height: 3, background: s.gradient }} />
              <CardContent
                sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2 }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: alpha(s.color, isDark ? 0.15 : 0.08),
                    color: s.color,
                    flexShrink: 0,
                  }}
                >
                  {s.icon}
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {s.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontSize: 12.5, mt: 0.25 }}
                  >
                    {s.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ════════ Sites Header ════════ */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          animation: `${fadeInUp} 0.5s ease-out 0.3s both`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17 }}>
          {t("enduser.yourSites", "Your Sites")}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/smart-deploy")}
          sx={{
            borderRadius: 2.5,
            textTransform: "none",
            fontWeight: 600,
            fontSize: 13,
            px: 2.5,
            py: 0.8,
            boxShadow: `0 4px 14px ${alpha(primary, 0.3)}`,
            "&:hover": {
              boxShadow: `0 6px 20px ${alpha(primary, 0.4)}`,
            },
          }}
        >
          {t("enduser.newSite", "New Site")}
        </Button>
      </Box>

      {/* ════════ Sites Grid ════════ */}
      {sites.length === 0 ? (
        /* Empty state */
        <Card
          sx={{
            ...glass,
            textAlign: "center",
            py: 8,
            px: 3,
            animation: `${fadeInUp} 0.6s ease-out 0.4s both`,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              mx: "auto",
              mb: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${alpha(primary, 0.15)}, ${alpha(primary, 0.05)})`,
            }}
          >
            <RocketLaunchIcon sx={{ fontSize: 36, color: primary }} />
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {t("enduser.noSitesTitle", "Launch your first site")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 4, maxWidth: 420, mx: "auto", lineHeight: 1.7 }}
          >
            {t(
              "enduser.noSitesDesc",
              "Connect your GitHub repo or upload your code. We'll handle the server, deployment, and everything else.",
            )}
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<RocketLaunchIcon />}
            onClick={() => navigate("/smart-deploy")}
            sx={{
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 700,
              px: 4,
              py: 1.2,
              fontSize: 15,
              boxShadow: `0 4px 14px ${alpha(primary, 0.3)}`,
            }}
          >
            {t("enduser.createFirst", "Deploy your first site")}
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {sites.map((site, idx) => {
            const st = getStatus(site.status);
            const isDeploying = [
              "deploying",
              "building",
              "cloning",
              "installing",
              "starting",
            ].includes(site.status);
            return (
              <Grid key={site._id} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  onClick={() => navigate(`/projects/${site._id}/deploy`)}
                  sx={{
                    ...glass,
                    cursor: "pointer",
                    overflow: "hidden",
                    position: "relative",
                    animation: `${fadeInUp} 0.5s ease-out ${0.3 + idx * 0.06}s both`,
                    transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: isDark
                        ? `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px ${alpha(primary, 0.15)}`
                        : `0 16px 48px rgba(0,0,0,0.08), 0 0 0 1px ${alpha(primary, 0.15)}`,
                      borderColor: alpha(primary, 0.2),
                      "& .site-arrow": {
                        opacity: 1,
                        transform: "translateX(0)",
                      },
                    },
                  }}
                >
                  {/* Progress bar for deploying */}
                  {isDeploying && (
                    <LinearProgress
                      sx={{
                        height: 2,
                        "& .MuiLinearProgress-bar": {
                          background: `linear-gradient(90deg, ${st.color}, ${alpha(st.color, 0.5)})`,
                          backgroundSize: "200% 100%",
                          animation: `${shimmer} 1.5s linear infinite`,
                        },
                      }}
                    />
                  )}

                  <CardContent sx={{ p: 2.5 }}>
                    {/* Header: initials + status */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
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
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.6 }}
                      >
                        {st.dot && (
                          <Box
                            sx={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              bgcolor: st.color,
                              boxShadow: `0 0 6px ${st.color}`,
                            }}
                          />
                        )}
                        <Typography
                          sx={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: st.color,
                          }}
                        >
                          {st.label}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Name */}
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: 14,
                        mb: 0.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {site.name}
                    </Typography>

                    {/* Branch + env */}
                    <Typography
                      sx={{ fontSize: 11.5, color: "text.secondary", mb: 2 }}
                    >
                      {site.branch || "main"} • {site.environment || "node"}
                    </Typography>

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
                        {timeAgo(site.lastDeployedAt)}
                      </Typography>
                      <ArrowForwardIcon
                        className="site-arrow"
                        sx={{
                          fontSize: 15,
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

      {/* Quick tip for end users */}
      {sites.length > 0 && (
        <Box
          sx={{
            mt: 4,
            p: 2.5,
            borderRadius: 3,
            bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
            border: "1px dashed",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            animation: `${fadeInUp} 0.5s ease-out 0.8s both`,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha("#8b5cf6", 0.1),
              color: "#8b5cf6",
              flexShrink: 0,
            }}
          >
            <AutorenewIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.25 }}>
              {t("enduser.tipTitle", "Pro tip")}
            </Typography>
            <Typography
              sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.5 }}
            >
              {t(
                "enduser.tipDesc",
                "Enable auto-deploy on your sites to automatically publish changes when you push to GitHub.",
              )}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default EndUserDashboard;
