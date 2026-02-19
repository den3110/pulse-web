import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ServerProvider } from "./contexts/ServerContext";
import { ThemeContextProvider } from "./contexts/ThemeContext";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Servers from "./pages/Servers";
import ServerDetail from "./pages/ServerDetail";
import Projects from "./pages/Projects";
import DeploymentDetail from "./pages/DeploymentDetail";
import Settings from "./pages/Settings";
import NginxManager from "./pages/NginxManager";
import PM2Manager from "./pages/PM2Manager";
import ActivityLog from "./pages/ActivityLog";
import UserManagement from "./pages/UserManagement";
import FTPManager from "./pages/FTPManager";
import CronManager from "./pages/CronManager";
import PortManager from "./pages/PortManager";
import DatabaseManager from "./pages/DatabaseManager";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import "./index.css";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
      </div>
    );
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
      </div>
    );
  if (user) return <Navigate to="/" />;
  return <>{children}</>;
};

function App() {
  return (
    <HelmetProvider>
      <ThemeContextProvider>
        <AuthProvider>
          <ServerProvider>
            <BrowserRouter>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: "var(--terminal-bg, #1f2937)",
                    color: "var(--terminal-text, #f9fafb)",
                    border:
                      "1px solid var(--border-color, rgba(255,255,255,0.08))",
                    borderRadius: "10px",
                  },
                }}
              />
              <Routes>
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <Register />
                    </PublicRoute>
                  }
                />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="servers" element={<Servers />} />
                  <Route path="servers/:id" element={<ServerDetail />} />
                  <Route path="projects" element={<Projects />} />
                  <Route
                    path="projects/:id/deploy"
                    element={<DeploymentDetail />}
                  />
                  <Route path="nginx" element={<NginxManager />} />
                  <Route path="pm2" element={<PM2Manager />} />
                  <Route path="ftp" element={<FTPManager />} />
                  <Route path="cron" element={<CronManager />} />
                  <Route path="ports" element={<PortManager />} />
                  <Route path="database" element={<DatabaseManager />} />
                  <Route path="activity" element={<ActivityLog />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ServerProvider>
        </AuthProvider>
      </ThemeContextProvider>
    </HelmetProvider>
  );
}

export default App;
