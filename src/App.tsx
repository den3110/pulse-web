import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ServerProvider } from "./contexts/ServerContext";
import { ThemeContextProvider } from "./contexts/ThemeContext";
import { Toaster, ToastBar, toast } from "react-hot-toast";
import CloseIcon from "@mui/icons-material/Close";
import { IconButton } from "@mui/material";
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
import DockerManager from "./pages/DockerManager";
import InfrastructureMap from "./pages/InfrastructureMap";
import Analytics from "./pages/Analytics";
import ApprovalCenter from "./pages/ApprovalCenter";
import SecretVault from "./pages/SecretVault";
import WebhookDebugger from "./pages/WebhookDebugger";
import TestRunner from "./pages/TestRunner";
import PipelineBuilder from "./pages/PipelineBuilder";
import VpnManager from "./pages/VpnManager";
import GlobalBandwidth from "./pages/GlobalBandwidth";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Docs from "./pages/Docs";
import LogStudio from "./pages/LogStudio";
import OAuthCallback from "./pages/OAuthCallback";
import Layout from "./components/Layout";
import AcceptInvite from "./pages/AcceptInvite";
import SmartDeploy from "./pages/SmartDeploy";
import OneClickInstall from "./pages/OneClickInstall";
import OneClickAppDetail from "./pages/OneClickAppDetail";
import "./index.css";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="loading-page">
        <div className="loading-spinner" />
      </div>
    );

  if (!user) {
    // Intercept OAuth login callbacks that GitHub/Google send to /settings by user choice
    if (
      location.pathname === "/settings" &&
      location.search.includes("code=")
    ) {
      const separator = location.search.includes("?") ? "&" : "?";
      return (
        <Navigate
          to={`/oauth/callback${location.search}${separator}provider=github`}
          replace
        />
      );
    }
    return <Navigate to="/" />;
  }
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
  if (user) return <Navigate to="/dashboard" />;
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
                    maxWidth: 500, // Better for long messages
                  },
                }}
              >
                {(t) => (
                  <ToastBar toast={t}>
                    {({ icon, message }) => (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        {icon}
                        <div style={{ flex: 1, margin: "0 8px" }}>
                          {message}
                        </div>
                        {t.type !== "loading" && (
                          <IconButton
                            size="small"
                            onClick={() => toast.dismiss(t.id)}
                            sx={{
                              color: "inherit",
                              p: 0.5,
                              ml: 1,
                              opacity: 0.7,
                              "&:hover": { opacity: 1 },
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </div>
                    )}
                  </ToastBar>
                )}
              </Toaster>
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
                    <PublicRoute>
                      <Landing />
                    </PublicRoute>
                  }
                />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="smart-deploy" element={<SmartDeploy />} />
                  <Route
                    path="infrastructure"
                    element={<InfrastructureMap />}
                  />
                  <Route path="analytics" element={<Analytics />} />
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
                  <Route path="docker" element={<DockerManager />} />
                  <Route path="approvals" element={<ApprovalCenter />} />
                  <Route path="secrets" element={<SecretVault />} />
                  <Route path="webhook-debug" element={<WebhookDebugger />} />
                  <Route path="test-runner" element={<TestRunner />} />
                  <Route path="pipelines" element={<PipelineBuilder />} />
                  <Route path="vpn" element={<VpnManager />} />
                  <Route path="bandwidth" element={<GlobalBandwidth />} />
                  <Route path="logs" element={<LogStudio />} />
                  <Route path="one-click" element={<OneClickInstall />} />
                  <Route
                    path="one-click/:id/:appId"
                    element={<OneClickAppDetail />}
                  />
                  <Route
                    path="infrastructure"
                    element={<InfrastructureMap />}
                  />
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
