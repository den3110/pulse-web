import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { getTheme } from "../theme";

type ThemeMode = "dark" | "light";
type SidebarPosition = "left" | "right";
type MobileLayout = "drawer" | "bottom";
export type InterfaceMode = "developer" | "enduser";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  sidebarPosition: SidebarPosition;
  setSidebarPosition: (pos: SidebarPosition) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  mobileLayout: MobileLayout;
  setMobileLayout: (layout: MobileLayout) => void;
  interfaceMode: InterfaceMode;
  setInterfaceMode: (mode: InterfaceMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  toggleTheme: () => {},
  sidebarPosition: "left",
  setSidebarPosition: () => {},
  primaryColor: "#f97316",
  setPrimaryColor: () => {},
  mobileLayout: "drawer",
  setMobileLayout: () => {},
  interfaceMode: "developer",
  setInterfaceMode: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem("themeMode") as ThemeMode) || "dark";
  });

  const [sidebarPosition, setSidebarPosition] = useState<SidebarPosition>(
    () => {
      return (
        (localStorage.getItem("sidebarPosition") as SidebarPosition) || "left"
      );
    },
  );

  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    return localStorage.getItem("primaryColor") || "#f97316";
  });

  const [mobileLayout, setMobileLayout] = useState<MobileLayout>(() => {
    return (localStorage.getItem("mobileLayout") as MobileLayout) || "drawer";
  });

  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>(() => {
    return (
      (localStorage.getItem("interfaceMode") as InterfaceMode) || "developer"
    );
  });

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("sidebarPosition", sidebarPosition);
  }, [sidebarPosition]);

  useEffect(() => {
    localStorage.setItem("primaryColor", primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    localStorage.setItem("mobileLayout", mobileLayout);
  }, [mobileLayout]);

  useEffect(() => {
    localStorage.setItem("interfaceMode", interfaceMode);
  }, [interfaceMode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const theme = useMemo(
    () => getTheme(mode, primaryColor),
    [mode, primaryColor],
  );

  return (
    <ThemeContext.Provider
      value={{
        mode,
        toggleTheme,
        sidebarPosition,
        setSidebarPosition,
        primaryColor,
        setPrimaryColor,
        mobileLayout,
        setMobileLayout,
        interfaceMode,
        setInterfaceMode,
      }}
    >
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
