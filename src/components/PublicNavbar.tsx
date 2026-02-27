import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  AppBar,
  Toolbar,
  IconButton,
  useTheme,
  alpha,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

const PublicNavbar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = theme.palette.mode === "dark";
  const bgColor = isDark ? "#020617" : "#f8fafc";
  const isPricingActive = location.pathname === "/pricing";
  const isDocsActive = location.pathname === "/docs";

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "vi" : "en");
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: alpha(bgColor, 0.7),
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar
          disableGutters
          sx={{ justifyContent: "space-between", height: { xs: 64, md: 72 } }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "1.2rem",
                boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              }}
            >
              P
            </Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}
            >
              Pulse
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 2, md: 3 }}
            alignItems="center"
          >
            <IconButton
              onClick={toggleLanguage}
              color="inherit"
              size="small"
              sx={{ p: { xs: 0.5, sm: 1 } }}
            >
              <LanguageIcon
                sx={{ mr: { xs: 0, sm: 0.5 }, fontSize: { xs: 20, sm: 18 } }}
              />
              <Typography
                variant="button"
                sx={{ fontWeight: 600, display: { xs: "none", sm: "block" } }}
              >
                {i18n.language.toUpperCase()}
              </Typography>
            </IconButton>

            <Button
              onClick={() => navigate("/docs")}
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
                textTransform: "none",
                display: { xs: "none", sm: "block" },
                color: isDocsActive ? "var(--primary-main)" : "inherit",
                position: "relative",
                "&::after": isDocsActive
                  ? {
                      content: '""',
                      position: "absolute",
                      bottom: "-4px",
                      left: "10%",
                      width: "80%",
                      height: "3px",
                      borderRadius: "4px",
                      backgroundColor: "var(--primary-main)",
                    }
                  : {},
              }}
            >
              {t("nav.docs", "Docs")}
            </Button>

            <Button
              onClick={() => navigate("/pricing")}
              sx={{
                fontWeight: 600,
                fontSize: { xs: "0.8rem", sm: "0.9rem" },
                textTransform: "none",
                display: { xs: "none", sm: "block" },
                color: isPricingActive ? "var(--primary-main)" : "inherit",
                position: "relative",
                "&::after": isPricingActive
                  ? {
                      content: '""',
                      position: "absolute",
                      bottom: "-4px",
                      left: "10%",
                      width: "80%",
                      height: "3px",
                      borderRadius: "4px",
                      backgroundColor: "var(--primary-main)",
                    }
                  : {},
              }}
            >
              {t("pricing.title", "Pricing")}
            </Button>

            {user ? (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate("/dashboard")}
                sx={{
                  borderRadius: "10px",
                  px: { xs: 2, md: 3 },
                  py: { xs: 0.5, md: 1 },
                  fontWeight: 600,
                  fontSize: { xs: "0.8rem", md: "0.875rem" },
                }}
              >
                {t("landing.nav.dashboard")}
              </Button>
            ) : (
              <>
                <Button
                  variant="text"
                  color="inherit"
                  onClick={() => navigate("/login")}
                  sx={{
                    fontWeight: 600,
                    display: { xs: "none", sm: "inline-flex" },
                  }}
                >
                  {t("landing.nav.login")}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate("/register")}
                  sx={{
                    borderRadius: "10px",
                    px: { xs: 2, md: 3 },
                    py: { xs: 0.5, md: 1 },
                    fontWeight: 600,
                    fontSize: { xs: "0.8rem", md: "0.875rem" },
                  }}
                >
                  {t("landing.nav.register")}
                </Button>
              </>
            )}
          </Stack>

          {/* Mobile Menu Toggle */}
          <IconButton
            color="inherit"
            edge="end"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: "flex", sm: "none" }, ml: 1 }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 250,
            bgcolor: bgColor,
            backgroundImage: "none",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Pulse
          </Typography>
          <IconButton onClick={() => setMobileOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ mt: 2 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                navigate("/docs");
                setMobileOpen(false);
              }}
              sx={{ color: isDocsActive ? "var(--primary-main)" : "inherit" }}
            >
              <ListItemText primary={t("nav.docs", "Docs")} />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                navigate("/pricing");
                setMobileOpen(false);
              }}
              sx={{
                color: isPricingActive ? "var(--primary-main)" : "inherit",
              }}
            >
              <ListItemText primary={t("pricing.title", "Pricing")} />
            </ListItemButton>
          </ListItem>

          {user ? (
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate("/dashboard");
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary={t("landing.nav.dashboard")} />
              </ListItemButton>
            </ListItem>
          ) : (
            <>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate("/login");
                    setMobileOpen(false);
                  }}
                >
                  <ListItemText primary={t("landing.nav.login")} />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate("/register");
                    setMobileOpen(false);
                  }}
                >
                  <ListItemText
                    primary={t("landing.nav.register")}
                    sx={{
                      color: theme.palette.primary.main,
                      fontWeight: "bold",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </>
          )}

          <Divider sx={{ my: 2 }} />
          <ListItem disablePadding>
            <ListItemButton onClick={toggleLanguage}>
              <LanguageIcon sx={{ mr: 2, fontSize: 20 }} />
              <ListItemText
                primary={i18n.language === "en" ? "Tiếng Việt" : "English"}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </AppBar>
  );
};

export default PublicNavbar;
