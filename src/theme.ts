import { createTheme, Theme, alpha } from "@mui/material/styles";

export function getTheme(
  mode: "dark" | "light",
  primaryColor: string = "#f97316",
): Theme {
  const isDark = mode === "dark";

  /* ── Derived palette helpers ── */
  const paperBg = isDark ? "#0f1419" : "#ffffff";
  const defaultBg = isDark ? "#080b12" : "#f4f6f9";
  const surfaceBg = isDark
    ? "rgba(255, 255, 255, 0.03)"
    : "rgba(0, 0, 0, 0.02)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.07)"
    : "rgba(0, 0, 0, 0.08)";
  const hoverBorder = isDark
    ? "rgba(255, 255, 255, 0.14)"
    : "rgba(0, 0, 0, 0.14)";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor,
      },
      secondary: {
        main: isDark ? "#a78bfa" : "#7c3aed", // violet accent
        light: "#c4b5fd",
        dark: "#6d28d9",
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
      info: {
        main: "#3b82f6",
        light: "#60a5fa",
        dark: "#2563eb",
      },
      background: {
        default: defaultBg,
        paper: paperBg,
      },
      text: {
        primary: isDark ? "#f1f5f9" : "#0f172a",
        secondary: isDark ? "#8b95a5" : "#64748b",
      },
      divider: borderColor,
    },

    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      h1: { fontWeight: 800, letterSpacing: "-0.025em" },
      h2: { fontWeight: 700, letterSpacing: "-0.025em" },
      h3: { fontWeight: 700, letterSpacing: "-0.02em" },
      h4: { fontWeight: 700, letterSpacing: "-0.015em" },
      h5: { fontWeight: 600, letterSpacing: "-0.01em" },
      h6: { fontWeight: 600, letterSpacing: "-0.01em" },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600 },
      body1: { lineHeight: 1.7 },
      body2: { lineHeight: 1.65 },
      button: { fontWeight: 600 },
    },

    shape: {
      borderRadius: 12,
    },

    components: {
      /* ── Global baseline ── */
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            /* CSS custom properties for ad-hoc usage */
            "--overlay-light": isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.03)",
            "--overlay-hover": isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.05)",
            "--terminal-bg": isDark ? "#0a0d14" : "#f8fafc",
            "--terminal-text": isDark ? "#e2e8f0" : "#1e293b",
            "--appbar-bg": isDark
              ? "rgba(8, 11, 18, 0.72)"
              : "rgba(255, 255, 255, 0.72)",
            "--card-shadow": isDark
              ? "0 4px 24px rgba(0,0,0,0.4)"
              : "0 4px 24px rgba(0,0,0,0.06)",
            "--border-color": borderColor,
            "--surface-bg": surfaceBg,
            "--primary-main": primaryColor,
            "--secondary-main": isDark ? "#a78bfa" : "#7c3aed",
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

            /* Layered ambient background */
            backgroundImage: isDark
              ? `
              radial-gradient(ellipse 80% 60% at 10% 10%, ${alpha(primaryColor, 0.07)} 0%, transparent 55%),
              radial-gradient(ellipse 60% 50% at 90% 90%, ${alpha("#a78bfa", 0.05)} 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 50% 50%, ${alpha(primaryColor, 0.03)} 0%, transparent 40%)
            `
              : `
              radial-gradient(ellipse 80% 60% at 10% 10%, ${alpha(primaryColor, 0.04)} 0%, transparent 55%),
              radial-gradient(ellipse 60% 50% at 90% 90%, ${alpha("#7c3aed", 0.03)} 0%, transparent 55%)
            `,
            backgroundAttachment: "fixed",
          },
        },
      },

      /* ── Buttons ── */
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none" as const,
            fontWeight: 600,
            borderRadius: 10,
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:active": {
              transform: "scale(0.97)",
            },
          },
          containedPrimary: {
            background: `linear-gradient(135deg, ${primaryColor}, ${alpha(primaryColor, 0.85)})`,
            boxShadow: `0 2px 12px ${alpha(primaryColor, 0.35)}`,
            "&:hover": {
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor})`,
              boxShadow: `0 4px 20px ${alpha(primaryColor, 0.45)}`,
              transform: "translateY(-1px)",
            },
          },
          outlined: {
            borderColor: borderColor,
            "&:hover": {
              borderColor: hoverBorder,
              backgroundColor: surfaceBg,
            },
          },
        },
      },

      /* ── Paper ── */
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: `1px solid ${borderColor}`,
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          },
        },
      },

      /* ── Cards ── */
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: isDark
              ? "rgba(15, 20, 25, 0.8)"
              : "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${borderColor}`,
            boxShadow: isDark
              ? "0 4px 24px rgba(0,0,0,0.3)"
              : "0 1px 8px rgba(0,0,0,0.04)",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              borderColor: alpha(primaryColor, 0.25),
              boxShadow: isDark
                ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${alpha(primaryColor, 0.1)}`
                : `0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px ${alpha(primaryColor, 0.1)}`,
            },
          },
        },
      },

      /* ── Inputs ── */
      MuiTextField: {
        defaultProps: {
          variant: "outlined" as const,
          size: "small" as const,
          fullWidth: true,
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: "box-shadow 0.2s ease",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: hoverBorder,
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(primaryColor, 0.15)}`,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: primaryColor,
              borderWidth: 1.5,
            },
          },
          notchedOutline: {
            borderColor: borderColor,
            transition: "border-color 0.2s ease",
          },
        },
      },

      /* ── Chips ── */
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            fontSize: "0.75rem",
            borderRadius: 8,
          },
          outlined: {
            borderColor: borderColor,
          },
        },
      },

      /* ── Tables ── */
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 0.15s ease",
            "&.MuiTableRow-hover:hover": {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.04)"
                : "rgba(0, 0, 0, 0.02)",
            },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            "& .MuiTableCell-head": {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(0, 0, 0, 0.02)",
              fontWeight: 600,
              fontSize: "0.75rem",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
              color: isDark ? "#8b95a5" : "#64748b",
              borderBottom: `1px solid ${borderColor}`,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
          },
        },
      },

      /* ── Dialogs ── */
      MuiDialog: {
        defaultProps: {
          slotProps: {
            backdrop: {
              sx: {
                backgroundColor: isDark
                  ? "rgba(0, 0, 0, 0.6)"
                  : "rgba(0, 0, 0, 0.3)",
                backdropFilter: "blur(4px)",
              },
            },
          },
        },
        styleOverrides: {
          paper: {
            borderRadius: 20,
            border: `1px solid ${borderColor}`,
            backgroundColor: isDark
              ? "rgba(15, 20, 25, 0.95)"
              : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(24px)",
            boxShadow: isDark
              ? `0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px ${alpha(primaryColor, 0.08)}`
              : "0 24px 48px rgba(0,0,0,0.12)",
          },
        },
      },

      /* ── Drawers ── */
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark
              ? "rgba(15, 20, 25, 0.95)"
              : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            borderRight: `1px solid ${borderColor}`,
          },
        },
      },

      /* ── ListItemButton ── */
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            transition: "background 0.1s ease",
            "&.Mui-selected": {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.06)",
            },
            "&.Mui-selected:hover": {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.08)",
            },
            "&:hover": {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.04)",
            },
          },
        },
      },

      /* ── Tabs ── */
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none" as const,
            fontWeight: 600,
            fontSize: "0.875rem",
            minHeight: 42,
            transition: "color 0.2s ease",
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 2.5,
            borderRadius: 2,
            backgroundColor: primaryColor,
            boxShadow: `0 0 8px ${alpha(primaryColor, 0.5)}`,
          },
        },
      },

      /* ── Tooltips ── */
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark
              ? "rgba(20, 25, 35, 0.95)"
              : "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 8,
            fontSize: "0.75rem",
            fontWeight: 500,
            padding: "6px 12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          },
          arrow: {
            color: isDark ? "rgba(20, 25, 35, 0.95)" : "rgba(15, 23, 42, 0.92)",
          },
        },
      },

      /* ── Skeleton ── */
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.06)",
          },
        },
      },

      /* ── AppBar ── */
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },

      /* ── Menu / Popover ── */
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark
              ? "rgba(15, 20, 25, 0.95)"
              : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${borderColor}`,
            boxShadow: isDark
              ? "0 12px 40px rgba(0,0,0,0.5)"
              : "0 8px 32px rgba(0,0,0,0.1)",
            borderRadius: 12,
          },
        },
      },

      /* ── Switches ── */
      MuiSwitch: {
        styleOverrides: {
          root: {
            "& .MuiSwitch-switchBase.Mui-checked": {
              color: primaryColor,
              "& + .MuiSwitch-track": {
                backgroundColor: primaryColor,
                opacity: 0.5,
              },
            },
          },
        },
      },

      /* ── Alert ── */
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backdropFilter: "blur(8px)",
          },
        },
      },

      /* ── Divider ── */
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: borderColor,
          },
        },
      },

      /* ── Badge ── */
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: 700,
            fontSize: "0.65rem",
          },
        },
      },

      /* ── Breadcrumbs ── */
      MuiBreadcrumbs: {
        styleOverrides: {
          separator: {
            color: isDark ? "#4b5563" : "#9ca3af",
          },
        },
      },

      /* ── LinearProgress ── */
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
          },
          bar: {
            borderRadius: 4,
          },
        },
      },
    },
  });
}

// Default export for backward compatibility
const theme = getTheme("dark", "#f97316");
export default theme;
