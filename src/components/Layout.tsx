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
import NotificationCenter from "./NotificationCenter";
import { useThemeMode } from "../contexts/ThemeContext";
import ServerSelector from "./ServerSelector";

const DRAWER_WIDTH = 260;

const navItems = [
  { labelKey: "nav.dashboard", icon: <DashboardIcon />, path: "/" },
  { labelKey: "nav.servers", icon: <DnsIcon />, path: "/servers" },
  { labelKey: "nav.projects", icon: <FolderIcon />, path: "/projects" },
  { labelKey: "nav.nginx", icon: <LanguageIcon />, path: "/nginx" },
  { labelKey: "nav.pm2", icon: <TerminalIcon />, path: "/pm2" },
  { labelKey: "nav.ftp", icon: <SnippetFolderIcon />, path: "/ftp" },
  { labelKey: "nav.ports", icon: <LanIcon />, path: "/ports" },
  { labelKey: "nav.cron", icon: <AccessTimeIcon />, path: "/cron" },
  { labelKey: "nav.database", icon: <StorageIcon />, path: "/database" },
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
  const { mode, toggleTheme, sidebarPosition, mobileLayout } = useThemeMode();
  const isDark = mode === "dark";
  const { i18n, t } = useTranslation();
  const theme = useTheme();

  const toggleLang = () => {
    const next = i18n.language === "en" ? "vi" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
  };

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
                bgcolor: "rgba(99, 102, 241, 0.15)",
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
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<LanguageIcon />}
            onClick={toggleLang}
            fullWidth
            sx={{
              justifyContent: "flex-start",
              color: "text.primary",
              borderColor: "divider",
            }}
          >
            {i18n.language === "en" ? "Tiếng Việt" : "English"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            onClick={toggleTheme}
            fullWidth
            sx={{
              justifyContent: "flex-start",
              color: "text.primary",
              borderColor: "divider",
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
        minHeight: "100vh",
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
          overflowX: "hidden",
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
          sx={{ p: { xs: 2, md: 4 }, mt: 8, overflow: "hidden" }}
        >
          <Outlet />
        </Box>
      </Box>

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
    </Box>
  );
};

export default Layout;
