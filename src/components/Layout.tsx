import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
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
import NotificationCenter from "./NotificationCenter";
import AIChatOverlay from "./AIChatOverlay";
import { useThemeMode } from "../contexts/ThemeContext";
import ServerSelector from "./ServerSelector";
import TeamSwitcher from "./TeamSwitcher";
import CommandPalette from "./CommandPalette";

const DRAWER_WIDTH = 260;

const navItems = [
  { labelKey: "nav.dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  { labelKey: "nav.servers", icon: <DnsIcon />, path: "/servers" },
  { labelKey: "nav.projects", icon: <FolderIcon />, path: "/projects" },
  { labelKey: "nav.nginx", icon: <LanguageIcon />, path: "/nginx" },
  { labelKey: "nav.pm2", icon: <TerminalIcon />, path: "/pm2" },
  { labelKey: "nav.ftp", icon: <SnippetFolderIcon />, path: "/ftp" },
  { labelKey: "nav.ports", icon: <LanIcon />, path: "/ports" },
  { labelKey: "nav.cron", icon: <AccessTimeIcon />, path: "/cron" },
  { labelKey: "nav.database", icon: <StorageIcon />, path: "/database" },
  { labelKey: "nav.docker", icon: <ViewInArIcon />, path: "/docker" },
  {
    labelKey: "nav.infrastructure",
    icon: <AccountTreeIcon />,
    path: "/infrastructure",
  },
  { labelKey: "nav.analytics", icon: <BarChartIcon />, path: "/analytics" },
  { labelKey: "nav.bandwidth", icon: <NetworkCheckIcon />, path: "/bandwidth" },
  { labelKey: "nav.logs", icon: <SubjectIcon />, path: "/logs" },
  { labelKey: "nav.approvals", icon: <GppGoodIcon />, path: "/approvals" },
  { labelKey: "nav.secrets", icon: <VpnKeyIcon />, path: "/secrets" },
  {
    labelKey: "nav.webhookDebug",
    icon: <WebhookIcon />,
    path: "/webhook-debug",
  },
  { labelKey: "nav.testRunner", icon: <ScienceIcon />, path: "/test-runner" },
  { labelKey: "nav.pipelines", icon: <LinearScaleIcon />, path: "/pipelines" },
  { labelKey: "nav.vpn", icon: <VpnLockIcon />, path: "/vpn" },
  { labelKey: "nav.activity", icon: <HistoryIcon />, path: "/activity" },
  { labelKey: "nav.users", icon: <PeopleIcon />, path: "/users" },
  { labelKey: "nav.settings", icon: <SettingsIcon />, path: "/settings" },
];

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { mode, toggleTheme, sidebarPosition, mobileLayout } = useThemeMode();
  const isDark = mode === "dark";
  const { i18n, t } = useTranslation();
  const theme = useTheme();

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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: "primary.main",
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            boxShadow: `0 0 20px ${theme.palette.primary.main}4D`,
          }}
        >
          <RocketLaunchIcon sx={{ fontSize: 20 }} />
        </Avatar>
        <Typography
          variant="h6"
          sx={{
            fontSize: 16,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Pulse
        </Typography>
      </Box>

      <Divider />

      {/* Nav Items */}
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            selected={
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path)
            }
            onClick={() => setMobileOpen(false)}
            sx={{
              borderRadius: 2.5,
              mb: 0.5,
              "&.Mui-selected": {
                bgcolor: "var(--primary-main-15)",
                color: "primary.light",
                "& .MuiListItemIcon-root": { color: "primary.light" },
              },
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={t(item.labelKey)}
              primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
            />
          </ListItemButton>
        ))}
      </List>

      {/* Logout */}
      <List sx={{ px: 1.5 }}>
        <ListItemButton
          onClick={() => setLogoutOpen(true)}
          sx={{
            borderRadius: 2.5,
            "&:hover": { bgcolor: "rgba(239,68,68,0.1)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary={t("auth.logout")}
            primaryTypographyProps={{
              fontSize: 14,
              fontWeight: 500,
              color: "error.main",
            }}
          />
        </ListItemButton>
      </List>

      <Divider />

      {/* User */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: "primary.main",
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {user?.username?.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {user?.username}
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {user?.role}
          </Typography>
        </Box>
      </Box>
      {/* Mobile-only settings in drawer */}
      <Box sx={{ display: { xs: "block", sm: "none" }, px: 2, py: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 600,
            textTransform: "uppercase",
            mb: 1,
            display: "block",
          }}
        >
          {t("settings.appearance")}
        </Typography>
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
            backdropFilter: "blur(20px)",
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
              { labelKey: "nav.dashboard", icon: <DashboardIcon />, path: "/" },
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
