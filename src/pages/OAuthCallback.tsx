import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Box, Typography, CircularProgress } from "@mui/material";

const OAuthCallback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { oauthLogin } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const hasExchanged = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const errorParam = params.get("error");
    const providerParam = params.get("provider");
    const provider =
      providerParam ||
      (location.pathname.includes("github") ? "github" : "google");

    // This component will just capture the query params.
    // Wait, the backend redirect doesn't happen here.
    // The backend redirect goes to github/google, they redirect back to THIS page with ?code=xyz
    // Then this page sends the code to backend.

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    if (!code) {
      setError("No authorization code found.");
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    if (hasExchanged.current) {
      return;
    }
    hasExchanged.current = true;

    const exchangeCode = async () => {
      try {
        const redirectUriPath =
          provider === "github" ? "/settings" : "/oauth/callback";
        const redirectUri = window.location.origin + redirectUriPath;
        const response = await fetch(`/api/auth/${provider}/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, redirectUri }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to authenticate");
        }

        // Authenticate user in context synchronously
        oauthLogin(data.user, data.accessToken, data.refreshToken);

        // Redirect to dashboard
        navigate("/dashboard");
      } catch (err: any) {
        console.error("OAuth Error:", err);
        const errorMsg = err.message || "An unexpected error occurred.";
        setError(`Authentication Failed: ${errorMsg}`);
        setTimeout(() => navigate("/login"), 5000);
      }
    };

    exchangeCode();
  }, [location, navigate, oauthLogin]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {error ? (
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      ) : (
        <>
          <CircularProgress size={48} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Authenticating...
          </Typography>
        </>
      )}
    </Box>
  );
};

export default OAuthCallback;
