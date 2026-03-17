import React, { useEffect, useRef } from "react";
import { Box, useTheme } from "@mui/material";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { getSocket, connectSocket } from "../services/socket";

interface RemoteTerminalProps {
  serverId: string;
  deployPath: string;
  termId: number; // Added unique ID for multiplexing
}

const RemoteTerminal: React.FC<RemoteTerminalProps> = ({
  serverId,
  deployPath,
  termId,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const theme = useTheme();
  // Ensure socket is available
  const socket = getSocket() || connectSocket();

  useEffect(() => {
    if (!terminalRef.current || !serverId || !socket) return;

    // Dispose old terminal if exists
    if (xtermRef.current) {
      xtermRef.current.dispose();
    }

    const isDark = theme.palette.mode === "dark";
    const term = new Terminal({
      cursorBlink: true,
      fontFamily:
        "Consolas, 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: {
        background: theme.palette.background.paper,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.primary.main,
        selectionBackground: theme.palette.primary.light,
        black: isDark ? "#000000" : "#ffffff",
        red: isDark ? "#cd3131" : "#cd3131",
        green: isDark ? "#0dbc79" : "#008000",
        yellow: isDark ? "#e5e510" : "#b58900",
        blue: isDark ? "#2472c8" : "#268bd2",
        magenta: isDark ? "#bc3fbc" : "#d33682",
        cyan: isDark ? "#11a8cd" : "#2aa198",
        white: isDark ? "#e5e5e5" : "#000000",
        brightBlack: isDark ? "#666666" : "#808080",
        brightRed: isDark ? "#f14c4c" : "#cb4b16",
        brightGreen: isDark ? "#23d18b" : "#586e75",
        brightYellow: isDark ? "#f5f543" : "#657b83",
        brightBlue: isDark ? "#3b8eea" : "#839496",
        brightMagenta: isDark ? "#d670d6" : "#6c71c4",
        brightCyan: isDark ? "#29b8db" : "#93a1a1",
        brightWhite: isDark ? "#e5e5e5" : "#073642",
      },
      allowProposedApi: true,
      overviewRulerWidth: 8,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    try {
      fitAddon.fit();
    } catch (e) {
      console.warn("Fit error", e);
    }

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    socket.emit("terminal:start", {
      serverId,
      termId, // Send ID
      rows: term.rows,
      cols: term.cols,
    });

    const handleOutput = (data: { termId: number; data: string } | string) => {
      // Support both old format (string) and new format object
      if (typeof data === "string") {
        return;
      }
      if (data.termId === termId) {
        term.write(data.data);
      }
    };

    const handleExit = (data?: { termId: number }) => {
      // If data is undefined (legacy) or matches termId
      if (!data || data.termId === termId) {
        term.write("\r\n\x1b[31m[Process exited]\x1b[0m\r\n");
      }
    };

    const handleReady = (data: { termId: number }) => {
      if (data.termId === termId && deployPath) {
        socket.emit("terminal:data", { termId, data: `cd "${deployPath}"\r` });
        term.focus();
      }
    };

    socket.on("terminal:output", handleOutput);
    socket.on("terminal:exit", handleExit);
    socket.on("terminal:ready", handleReady);

    term.onData((data) => {
      socket.emit("terminal:data", { termId, data });
    });

    // Resize handler
    const handleResize = () => {
      try {
        fitAddon.fit();
        if (term.rows > 0 && term.cols > 0) {
          socket.emit("terminal:resize", {
            termId,
            rows: term.rows,
            cols: term.cols,
          });
        }
      } catch (e) {}
    };
    window.addEventListener("resize", handleResize);

    return () => {
      socket.off("terminal:output", handleOutput);
      socket.off("terminal:exit", handleExit);
      socket.off("terminal:ready", handleReady);
      window.removeEventListener("resize", handleResize);
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      // Emit terminal:close to backend to clean up specific stream
      socket.emit("terminal:close", { termId });
    };
  }, [serverId, termId]); // Removed deployPath from dependency to avoid re-triggering logic incorrectly, though it's used inside handleReady.
  // Actually, deployPath is needed in handleReady closure.
  // But handleReady is defined inside useEffect which depends on [serverId, termId].
  // If deployPath changes, we might want to re-run?
  // Usually RemoteTerminal is re-mounted if key changes or props change significantly?
  // TerminalTabs passes session.path.
  // If path changes for SAME session (is that possible?), we might want to cd.
  // But usually tabs are static.
  // If we mistakenly omitted deployPath, `handleReady` closes over old value? Yes.
  // Adding `deployPath` to deps means RE-CREATING terminal if path changes.
  // That seems correct (new/reset terminal).
  // So kept `[serverId, termId]` - assumes termId changes if we want new session, or we don't support live path changing without remount.
  // In TerminalTabs, `termId` is fixed for a tab, but `path` is from session state.
  // If we change path of a tab? Usage shows path is part of session creation.
  // So likely fine.

  // Sync xterm theme when React Material UI theme changes
  useEffect(() => {
    if (xtermRef.current) {
      const isDark = theme.palette.mode === "dark";
      xtermRef.current.options.theme = {
        background: theme.palette.background.paper,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.primary.main,
        selectionBackground: theme.palette.primary.light,
        black: isDark ? "#000000" : "#ffffff",
        red: isDark ? "#cd3131" : "#cd3131",
        green: isDark ? "#0dbc79" : "#008000",
        yellow: isDark ? "#e5e510" : "#b58900",
        blue: isDark ? "#2472c8" : "#268bd2",
        magenta: isDark ? "#bc3fbc" : "#d33682",
        cyan: isDark ? "#11a8cd" : "#2aa198",
        white: isDark ? "#e5e5e5" : "#000000",
        brightBlack: isDark ? "#666666" : "#808080",
        brightRed: isDark ? "#f14c4c" : "#cb4b16",
        brightGreen: isDark ? "#23d18b" : "#586e75",
        brightYellow: isDark ? "#f5f543" : "#657b83",
        brightBlue: isDark ? "#3b8eea" : "#839496",
        brightMagenta: isDark ? "#d670d6" : "#6c71c4",
        brightCyan: isDark ? "#29b8db" : "#93a1a1",
        brightWhite: isDark ? "#e5e5e5" : "#073642",
      };
    }
  }, [
    theme.palette.mode,
    theme.palette.background.paper,
    theme.palette.text.primary,
    theme.palette.primary.main,
    theme.palette.primary.light,
  ]);

  // ResizeObserver for container resize (e.g. opening/closing drawer)
  useEffect(() => {
    const elem = terminalRef.current;
    if (!elem) return;

    const observer = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          // Skip resizing when the container is hidden (display: none)
          // to prevent xterm from collapsing to 2 columns and breaking text reflow
          if (elem.clientWidth === 0 || elem.clientHeight === 0) return;
          fitAddonRef.current.fit();
          const { rows, cols } = xtermRef.current;
          if (rows > 0 && cols > 0) {
            socket?.emit("terminal:resize", { termId, rows, cols });
          }
        } catch (e) {}
      }
    });
    observer.observe(elem);
    return () => observer.disconnect();
  }, [termId]);

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        bgcolor: "background.paper",
        pl: 1, // Add internal padding
        pb: 1,
        "& .xterm-viewport": {
          overflowY: "auto !important",
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "background.paper",
          },
          "&::-webkit-scrollbar-thumb": {
            background: theme.palette.mode === "dark" ? "#424242" : "#c1c1c1",
            borderRadius: "4px",
            "&:hover": {
              background: theme.palette.mode === "dark" ? "#555" : "#a8a8a8",
            },
          },
          "&::-webkit-scrollbar-corner": {
            background: "background.paper",
          },
        },
        "& .xterm-screen": {
          padding: "4px 0 0 4px", // Minor padding for text
        },
      }}
    >
      <div ref={terminalRef} style={{ height: "100%", width: "100%" }} />
    </Box>
  );
};

export default RemoteTerminal;
