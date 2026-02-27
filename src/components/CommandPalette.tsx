import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  Box,
  InputBase,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  alpha,
  useTheme,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import SecurityIcon from "@mui/icons-material/Security";
import TimelineIcon from "@mui/icons-material/Timeline";
import LanIcon from "@mui/icons-material/Lan";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import StorageIcon from "@mui/icons-material/Storage";
import BuildIcon from "@mui/icons-material/Build";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LogoutIcon from "@mui/icons-material/Logout";
import api from "../services/api";
import { useThemeMode } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  type: "server" | "project" | "route" | "action";
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  path?: string;
  keywords?: string[];
  onSelect?: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { toggleTheme } = useThemeMode();
  const { logout } = useAuth();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [servers, setServers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Fetch dynamic data when palette opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);

      // Auto-focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      const fetchData = async () => {
        try {
          const [serversRes, projectsRes] = await Promise.all([
            api.get("/servers"),
            api.get("/projects"),
          ]);
          setServers(serversRes.data || []);
          setProjects(projectsRes.data || []);
        } catch (error) {
          console.error("Failed to fetch data for command palette", error);
        }
      };

      fetchData();
    }
  }, [open]);

  // Static routes and actions
  const staticItems: SearchItem[] = useMemo(
    () => [
      {
        id: "route-dashboard",
        type: "route",
        label: t("navigation.dashboard", "Dashboard"),
        path: "/",
        icon: <TimelineIcon />,
        keywords: ["home", "main", "stats"],
      },
      {
        id: "route-servers",
        type: "route",
        label: t("navigation.servers", "Servers"),
        path: "/servers",
        icon: <StorageIcon />,
        keywords: ["vps", "host", "machine", "manage servers"],
      },
      {
        id: "route-projects",
        type: "route",
        label: t("navigation.projects", "Projects"),
        path: "/projects",
        icon: <AccountTreeIcon />,
        keywords: ["app", "deployment", "manage projects"],
      },
      {
        id: "route-infra",
        type: "route",
        label: t("navigation.infrastructureMap", "Infrastructure Map"),
        path: "/infrastructure",
        icon: <LanIcon />,
        keywords: ["map", "topology", "network", "diagram"],
      },
      {
        id: "route-vpn",
        type: "route",
        label: t("navigation.vpnManager", "VPN Manager"),
        path: "/vpn",
        icon: <SecurityIcon />,
        keywords: ["wireguard", "network", "secure"],
      },
      {
        id: "route-secrets",
        type: "route",
        label: t("navigation.secretVault", "Secret Vault"),
        path: "/secrets",
        icon: <VpnKeyIcon />,
        keywords: ["env", "variables", "passwords", "keys"],
      },
      {
        id: "route-docker",
        type: "route",
        label: t("navigation.dockerManager", "Docker Manager"),
        path: "/docker",
        icon: <DirectionsBoatIcon />,
        keywords: ["containers", "images", "docker"],
      },
      {
        id: "route-database",
        type: "route",
        label: t("navigation.databaseManager", "Database Studio"),
        path: "/database",
        icon: <StorageIcon />,
        keywords: ["sql", "mongo", "redis", "db"],
      },
      {
        id: "route-pipelines",
        type: "route",
        label: t("navigation.pipelineBuilder", "CI/CD Pipelines"),
        path: "/pipelines",
        icon: <BuildIcon />,
        keywords: ["ci", "cd", "build", "automate"],
      },
      {
        id: "route-settings",
        type: "route",
        label: t("navigation.settings", "Settings"),
        path: "/settings",
        icon: <SettingsIcon />,
        keywords: ["config", "preferences", "account", "profile"],
      },
      {
        id: "action-add-server",
        type: "action",
        label: t("servers.add", "Add Server"),
        path: "/servers?add=true",
        icon: <StorageIcon />,
        keywords: ["new server", "create server"],
      },
      {
        id: "action-add-project",
        type: "action",
        label: t("projects.add", "Add Project"),
        path: "/projects?add=true",
        icon: <AccountTreeIcon />,
        keywords: ["new project", "create project", "deploy"],
      },
      {
        id: "action-theme",
        type: "action",
        label: "Toggle Theme",
        icon: <DarkModeIcon />,
        keywords: ["dark", "light", "mode", "color"],
        onSelect: () => toggleTheme(),
      },
      {
        id: "action-logout",
        type: "action",
        label: "Sign Out",
        icon: <LogoutIcon />,
        keywords: ["quit", "exit", "logout"],
        onSelect: () => logout(),
      },
    ],
    [t, toggleTheme, logout],
  );

  // Combine static and dynamic items
  const allItems: SearchItem[] = useMemo(() => {
    const dynamicServers: SearchItem[] = servers.map((s) => ({
      id: `server-${s._id}`,
      type: "server",
      label: s.name,
      subLabel: s.host,
      path: `/servers/${s._id}`,
      icon: <StorageIcon />,
    }));

    const dynamicProjects: SearchItem[] = projects.map((p) => ({
      id: `project-${p._id}`,
      type: "project",
      label: p.name,
      subLabel: p.server?.name || "No Server",
      path: `/projects/${p._id}/deploy`,
      icon: <AccountTreeIcon />,
    }));

    return [...staticItems, ...dynamicServers, ...dynamicProjects];
  }, [staticItems, servers, projects]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query) return staticItems.slice(0, 8); // Show first 8 default routes when empty

    const lowerQuery = query.toLowerCase();
    return allItems
      .filter((item) => {
        const matchLabel = item.label.toLowerCase().includes(lowerQuery);
        const matchSubLabel = item.subLabel?.toLowerCase().includes(lowerQuery);
        const matchKeywords = item.keywords?.some((k) =>
          k.toLowerCase().includes(lowerQuery),
        );
        return matchLabel || matchSubLabel || matchKeywords;
      })
      .slice(0, 10); // Max 10 results
  }, [allItems, query, staticItems]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selectedItem = filteredItems[selectedIndex];
        if (selectedItem) {
          if (selectedItem.onSelect) {
            selectedItem.onSelect();
          } else if (selectedItem.path) {
            navigate(selectedItem.path);
          }
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredItems, selectedIndex, navigate, onClose]);

  // Keep selected item in view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Helper for rendering badges
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "server":
        return (
          <Chip
            size="small"
            label="Server"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }}
          />
        );
      case "project":
        return (
          <Chip
            size="small"
            label="Project"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              color: theme.palette.secondary.main,
            }}
          />
        );
      case "action":
        return (
          <Chip
            size="small"
            label="Action"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              bgcolor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.main,
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: isDark ? "background.paper" : "#ffffff",
          backgroundImage: "none",
          borderRadius: 3,
          boxShadow: isDark
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          m: 2,
          alignSelf: "flex-start",
          mt: "15vh",
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(4px)",
            backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(15,23,42,0.4)",
          },
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", p: 2 }}>
        <SearchIcon sx={{ color: "text.secondary", mr: 2, fontSize: 28 }} />
        <InputBase
          inputRef={inputRef}
          placeholder={t(
            "common.searchPlaceholder",
            "Search projects, servers, actions...",
          )}
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{
            fontSize: "1.2rem",
            color: "text.primary",
            "& input::placeholder": {
              color: "text.disabled",
              opacity: 1,
            },
          }}
        />
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Chip
            size="small"
            label="ESC"
            sx={{
              borderRadius: 1,
              fontSize: "0.65rem",
              height: 20,
              bgcolor: "action.hover",
            }}
          />
        </Box>
      </Box>

      {filteredItems.length > 0 && <Divider />}

      <List
        ref={listRef}
        sx={{
          maxHeight: 400,
          overflow: "auto",
          p: 1,
          "&::-webkit-scrollbar": { width: 8 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "divider",
            borderRadius: 4,
          },
        }}
      >
        {filteredItems.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              {t("common.noResultsFound", "No results found for")} "{query}"
            </Typography>
          </Box>
        ) : (
          filteredItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <ListItem
                key={item.id}
                onClick={() => {
                  if (item.onSelect) {
                    item.onSelect();
                  } else if (item.path) {
                    navigate(item.path);
                  }
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  cursor: "pointer",
                  bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, 0.1)
                    : "transparent",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isSelected ? "primary.main" : "text.secondary",
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body1"
                        fontWeight={isSelected ? 600 : 400}
                        color={isSelected ? "primary.main" : "text.primary"}
                      >
                        {item.label}
                      </Typography>
                      {getTypeBadge(item.type)}
                    </Box>
                  }
                  secondary={item.subLabel}
                  secondaryTypographyProps={{
                    variant: "caption",
                    fontFamily:
                      item.type === "server"
                        ? "'JetBrains Mono', monospace"
                        : "inherit",
                  }}
                />

                {isSelected && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: { xs: "none", sm: "block" } }}
                  >
                    Press Enter to select
                  </Typography>
                )}
              </ListItem>
            );
          })
        )}
      </List>

      <Box
        sx={{
          p: 1.5,
          px: 2,
          bgcolor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
          display: "flex",
          alignItems: "center",
          gap: 2,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Navigate
          </Typography>
          <Chip
            size="small"
            label="↑"
            sx={{
              borderRadius: 1,
              fontSize: "0.6rem",
              height: 16,
              minWidth: 20,
            }}
          />
          <Chip
            size="small"
            label="↓"
            sx={{
              borderRadius: 1,
              fontSize: "0.6rem",
              height: 16,
              minWidth: 20,
            }}
          />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Select
          </Typography>
          <Chip
            size="small"
            label="↵"
            sx={{
              borderRadius: 1,
              fontSize: "0.6rem",
              height: 16,
              minWidth: 20,
            }}
          />
        </Box>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
