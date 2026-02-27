import { createTheme, Theme, alpha } from "@mui/material/styles";

export function getTheme(
  mode: "dark" | "light",
  primaryColor: string = "#f97316",
): Theme {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor,
        // Let MUI generate light/dark automatically or we can manually lighten/darken
      },
      secondary: {
        main: "#fb923c",
        light: "#fdba74",
        dark: "#f97316",
      },
      success: {
        main: "#10b981",
        light: "#34d399",
        dark: "#059669",
      },
      warning: {
        main: "#f59e0b",
        light: "#fbbf24",
        dark: "#d97706",
      },
      error: {
        main: "#ef4444",
        light: "#f87171",
        dark: "#dc2626",
      },
      background: {
        default: isDark ? "#0a0e1a" : "#f5f7fa",
        paper: isDark ? "#111827" : "#ffffff",
      },
      text: {
        primary: isDark ? "#f9fafb" : "#1a1a2e",
        secondary: isDark ? "#9ca3af" : "#6b7280",
      },
      divider: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            // CSS custom properties for theme-aware colors in components
            "--overlay-light": isDark
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.04)",
            "--overlay-hover": isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.06)",
            "--terminal-bg": isDark ? "#0d1117" : "#f6f8fa",
            "--terminal-text": isDark ? "#e6edf3" : "#1f2328",
            "--appbar-bg": isDark
              ? "rgba(10, 14, 26, 0.85)"
              : "rgba(255, 255, 255, 0.85)",
            "--card-shadow": isDark
              ? "0 8px 32px rgba(0,0,0,0.5)"
              : "0 8px 32px rgba(0,0,0,0.08)",
            "--border-color": isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.08)",
            "--primary-main": primaryColor,
            "--secondary-main": "#fb923c",
            "--primary-main-06": alpha(primaryColor, 0.06),
            "--primary-main-08": alpha(primaryColor, 0.08),
            "--primary-main-10": alpha(primaryColor, 0.1),
            "--primary-main-15": alpha(primaryColor, 0.15),
            "--primary-main-20": alpha(primaryColor, 0.2),
            "--primary-main-25": alpha(primaryColor, 0.25),
            "--primary-main-30": alpha(primaryColor, 0.3),
            "--primary-main-35": alpha(primaryColor, 0.35),
            "--primary-main-40": alpha(primaryColor, 0.4),
            "--primary-main-70": alpha(primaryColor, 0.7),
            backgroundImage: isDark
              ? `
              radial-gradient(ellipse at 20% 20%, ${alpha(primaryColor, 0.08)} 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, ${alpha(primaryColor, 0.06)} 0%, transparent 50%)
            `
              : `
              radial-gradient(ellipse at 20% 20%, ${alpha(primaryColor, 0.04)} 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, ${alpha(primaryColor, 0.03)} 0%, transparent 50%)
            `,
            backgroundAttachment: "fixed",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 10,
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)`, // Simple gradient based on primary
            boxShadow: `0 2px 8px ${primaryColor}4D`, // 30% opacity
            "&:hover": {
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor})`, // darker on hover? or just solid
              boxShadow: `0 4px 16px ${primaryColor}66`, // 40% opacity
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.08)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.08)",
            transition: "all 0.25s ease",
            "&:hover": {
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.15)"
                : "rgba(0, 0, 0, 0.15)",
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: "outlined",
          size: "small",
          fullWidth: true,
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.15)"
                : "rgba(0, 0, 0, 0.15)",
            },
          },
          notchedOutline: {
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.12)",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: "0.75rem",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            border: isDark
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.08)",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: isDark
              ? "1px solid rgba(255, 255, 255, 0.08)"
              : "1px solid rgba(0, 0, 0, 0.08)",
          },
        },
      },
    },
  });
}

// Default export for backward compatibility
const theme = getTheme("dark", "#f97316");
export default theme;
