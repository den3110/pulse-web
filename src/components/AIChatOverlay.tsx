import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Box,
  Fab,
  Drawer,
  Typography,
  TextField,
  IconButton,
  Button,
  CircularProgress,
  Chip,
  useTheme,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: {
    type: string;
    projectId: string;
    projectName: string;
  };
}

const AIChatOverlay: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        '🤖 Hi! I\'m your Pulse AI assistant. Ask me about your servers, projects, or deployments. Try "help" for commands.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const { data } = await api.post("/ai/chat", { message: userMsg });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          action: data.action || undefined,
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: Message["action"]) => {
    if (!action) return;
    setLoading(true);
    try {
      const { data } = await api.post("/ai/execute", action);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ ${data.message}\n\nNavigating to deployment detail...`,
        },
      ]);
      toast.success("Deployment started!");
      setTimeout(() => {
        navigate(`/projects/${action.projectId}/deploy`);
      }, 1500);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Failed: ${error.response?.data?.message || "Unknown error"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render markdown-lite (bold only)
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {/* FAB */}
      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{
          position: "fixed",
          bottom: { xs: 80, md: 24 },
          right: 24,
          zIndex: 1200,
          width: 52,
          height: 52,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          boxShadow: `0 4px 20px ${theme.palette.primary.main}50`,
          "&:hover": {
            transform: "scale(1.1)",
          },
          transition: "transform 0.2s",
        }}
      >
        <SmartToyIcon />
      </Fab>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          zIndex: 1300,
          "& .MuiDrawer-paper": {
            width: { xs: "100%", sm: 400 },
            borderLeft: "none",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid",
              borderColor: "divider",
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.primary.dark}10)`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SmartToyIcon color="primary" />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Pulse AI
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Your deployment assistant
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            ref={scrollRef}
            sx={{
              flex: 1,
              overflow: "auto",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <Box
                  sx={{
                    maxWidth: "85%",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor:
                      msg.role === "user"
                        ? "primary.main"
                        : isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.04)",
                    color: msg.role === "user" ? "#fff" : "text.primary",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {renderContent(msg.content)}

                  {/* Action button */}
                  {msg.action && (
                    <Box sx={{ mt: 1.5 }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<RocketLaunchIcon />}
                        onClick={() => executeAction(msg.action)}
                        disabled={loading}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        Deploy {msg.action.projectName}
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}

            {loading && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1,
                }}
              >
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Thinking...
                </Typography>
              </Box>
            )}
          </Box>

          {/* Quick Actions */}
          <Box
            sx={{
              px: 2,
              py: 0.5,
              display: "flex",
              gap: 0.5,
              flexWrap: "wrap",
            }}
          >
            {["List servers", "Show CPU", "Recent deploys", "Help"].map((q) => (
              <Chip
                key={q}
                label={q}
                size="small"
                variant="outlined"
                onClick={() => {
                  setInput(q);
                  setTimeout(() => {
                    setInput(q);
                    sendMessage();
                  }, 50);
                }}
                sx={{
                  fontSize: 10,
                  height: 24,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              />
            ))}
          </Box>

          {/* Input */}
          <Box
            sx={{
              p: 2,
              borderTop: "1px solid",
              borderColor: "divider",
              display: "flex",
              gap: 1,
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              sx={{
                bgcolor: "primary.main",
                color: "#fff",
                "&:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": {
                  bgcolor: "action.disabledBackground",
                },
                width: 40,
                height: 40,
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default AIChatOverlay;
