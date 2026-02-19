import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import TerminalIcon from "@mui/icons-material/Terminal";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import RemoteTerminal from "./RemoteTerminal";

interface TerminalTabsProps {
  serverId: string;
  initialPath: string;
  onClose?: () => void;
}

interface TerminalSession {
  id: number;
  title: string;
  path: string;
}

const TerminalTabs: React.FC<TerminalTabsProps> = ({
  serverId,
  initialPath,
  onClose,
}) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([
    { id: 1, title: "Term 1", path: initialPath },
  ]);
  const [activeTab, setActiveTab] = useState(0);
  const [nextId, setNextId] = useState(2);
  const [collapsed, setCollapsed] = useState(false);

  // Better implementation:
  const lastPathRef = React.useRef(initialPath);

  React.useEffect(() => {
    if (initialPath && initialPath !== lastPathRef.current) {
      const newId = nextId;
      setNextId((prev) => prev + 1);
      const title = initialPath.split("/").pop() || "Term";
      const newSession = {
        id: newId,
        title: title === "" ? "/" : title,
        path: initialPath,
      };
      setSessions((prev) => [...prev, newSession]);
      setActiveTab(sessions.length); // sessions.length will be the index of the new tab
      lastPathRef.current = initialPath;
      if (collapsed) setCollapsed(false); // Auto-expand on new request
    }
  }, [initialPath, nextId, sessions.length, collapsed]);

  const addTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSession = {
      id: nextId,
      title: `Term ${nextId}`,
      path: initialPath,
    };
    setSessions([...sessions, newSession]);
    setNextId(nextId + 1);
    setActiveTab(sessions.length); // Switch to new tab
  };

  const closeTab = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      if (onClose) onClose();
      return;
    }

    const newSessions = sessions.filter((_, i) => i !== index);
    setSessions(newSessions);

    // Adjust active tab
    if (activeTab >= index && activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: collapsed ? "auto" : "100%",
        bgcolor: "#1e1e1e",
        transition: "height 0.3s ease",
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Header / Toggle */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.1)",
          bgcolor: "#252526", // VS Code-like header
          cursor: "pointer",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TerminalIcon sx={{ fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight={600}>
            TERMINAL
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
          >
            {collapsed ? (
              <KeyboardArrowUpIcon sx={{ fontSize: 20 }} />
            ) : (
              <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />
            )}
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              if (onClose) onClose();
            }}
            sx={{ color: "error.main" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Tabbed Content */}
      <Box
        sx={{
          flex: 1,
          display: collapsed ? "none" : "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "#252526",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 32,
              "& .MuiTab-root": {
                minHeight: 32,
                textTransform: "none",
                minWidth: 80,
                py: 0,
                fontSize: "0.8rem",
                color: "text.secondary",
                "&.Mui-selected": { color: "text.primary", bgcolor: "#1e1e1e" },
              },
              "& .MuiTabs-indicator": { bgcolor: "primary.main" },
            }}
          >
            {sessions.map((session, index) => (
              <Tab
                key={session.id}
                label={
                  <Box
                    component="span"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    {session.title}
                    {sessions.length > 1 && (
                      <CloseIcon
                        sx={{
                          fontSize: 14,
                          opacity: 0.6,
                          "&:hover": { opacity: 1 },
                        }}
                        onClick={(e) => closeTab(e, index)}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
          <IconButton size="small" onClick={addTab} sx={{ mx: 1 }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, p: 0, overflow: "hidden", position: "relative" }}>
          {sessions.map((session, index) => (
            <Box
              key={session.id}
              role="tabpanel"
              hidden={activeTab !== index}
              sx={{
                display: activeTab === index ? "block" : "none",
                height: "100%",
                width: "100%",
              }}
            >
              <RemoteTerminal
                serverId={serverId}
                deployPath={session.path || initialPath}
                termId={session.id}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default TerminalTabs;
