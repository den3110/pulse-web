import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../services/api";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  CircularProgress,
  Divider,
} from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";
import SEO from "../components/SEO";

const Login: React.FC = () => {
  const { login, login2FA } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleGithubLogin = async () => {
    try {
      const { data } = await api.get("/auth/github/login");
      window.location.href = data.url;
    } catch (error) {
      toast.error(t("auth.loginFailed") + " (GitHub)");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { data } = await api.get("/auth/google/login");
      window.location.href = data.url;
    } catch (error) {
      toast.error(t("auth.loginFailed") + " (Google)");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (requires2FA) {
        await login2FA(tempToken, twoFactorCode);
        toast.success(t("auth.loginSuccess"));
      } else {
        const res = await login(email, password);
        if (res && res.requires2FA) {
          setRequires2FA(true);
          setTempToken(res.tempToken);
          setLoading(false);
          return;
        }
        toast.success(t("auth.loginSuccess"));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("auth.loginFailed"));
    } finally {
      if (!requires2FA || (requires2FA && !loading)) {
        setLoading(false);
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <SEO
        title={t("seo.login.title")}
        description={t("seo.login.description")}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Pulse",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        }}
      />
      <Card
        sx={{
          maxWidth: 440,
          width: "100%",
          borderRadius: 5,
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <CardContent sx={{ p: 5 }}>
          {/* Logo */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                mx: "auto",
                mb: 2,
                background:
                  "linear-gradient(135deg, var(--primary-main), var(--secondary-main))",
                boxShadow: "0 0 30px var(--primary-main-30)",
              }}
            >
              <RocketLaunchIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Typography
              variant="h4"
              component="h1"
              fontWeight={700}
              sx={{
                background:
                  "linear-gradient(135deg, var(--primary-main), var(--secondary-main))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Pulse
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t("auth.loginSubtitle")}
            </Typography>
          </Box>

          {requires2FA ? (
            <form onSubmit={handleSubmit}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, textAlign: "center" }}
              >
                {t("auth.enterTwoFactorCode")}
              </Typography>
              <TextField
                id="login-2fa"
                label={t("auth.twoFactorCode")}
                placeholder="123456"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                required
                fullWidth
                sx={{ mb: 3 }}
              />
              <Button
                id="login-submit-2fa"
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ py: 1.3 }}
              >
                {loading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  t("auth.verify")
                )}
              </Button>
            </form>
          ) : (
            <Box>
              <form onSubmit={handleSubmit}>
                <TextField
                  id="login-email"
                  label={t("auth.emailOrUsername")}
                  placeholder="admin or admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  sx={{ mb: 2.5 }}
                />

                <TextField
                  id="login-password"
                  label={t("auth.password")}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  sx={{ mb: 3 }}
                />

                <Button
                  id="login-submit"
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.3 }}
                >
                  {loading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>

              <Divider
                sx={{
                  my: 3,
                  "&::before, &::after": { borderColor: "var(--border-color)" },
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  OR
                </Typography>
              </Divider>

              <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<GitHubIcon />}
                  onClick={handleGithubLogin}
                  sx={{
                    borderColor: "var(--border-color)",
                    color: "text.primary",
                  }}
                >
                  GitHub
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleLogin}
                  sx={{
                    borderColor: "var(--border-color)",
                    color: "text.primary",
                  }}
                >
                  Google
                </Button>
              </Box>
            </Box>
          )}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", mt: 3 }}
          >
            {t("auth.noAccount")}{" "}
            <Link
              to="/register"
              style={{
                color: "var(--primary-main)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {t("auth.signUp")}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
