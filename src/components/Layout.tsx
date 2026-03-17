import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  useTheme,
  alpha,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import DnsIcon from "@mui/icons-material/Dns";
import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import LanguageIcon from "@mui/icons-material/Language";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import HistoryIcon from "@mui/icons-material/History";
import PeopleIcon from "@mui/icons-material/People";
import TerminalIcon from "@mui/icons-material/Terminal";
import StorageIcon from "@mui/icons-material/Storage";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SnippetFolderIcon from "@mui/icons-material/SnippetFolder";
import LanIcon from "@mui/icons-material/Lan";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BarChartIcon from "@mui/icons-material/BarChart";
import NetworkCheckIcon from "@mui/icons-material/NetworkCheck";
import GppGoodIcon from "@mui/icons-material/GppGood";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import VpnLockIcon from "@mui/icons-material/VpnLock";
import WebhookIcon from "@mui/icons-material/Webhook";
import ScienceIcon from "@mui/icons-material/Science";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import SubjectIcon from "@mui/icons-material/Subject";
import PublicIcon from "@mui/icons-material/Public";
import CodeIcon from "@mui/icons-material/Code";
import PersonIcon from "@mui/icons-material/Person";
import NotificationCenter from "./NotificationCenter";
import AIChatOverlay from "./AIChatOverlay";
import { useThemeMode } from "../contexts/ThemeContext";
import type { InterfaceMode } from "../contexts/ThemeContext";
import ServerSelector from "./ServerSelector";
import TeamSwitcher from "./TeamSwitcher";
import CommandPalette from "./CommandPalette";

const DRAWER_WIDTH = 260;

interface NavItem {
  labelKey: string;
  icon: React.ReactElement;
  path: string;
}

interface NavSection {
  labelKey: string; // section header translation key
  items: NavItem[];
}

const devNavSections: NavSection[] = [
  {
    labelKey: "",
    items: [
      {
        labelKey: "nav.dashboard",
        icon: <DashboardIcon />,
        path: "/dashboard",
      },
      { labelKey: "nav.servers", icon: <DnsIcon />, path: "/servers" },
      { labelKey: "nav.projects", icon: <FolderIcon />, path: "/projects" },
    ],
  },
  {
    labelKey: "nav.group.infrastructure",
    items: [
      { labelKey: "nav.nginx", icon: <LanguageIcon />, path: "/nginx" },
      { labelKey: "nav.pm2", icon: <TerminalIcon />, path: "/pm2" },
      { labelKey: "nav.docker", icon: <ViewInArIcon />, path: "/docker" },
      { labelKey: "nav.database", icon: <StorageIcon />, path: "/database" },
      { labelKey: "nav.ftp", icon: <SnippetFolderIcon />, path: "/ftp" },
      { labelKey: "nav.ports", icon: <LanIcon />, path: "/ports" },
      { labelKey: "nav.cron", icon: <AccessTimeIcon />, path: "/cron" },
      { labelKey: "nav.vpn", icon: <VpnLockIcon />, path: "/vpn" },
      {
        labelKey: "nav.oneClick",
        icon: <RocketLaunchIcon />,
        path: "/one-click",
      },
    ],
  },
  {
    labelKey: "nav.group.devops",
    items: [
      {
        labelKey: "nav.pipelines",
        icon: <LinearScaleIcon />,
        path: "/pipelines",
      },
      {
        labelKey: "nav.testRunner",
        icon: <ScienceIcon />,
        path: "/test-runner",
      },
      {
        labelKey: "nav.webhookDebug",
        icon: <WebhookIcon />,
        path: "/webhook-debug",
      },
      { labelKey: "nav.secrets", icon: <VpnKeyIcon />, path: "/secrets" },
    ],
  },
  {
    labelKey: "nav.group.monitoring",
    items: [
      { labelKey: "nav.analytics", icon: <BarChartIcon />, path: "/analytics" },
      {
        labelKey: "nav.bandwidth",
        icon: <NetworkCheckIcon />,
        path: "/bandwidth",
      },
      {
        labelKey: "nav.infrastructure",
        icon: <AccountTreeIcon />,
        path: "/infrastructure",
      },
      { labelKey: "nav.logs", icon: <SubjectIcon />, path: "/logs" },
    ],
  },
  {
    labelKey: "nav.group.management",
    items: [
      { labelKey: "nav.approvals", icon: <GppGoodIcon />, path: "/approvals" },
      { labelKey: "nav.activity", icon: <HistoryIcon />, path: "/activity" },
      { labelKey: "nav.users", icon: <PeopleIcon />, path: "/users" },
      { labelKey: "nav.settings", icon: <SettingsIcon />, path: "/settings" },
    ],
  },
];

const endUserNavSections: NavSection[] = [
  {
    labelKey: "",
    items: [
      {
        labelKey: "nav.enduser.dashboard",
        icon: <DashboardIcon />,
        path: "/dashboard",
      },
      {
        labelKey: "nav.enduser.smartDeploy",
        icon: <RocketLaunchIcon />,
        path: "/smart-deploy",
      },
      {
        labelKey: "nav.enduser.mySites",
        icon: <PublicIcon />,
        path: "/projects",
      },
    ],
  },
  {
    labelKey: "",
    items: [
      {
        labelKey: "nav.enduser.analytics",
        icon: <BarChartIcon />,
        path: "/analytics",
      },
      {
        labelKey: "nav.enduser.settings",
        icon: <SettingsIcon />,
        path: "/settings",
      },
    ],
  },
];

const getNavSections = (mode: InterfaceMode) =>
  mode === "enduser" ? endUserNavSections : devNavSections;

// Flat list for getPageTitle & bottom nav
const devNavItems = devNavSections.flatMap((s) => s.items);
const endUserNavItems = endUserNavSections.flatMap((s) => s.items);

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const {
    mode,
    toggleTheme,
    sidebarPosition,
    mobileLayout,
    interfaceMode,
    setInterfaceMode,
  } = useThemeMode();
  const isDark = mode === "dark";
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const navSections = getNavSections(interfaceMode);
  const navItems = interfaceMode === "enduser" ? endUserNavItems : devNavItems;

  const toggleLang = () => {
    const next = i18n.language === "en" ? "vi" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

  // Listen for Ctrl+K or Cmd+K to open Command Palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const getPageTitle = () => {
    const item = navItems.find((n) => n.path === location.pathname);
    if (item) return t(item.labelKey);
    if (location.pathname.includes("/deploy"))
      return t("deploy.deploymentDetail");
    if (location.pathname.includes("/servers/")) return t("servers.serverInfo");
    return t("nav.dashboard");
  };

  // F12: Dynamic page title
  useEffect(() => {
    document.title = `${getPageTitle()} — Pulse`;
  }, [location.pathname]);

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Workspace Header (Notion-style) ── */}
      <Box
        sx={{
          px: 1.5,
          pt: 1.5,
          pb: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 1,
            py: 0.75,
            borderRadius: 1.5,
            cursor: "pointer",
            transition: "background 0.12s ease",
            "&:hover": {
              bgcolor: isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.04)",
            },
          }}
        >
          <Avatar
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: "primary.main",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: 13.5,
                fontWeight: 600,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.username}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Mode Switcher ── */}
      <Box sx={{ px: 1.5, pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            borderRadius: 2,
            bgcolor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            p: 0.4,
            gap: 0.4,
          }}
        >
          {[
            {
              key: "developer" as InterfaceMode,
              icon: <CodeIcon sx={{ fontSize: 14 }} />,
              label: "Pro",
            },
            {
              key: "enduser" as InterfaceMode,
              icon: <PersonIcon sx={{ fontSize: 14 }} />,
              label: "Simple",
            },
          ].map((m) => (
            <Box
              key={m.key}
              onClick={() => {
                setInterfaceMode(m.key);
                navigate("/dashboard");
              }}
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                py: 0.6,
                px: 1,
                borderRadius: 1.5,
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: 11.5,
                fontWeight: interfaceMode === m.key ? 600 : 400,
                color:
                  interfaceMode === m.key ? "text.primary" : "text.secondary",
                bgcolor:
                  interfaceMode === m.key
                    ? isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(255,255,255,0.9)"
                    : "transparent",
                boxShadow:
                  interfaceMode === m.key
                    ? isDark
                      ? "0 1px 3px rgba(0,0,0,0.3)"
                      : "0 1px 3px rgba(0,0,0,0.08)"
                    : "none",
                "&:hover": {
                  bgcolor:
                    interfaceMode === m.key
                      ? isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(255,255,255,0.9)"
                      : isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.06)",
                },
              }}
            >
              {m.icon}
              {m.label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Scrollable Nav ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          px: 1,
          pb: 0.5,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "transparent",
            borderRadius: 100,
            transition: "background 0.2s",
          },
          "&:hover::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(128,128,128,0.2)",
          },
        }}
      >
        {navSections.map((section, sIdx) => (
          <Box key={sIdx}>
            {/* Section label */}
            {section.labelKey ? (
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "text.secondary",
                  opacity: 0.55,
                  px: 1,
                  pt: sIdx === 1 ? 1 : 1.5,
                  pb: 0.3,
                  userSelect: "none",
                }}
              >
                {t(section.labelKey)}
              </Typography>
            ) : null}

            {/* Items */}
            <List disablePadding>
              {section.items.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path);
                return (
                  <ListItemButton
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                    selected={isActive}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                      py: 0.4,
                      px: 1,
                      minHeight: 32,
                      borderRadius: 1.5,
                      gap: 0.75,
                      transition: "background 0.1s ease",
                      "&.Mui-selected": {
                        bgcolor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                        "&:hover": {
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.08)",
                        },
                        "& .MuiListItemText-primary": {
                          fontWeight: 600,
                        },
                      },
                      "&:hover": {
                        bgcolor: isDark
                          ? "rgba(255,255,255,0.055)"
                          : "rgba(0,0,0,0.04)",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: 0.75,
                        color: isActive ? "text.primary" : "text.secondary",
                        opacity: isActive ? 1 : 0.7,
                        "& .MuiSvgIcon-root": { fontSize: 18 },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(item.labelKey)}
                      primaryTypographyProps={{
                        fontSize: 13.5,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "text.primary" : "text.secondary",
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* ── Bottom Actions ── */}
      <Box sx={{ px: 1, pb: 1.5 }}>
        <List disablePadding>
          <ListItemButton
            onClick={() => setLogoutOpen(true)}
            sx={{
              py: 0.4,
              px: 1,
              minHeight: 32,
              borderRadius: 1.5,
              gap: 0.75,
              transition: "background 0.1s ease",
              "&:hover": {
                bgcolor: isDark
                  ? "rgba(255,255,255,0.055)"
                  : "rgba(0,0,0,0.04)",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 0.75,
                color: "text.secondary",
                opacity: 0.7,
                "& .MuiSvgIcon-root": { fontSize: 18 },
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary={t("auth.logout")}
              primaryTypographyProps={{
                fontSize: 13.5,
                fontWeight: 400,
                color: "text.secondary",
              }}
            />
          </ListItemButton>
        </List>
      </Box>

      {/* Mobile-only settings in drawer */}
      <Box sx={{ display: { xs: "block", sm: "none" }, px: 2, py: 1 }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<LanguageIcon sx={{ fontSize: "16px !important" }} />}
            onClick={toggleLang}
            fullWidth
            sx={{
              justifyContent: "flex-start",
              color: "text.primary",
              borderColor: "divider",
              whiteSpace: "nowrap",
              fontSize: { xs: 11, sm: 12 },
              px: 1,
            }}
          >
            {i18n.language === "en" ? "Tiếng Việt" : "English"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              mode === "dark" ? (
                <LightModeIcon sx={{ fontSize: "16px !important" }} />
              ) : (
                <DarkModeIcon sx={{ fontSize: "16px !important" }} />
              )
            }
            onClick={toggleTheme}
            fullWidth
            sx={{
              justifyContent: "flex-start",
              color: "text.primary",
              borderColor: "divider",
              whiteSpace: "nowrap",
              fontSize: { xs: 11, sm: 12 },
              px: 1,
            }}
          >
            {mode === "dark" ? t("common.lightMode") : t("common.darkMode")}
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const logoutDialog = (
    <Dialog
      open={logoutOpen}
      onClose={() => setLogoutOpen(false)}
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 600 }}>{t("auth.logout")}</DialogTitle>
      <DialogContent>
        <Typography>{t("auth.logoutConfirm")}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setLogoutOpen(false)}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" color="error" onClick={logout}>
          {t("auth.logout")}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        flexDirection: sidebarPosition === "right" ? "row-reverse" : "row",
      }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        anchor={sidebarPosition}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            bgcolor: "background.paper",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        anchor={sidebarPosition}
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            bgcolor: "background.paper",
            borderRight:
              sidebarPosition === "left"
                ? isDark
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "1px solid rgba(0, 0, 0, 0.08)"
                : "none",
            borderLeft:
              sidebarPosition === "right"
                ? isDark
                  ? "1px solid rgba(255, 255, 255, 0.08)"
                  : "1px solid rgba(0, 0, 0, 0.08)"
                : "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          ml: {
            md: sidebarPosition === "left" ? `${DRAWER_WIDTH}px` : 0,
          },
          mr: {
            md: sidebarPosition === "right" ? `${DRAWER_WIDTH}px` : 0,
          },
          mb: { xs: mobileLayout === "bottom" ? 7 : 0, md: 0 },
        }}
      >
        <AppBar
          position="fixed"
          sx={{
            ml: {
              md: sidebarPosition === "left" ? `${DRAWER_WIDTH}px` : 0,
            },
            mr: {
              md: sidebarPosition === "right" ? `${DRAWER_WIDTH}px` : 0,
            },
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            bgcolor: "var(--appbar-bg)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "none",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Toolbar>
            {mobileLayout === "drawer" && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 2, display: { md: "none" } }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" noWrap sx={{ flex: 1, fontSize: 20 }}>
              {getPageTitle()}
            </Typography>

            {/* Hint for search */}
            <Tooltip title="Search Apps & Tools (Ctrl + K)">
              <Button
                size="small"
                onClick={() => setCommandPaletteOpen(true)}
                sx={{
                  display: { xs: "none", sm: "flex" },
                  textTransform: "none",
                  color: "text.secondary",
                  border: "1px solid",
                  borderColor: "divider",
                  mr: 2,
                  bgcolor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.03)",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <SearchIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" sx={{ opacity: 0.7, mr: 1 }}>
                  Search...
                </Typography>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    px: 0.5,
                    fontSize: 10,
                    bgcolor: "background.paper",
                  }}
                >
                  Ctrl K
                </Box>
              </Button>
            </Tooltip>

            {/* Team Switcher */}
            <TeamSwitcher />

            {/* Server Selector */}
            <ServerSelector />

            <NotificationCenter />
            <Box
              sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center" }}
            >
              <Tooltip
                title={i18n.language === "en" ? "Tiếng Việt" : "English"}
              >
                <IconButton
                  onClick={toggleLang}
                  sx={{
                    color: "text.secondary",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {i18n.language === "en" ? "VI" : "EN"}
                </IconButton>
              </Tooltip>
              <Tooltip
                title={
                  mode === "dark" ? t("common.lightMode") : t("common.darkMode")
                }
              >
                <IconButton
                  onClick={toggleTheme}
                  sx={{ color: "text.secondary" }}
                >
                  {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
            </Box>
            {/* ... Date ... */}
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            p: { xs: 2, md: 4 },
            mt: 8,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
            minHeight: 0,
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Command Palette Overlay */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Mobile Bottom Navigation */}
      {mobileLayout === "bottom" && (
        <Paper
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: { xs: "block", md: "none" },
            zIndex: 1000,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
          elevation={3}
        >
          <BottomNavigation
            value={location.pathname}
            onChange={(_, newValue) => {
              // Navigate handled by NavLink component or custom logic
            }}
            showLabels
            sx={{
              bgcolor: "background.paper",
              height: 64,
            }}
          >
            {[
              {
                labelKey: "nav.dashboard",
                icon: <DashboardIcon />,
                path: "/dashboard",
              },
              { labelKey: "nav.servers", icon: <DnsIcon />, path: "/servers" },
              {
                labelKey: "nav.projects",
                icon: <FolderIcon />,
                path: "/projects",
              },
              { labelKey: "nav.more", icon: <MenuIcon />, path: "more" }, // Simple "More" for other items
            ].map((item) =>
              item.path === "more" ? (
                <BottomNavigationAction
                  key="more"
                  label={t("common.more")}
                  icon={<MenuIcon />}
                  onClick={() => setMoreMenuOpen(true)}
                  sx={{
                    "& .MuiBottomNavigationAction-label": {
                      textAlign: "center",
                      lineHeight: "1.2",
                    },
                  }}
                />
              ) : (
                <BottomNavigationAction
                  key={item.path}
                  label={t(item.labelKey)}
                  icon={item.icon}
                  component={NavLink}
                  to={item.path}
                  value={item.path}
                  sx={{
                    "&.active": {
                      color: "primary.main",
                    },
                    "& .MuiBottomNavigationAction-label": {
                      textAlign: "center",
                      lineHeight: "1.2",
                      whiteSpace: "pre-wrap",
                    },
                  }}
                />
              ),
            )}
          </BottomNavigation>
        </Paper>
      )}

      {/* More Menu Bottom Sheet */}
      <Drawer
        anchor="bottom"
        open={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        sx={{
          zIndex: 1100,
          "& .MuiDrawer-paper": {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 2,
            maxHeight: "80vh",
          },
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 4,
            bgcolor: "divider",
            borderRadius: 2,
            mx: "auto",
            mt: 1.5,
            mb: 1,
          }}
        />
        <Typography
          variant="subtitle1"
          sx={{ textAlign: "center", fontWeight: 700, mb: 2 }}
        >
          {t("dashboard.quickActions")}
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <List>
          {navItems
            .filter(
              (item) => !["/", "/servers", "/projects"].includes(item.path),
            )
            .map((item) => (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                onClick={() => setMoreMenuOpen(false)}
                sx={{
                  py: 1.5,
                  "&.active": {
                    color: "primary.main",
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                    bgcolor: "primary.lighter",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={t(item.labelKey)}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
        </List>
      </Drawer>

      {logoutDialog}
      <AIChatOverlay />
    </Box>
  );
};

export default Layout;
