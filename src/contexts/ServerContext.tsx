import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";

export interface Server {
  _id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: "password" | "key";
  status: "online" | "offline" | "unknown";
  lastCheckedAt?: string;
  order?: number;
}

interface ServerContextType {
  servers: Server[];
  selectedServer: Server | null;
  selectServer: (serverId: string) => void;
  loading: boolean;
  refreshServers: () => Promise<void>;
  setServers: React.Dispatch<React.SetStateAction<Server[]>>;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchServers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/servers");
      setServers(data);

      // Auto-select logic
      if (data.length > 0) {
        // 1. Try to use user's active server from backend
        let targetServer = null;
        if (user?.activeServer) {
          targetServer = data.find((s: Server) => s._id === user.activeServer);
        }

        // 2. Fallback: Restore from localStorage if backend doesn't have it
        if (!targetServer) {
          const savedId = localStorage.getItem("selectedServerId");
          targetServer = data.find((s: Server) => s._id === savedId);
        }

        // 3. Fallback: Select first ONLINE server
        if (!targetServer) {
          targetServer = data.find((s: Server) => s.status === "online");
        }

        // 4. Fallback: Select first available server
        if (!targetServer) {
          targetServer = data[0];
        }

        if (targetServer) {
          setSelectedServer(targetServer);
          localStorage.setItem("selectedServerId", targetServer._id);

          // If user logged in but didn't have active server set, update it now
          if (user && !user.activeServer) {
            api
              .put("/auth/active-server", { serverId: targetServer._id })
              .catch(console.error);
          }
        }
      } else {
        setSelectedServer(null);
        localStorage.removeItem("selectedServerId");
      }
    } catch (error) {
      console.error("Failed to load servers", error);
      // toast.error("Failed to load servers"); // Avoid spamming toast on layout load
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const selectServer = useCallback(
    async (serverId: string) => {
      const server = servers.find((s) => s._id === serverId);
      if (server) {
        setSelectedServer(server);
        localStorage.setItem("selectedServerId", server._id);
        toast.success(`Switched to ${server.name}`);

        // Update backend
        try {
          await api.put("/auth/active-server", { serverId: server._id });
        } catch (error) {
          console.error("Failed to update active server preference", error);
        }
      }
    },
    [servers],
  );

  return (
    <ServerContext.Provider
      value={{
        servers,
        selectedServer,
        selectServer,
        loading,
        refreshServers: fetchServers,
        setServers,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error("useServer must be used within a ServerProvider");
  }
  return context;
};
