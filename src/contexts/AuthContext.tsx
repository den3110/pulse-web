import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api, { setForceLogoutHandler } from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  activeServer?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    disconnectSocket();
  }, []);

  // Register force-logout handler so api interceptor can trigger React-level logout
  useEffect(() => {
    setForceLogoutHandler(() => {
      logout();
    });
  }, [logout]);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      connectSocket();
    } catch {
      // Interceptor already handles token cleanup + logout
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Proactive Token Refresh (Every 5 minutes)
  useEffect(() => {
    if (!user) return;

    const refreshSession = async () => {
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) return;

        // Use plain axios or fetch to avoiding interceptor issues if needed,
        // but api instance is fine as long as we handle errors.
        // Using api instance:
        const { data } = await api.post("/auth/refresh", { refreshToken });

        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        console.log("[Auth] Session refreshed proactively");
      } catch (error) {
        console.warn("[Auth] Proactive refresh failed", error);
        // Do not force logout here, let normal expiration handle it if needed
      }
    };

    const interval = setInterval(refreshSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    connectSocket();
  };

  const register = async (
    username: string,
    email: string,
    password: string,
  ) => {
    const { data } = await api.post("/auth/register", {
      username,
      email,
      password,
    });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    connectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
