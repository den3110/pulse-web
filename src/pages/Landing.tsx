import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { keyframes } from "@mui/system";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import StorageIcon from "@mui/icons-material/Storage";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import RouterIcon from "@mui/icons-material/Router";
import ViewTimelineIcon from "@mui/icons-material/ViewTimeline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TerminalIcon from "@mui/icons-material/Terminal";
import VpnLockIcon from "@mui/icons-material/VpnLock";
import SubjectIcon from "@mui/icons-material/Subject";
import ScienceIcon from "@mui/icons-material/Science";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SearchIcon from "@mui/icons-material/Search";
import PublicNavbar from "../components/PublicNavbar";

// --- Animations ---
const float1 = keyframes`
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
`;
const float2 = keyframes`
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(-30px, 50px) scale(1.1); }
  66% { transform: translate(20px, -20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
`;

const scrollX = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const glowPulse = keyframes`
  0% { box-shadow: 0 0 10px var(--primary-main-40), 0 0 20px var(--primary-main-20); }
  50% { box-shadow: 0 0 20px var(--primary-main-70), 0 0 40px var(--primary-main-40); }
  100% { box-shadow: 0 0 10px var(--primary-main-40), 0 0 20px var(--primary-main-20); }
`;

const backgroundMove = keyframes`
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
`;

const pulseBorder = keyframes`
  0% { border-color: rgba(79, 172, 254, 0.2); }
  50% { border-color: rgba(79, 172, 254, 0.8); }
  100% { border-color: rgba(79, 172, 254, 0.2); }
`;

// --- Fade In Component (Scroll Reveal) ---
const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
}> = ({ children, delay = 0, direction = "up" }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  const getTransform = () => {
    if (isVisible) return "translate(0, 0)";
    if (direction === "up") return "translate(0, 40px)";
    if (direction === "left") return "translate(-40px, 0)";
    if (direction === "right") return "translate(40px, 0)";
    return "translate(0, 0)";
  };

  return (
    <Box
      ref={domRef}
      sx={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms, transform 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
        width: "100%",
        height: "100%",
      }}
    >
      {children}
    </Box>
  );
};

// --- Terminal Component ---
const AnimatedTerminal: React.FC = () => {
  const { t } = useTranslation();
  const [lines, setLines] = useState<number>(0);

  useEffect(() => {
    const timeouts = [
      setTimeout(() => setLines(1), 500),
      setTimeout(() => setLines(2), 1500),
      setTimeout(() => setLines(3), 2200),
      setTimeout(() => setLines(4), 2800),
      setTimeout(() => setLines(5), 3200),
      setTimeout(() => setLines(6), 4000),
    ];
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: { xs: "100%", sm: 500 },
        height: { xs: 260, md: 320 },
        bgcolor: "#0f172a",
        borderRadius: "16px",
        border: "1px solid #334155",
        boxShadow:
          "0 30px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px 10px var(--primary-main-15)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        mx: "auto",
        mt: { xs: 4, md: 0 },
        transform: {
          xs: "none",
          md: "perspective(1200px) rotateY(-8deg) rotateX(4deg)",
        },
        transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: {
            xs: "none",
            md: "perspective(1200px) rotateY(-2deg) rotateX(1deg)",
          },
          boxShadow:
            "0 40px 70px -15px rgba(0, 0, 0, 0.8), 0 0 60px 15px var(--primary-main-25)",
        },
      }}
    >
      {/* MacOS Window Header */}
      <Box
        sx={{
          bgcolor: "#1e293b",
          p: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: "1px solid #334155",
        }}
      >
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: "#ef4444",
            boxShadow: "inset 0 0 4px rgba(0,0,0,0.5)",
          }}
        />
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: "#eab308",
            boxShadow: "inset 0 0 4px rgba(0,0,0,0.5)",
          }}
        />
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: "#22c55e",
            boxShadow: "inset 0 0 4px rgba(0,0,0,0.5)",
          }}
        />
        <Typography
          variant="caption"
          sx={{
            ml: 2,
            color: "#94a3b8",
            fontFamily: "monospace",
            fontWeight: 600,
          }}
        >
          pulse-deploy ~ bash
        </Typography>
      </Box>
      <Box
        sx={{
          p: 4,
          flex: 1,
          color: "#f8fafc",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.9rem",
          lineHeight: 1.8,
        }}
      >
        {lines >= 1 && (
          <Typography
            sx={{ fontFamily: "inherit", color: "var(--primary-main)" }}
          >
            {t("landing.hero.terminal.line1")}
          </Typography>
        )}
        {lines >= 2 && (
          <Typography sx={{ fontFamily: "inherit", color: "#94a3b8" }}>
            {t("landing.hero.terminal.line2")}
          </Typography>
        )}
        {lines >= 3 && (
          <Typography sx={{ fontFamily: "inherit", color: "#94a3b8" }}>
            {t("landing.hero.terminal.line3")}
          </Typography>
        )}
        {lines >= 4 && (
          <Typography sx={{ fontFamily: "inherit", color: "#22c55e" }}>
            {t("landing.hero.terminal.line4")}
          </Typography>
        )}
        {lines >= 5 && (
          <Typography
            sx={{ fontFamily: "inherit", color: "var(--secondary-main)" }}
          >
            {t("landing.hero.terminal.line5")}
          </Typography>
        )}
        {lines >= 6 && (
          <Typography
            sx={{
              fontFamily: "inherit",
              color: "#fbbf24",
              mt: 2,
              fontWeight: "bold",
            }}
          >
            {t("landing.hero.terminal.line6")}
          </Typography>
        )}
        {lines < 6 && (
          <Box
            component="span"
            sx={{
              display: "inline-block",
              width: 8,
              height: 16,
              bgcolor: "#f8fafc",
              animation: "blink 1s step-end infinite",
              ml: lines > 0 ? 1 : 0,
            }}
          />
        )}
      </Box>
    </Box>
  );
};

const Landing: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const isDark = theme.palette.mode === "dark";
  const bgColor = isDark ? "#020617" : "#f8fafc";

  const handleCTA = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "vi" : "en");
  };

  // Duplicate for infinite scroll
  const techLogos = [
    "Docker",
    "NGINX",
    "Node.js",
    "Python",
    "PM2",
    "PostgreSQL",
    "Redis",
    "MongoDB",
    "React",
    "Vue",
    "Ubuntu",
  ];
  const marqueeItems = [...techLogos, ...techLogos];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: bgColor,
        color: theme.palette.text.primary,
        overflowX: "hidden",
      }}
    >
      {/* Navbar */}
      <PublicNavbar />

      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 12, md: 24 },
          pb: { xs: 8, md: 15 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated Orbs */}
        <Box
          sx={{
            position: "absolute",
            top: "10%",
            left: "5%",
            width: "45vw",
            height: "45vw",
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 60%)`,
            filter: "blur(80px)",
            zIndex: 0,
            animation: `${float1} 15s ease-in-out infinite`,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "0%",
            right: "5%",
            width: "40vw",
            height: "40vw",
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 60%)`,
            filter: "blur(80px)",
            zIndex: 0,
            animation: `${float2} 18s ease-in-out infinite reverse`,
          }}
        />

        {/* Dynamic Grid Background for WOW factor */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: isDark ? 0.4 : 0.05,
            zIndex: 0,
            backgroundImage: `
              linear-gradient(to right, ${theme.palette.primary.main} 1px, transparent 1px),
              linear-gradient(to bottom, ${theme.palette.primary.main} 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            maskImage: "linear-gradient(to bottom, black 20%, transparent 80%)",
            animation: `${backgroundMove} 30s linear infinite`,
          }}
        />

        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <FadeIn direction="left">
                <Box
                  sx={{
                    display: "inline-block",
                    p: "4px 14px",
                    borderRadius: "24px",
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.light,
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    mb: 4,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  }}
                >
                  ✨ The Modern Devops Platform
                </Box>
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "3rem", sm: "4rem", lg: "5.5rem" },
                    letterSpacing: "-2.5px",
                    lineHeight: 1.1,
                    mb: 3,
                    background: isDark
                      ? `linear-gradient(to right, #ffffff, #94a3b8)`
                      : `linear-gradient(to right, #0f172a, #475569)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {t("landing.hero.title")}
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{
                    mb: { xs: 4, md: 6 },
                    lineHeight: 1.7,
                    fontWeight: 400,
                    fontSize: { xs: "1rem", md: "1.25rem" },
                    maxWidth: "90%",
                  }}
                >
                  {t("landing.hero.subtitle")}
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    size="large"
                    variant="contained"
                    onClick={handleCTA}
                    fullWidth={false}
                    sx={{
                      position: "relative",
                      overflow: "hidden",
                      py: { xs: 1.5, md: 2 },
                      px: { xs: 3, md: 5 },
                      fontSize: { xs: "1rem", md: "1.1rem" },
                      fontWeight: 600,
                      borderRadius: "12px",
                      background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      boxShadow: `0 10px 30px -10px ${theme.palette.primary.main}`,
                      transition: "all 0.3s",
                      animation: `${glowPulse} 3s infinite alternate`,
                      width: { xs: "100%", sm: "auto" },
                      "&:hover": { transform: "translateY(-2px)" },
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        background: `linear-gradient(90deg, transparent, ${alpha("#fff", 0.2)}, transparent)`,
                        backgroundSize: "200% 100%",
                        animation: `${shimmer} 3s infinite linear`,
                      },
                    }}
                  >
                    {t("landing.hero.cta.start")}
                  </Button>
                  <Button
                    size="large"
                    variant="outlined"
                    onClick={() =>
                      document
                        .getElementById("features")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    fullWidth={false}
                    sx={{
                      py: { xs: 1.5, md: 2 },
                      px: { xs: 3, md: 5 },
                      fontSize: { xs: "1rem", md: "1.1rem" },
                      fontWeight: 600,
                      borderRadius: "12px",
                      borderColor: alpha(theme.palette.text.primary, 0.2),
                      color: theme.palette.text.primary,
                      borderWidth: "2px",
                      width: { xs: "100%", sm: "auto" },
                      "&:hover": {
                        borderWidth: "2px",
                        borderColor: theme.palette.text.primary,
                        bgcolor: alpha(theme.palette.text.primary, 0.05),
                      },
                    }}
                  >
                    {t("landing.hero.cta.learnMore")}
                  </Button>
                </Stack>
              </FadeIn>
            </Grid>
            <Grid item xs={12} md={6}>
              <FadeIn direction="right" delay={300}>
                <AnimatedTerminal />
              </FadeIn>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Tech Stack Marquee */}
      <Box
        sx={{
          py: 6,
          borderY: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.3),
          overflow: "hidden",
        }}
      >
        <FadeIn delay={200}>
          <Typography
            variant="body2"
            align="center"
            color="text.secondary"
            sx={{
              textTransform: "uppercase",
              letterSpacing: 2,
              fontWeight: 600,
              mb: { xs: 2, md: 4 },
              fontSize: { xs: "0.75rem", md: "0.875rem" },
            }}
          >
            {t("landing.techStack.title")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              width: "max-content",
              animation: `${scrollX} 30s linear infinite`,
            }}
          >
            {marqueeItems.map((tech, idx) => (
              <Box
                key={idx}
                sx={{
                  px: { xs: 3, md: 6 },
                  opacity: 0.5,
                  transition: "opacity 0.3s",
                  "&:hover": { opacity: 1, cursor: "default" },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                  }}
                >
                  {tech}
                </Typography>
              </Box>
            ))}
          </Box>
        </FadeIn>
      </Box>

      {/* How it Works / Steps Section */}
      <Box sx={{ py: { xs: 8, md: 20 } }}>
        <Container maxWidth="md">
          <FadeIn>
            <Typography
              variant="h2"
              align="center"
              sx={{
                fontWeight: 800,
                mb: { xs: 6, md: 10 },
                letterSpacing: "-1px",
                fontSize: { xs: "2rem", md: "3.75rem" },
              }}
            >
              {t("landing.steps.title")}
            </Typography>
          </FadeIn>
          <Stack spacing={{ xs: 2, md: 4 }}>
            {[1, 2, 3].map((step, idx) => (
              <FadeIn key={step} delay={idx * 200}>
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: { xs: "16px", md: "24px" },
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    overflow: "hidden",
                    "&:hover": {
                      borderColor: alpha(theme.palette.primary.main, 0.5),
                      transform: { xs: "none", md: "scale(1.02)" },
                      boxShadow: {
                        xs: "none",
                        md: `0 25px 50px -12px ${alpha(theme.palette.primary.main, 0.15)}`,
                      },
                      "& .step-icon": {
                        transform: {
                          xs: "none",
                          md: "scale(1.1) rotate(5deg)",
                        },
                        bgcolor: theme.palette.primary.main,
                        color: "#fff",
                        boxShadow: `0 0 20px ${theme.palette.primary.main}`,
                      },
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: { xs: 3, sm: 6 },
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { xs: "flex-start", sm: "center" },
                      gap: { xs: 2, sm: 5 },
                    }}
                  >
                    <Box
                      className="step-icon"
                      sx={{
                        width: { xs: 56, md: 72 },
                        height: { xs: 56, md: 72 },
                        borderRadius: { xs: "16px", md: "20px" },
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: { xs: "2rem", md: "2.5rem" },
                        fontWeight: 800,
                        flexShrink: 0,
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      {step}
                    </Box>
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          mb: 1,
                          fontSize: { xs: "1.25rem", sm: "2rem" },
                        }}
                      >
                        {t(`landing.steps.step${step}.title`)}
                      </Typography>
                      <Typography
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: "1rem", md: "1.2rem" },
                          lineHeight: 1.6,
                        }}
                      >
                        {t(`landing.steps.step${step}.desc`)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Advanced Features Grid */}
      <Box id="features" sx={{ py: { xs: 8, md: 20 }, position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            top: "20%",
            left: "0%",
            width: "100%",
            height: "50%",
            background: `linear-gradient(to bottom, transparent, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`,
            pointerEvents: "none",
          }}
        />
        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
          <FadeIn>
            <Typography
              variant="h2"
              align="center"
              sx={{
                fontWeight: 800,
                mb: { xs: 2, md: 3 },
                letterSpacing: { xs: "-1px", md: "-1.5px" },
                fontSize: { xs: "2rem", md: "3.5rem" },
              }}
            >
              {t("landing.features.title")}
            </Typography>
            <Typography
              variant="h5"
              align="center"
              color="text.secondary"
              sx={{
                mb: { xs: 6, md: 12 },
                maxWidth: 700,
                mx: "auto",
                lineHeight: 1.6,
                fontSize: { xs: "1rem", md: "1.5rem" },
              }}
            >
              {t("landing.features.subtitle")}
            </Typography>
          </FadeIn>

          <Grid container spacing={{ xs: 2, md: 4 }}>
            {[
              { icon: <CloudUploadIcon fontSize="inherit" />, key: "deploy" },
              {
                icon: <ViewTimelineIcon fontSize="inherit" />,
                key: "pipeline",
              },
              { icon: <RouterIcon fontSize="inherit" />, key: "nginx" },
              { icon: <VpnLockIcon fontSize="inherit" />, key: "vpn" },
              { icon: <StorageIcon fontSize="inherit" />, key: "database" },
              { icon: <SecurityIcon fontSize="inherit" />, key: "security" },
              { icon: <SpeedIcon fontSize="inherit" />, key: "monitor" },
              { icon: <TerminalIcon fontSize="inherit" />, key: "ci" },
              { icon: <SubjectIcon fontSize="inherit" />, key: "logs" },
              { icon: <ScienceIcon fontSize="inherit" />, key: "testrunner" },
              { icon: <AccountTreeIcon fontSize="inherit" />, key: "map" },
              { icon: <SearchIcon fontSize="inherit" />, key: "command" },
            ].map((feature, idx) => (
              <Grid item xs={12} md={6} lg={4} key={idx}>
                <FadeIn delay={(idx % 3) * 100}>
                  <Card
                    sx={{
                      height: "100%",
                      bgcolor: alpha(theme.palette.background.paper, 0.6),
                      backdropFilter: "blur(20px)",
                      border: "1px solid transparent",
                      backgroundClip: "padding-box",
                      borderRadius: "32px",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        borderRadius: "32px",
                        padding: "2px",
                        background: `linear-gradient(45deg, ${alpha(theme.palette.divider, 0.1)}, ${alpha(theme.palette.primary.main, 0.3)})`,
                        WebkitMask:
                          "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                        pointerEvents: "none",
                        transition: "all 0.5s",
                      },
                      "&:hover": {
                        transform: "translateY(-12px)",
                        boxShadow: `0 30px 60px -15px ${alpha(theme.palette.primary.main, 0.2)}`,
                        "&::before": {
                          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          padding: "3px",
                        },
                        "& .feature-icon-wrapper": {
                          transform: "scale(1.1) rotate(5deg)",
                          bgcolor: theme.palette.primary.main,
                          color: "#fff",
                          boxShadow: `0 10px 20px ${alpha(theme.palette.primary.main, 0.4)}, 0 0 20px ${theme.palette.primary.main}`,
                        },
                        "& .icon-glow": {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    <Box
                      className="icon-glow"
                      sx={{
                        position: "absolute",
                        top: -50,
                        left: -50,
                        width: 200,
                        height: 200,
                        background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 60%)`,
                        opacity: 0,
                        transition: "opacity 0.6s",
                        pointerEvents: "none",
                      }}
                    />
                    <CardContent
                      sx={{
                        p: { xs: 4, md: 5 },
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      <Box
                        className="feature-icon-wrapper"
                        sx={{
                          width: { xs: 56, md: 64 },
                          height: { xs: 56, md: 64 },
                          borderRadius: "20px",
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mb: { xs: 3, md: 4 },
                          transition: "all 0.4s",
                          fontSize: { xs: "1.75rem", md: "2rem" },
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          mb: 2,
                          fontSize: { xs: "1.25rem", md: "1.75rem" },
                        }}
                      >
                        {t(`landing.features.${feature.key}.title`)}
                      </Typography>
                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                          lineHeight: 1.8,
                          fontSize: { xs: "0.95rem", md: "1.1rem" },
                          flexGrow: 1,
                        }}
                      >
                        {t(`landing.features.${feature.key}.desc`)}
                      </Typography>
                    </CardContent>
                  </Card>
                </FadeIn>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box
        sx={{
          py: { xs: 8, md: 15 },
          bgcolor: alpha(theme.palette.background.paper, 0.3),
        }}
      >
        <Container maxWidth="md">
          <FadeIn>
            <Typography
              variant="h2"
              align="center"
              sx={{
                fontWeight: 800,
                mb: { xs: 6, md: 10 },
                letterSpacing: { xs: "-1px", md: "-1.5px" },
                fontSize: { xs: "2rem", md: "3.75rem" },
              }}
            >
              {t("landing.faq.title")}
            </Typography>
          </FadeIn>
          <Stack spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((f, idx) => (
              <FadeIn key={f} delay={idx * 150}>
                <Accordion
                  elevation={0}
                  sx={{
                    bgcolor: "transparent",
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: "16px !important",
                    "&:before": { display: "none" },
                    "&.Mui-expanded": {
                      bgcolor: alpha(theme.palette.background.paper, 0.6),
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      margin: "0 !important",
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <ExpandMoreIcon
                        sx={{
                          color: theme.palette.primary.main,
                          fontSize: "2rem",
                        }}
                      />
                    }
                    sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 4 } }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: "1.1rem", md: "1.25rem" },
                      }}
                    >
                      {t(`landing.faq.q${f}`)}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails
                    sx={{ px: { xs: 2, sm: 4 }, pb: { xs: 3, sm: 4 }, pt: 0 }}
                  >
                    <Typography
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: "0.95rem", md: "1.1rem" },
                        lineHeight: 1.8,
                      }}
                    >
                      {t(`landing.faq.a${f}`)}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </FadeIn>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Massive CTA */}
      <Box sx={{ py: { xs: 8, md: 20 }, px: 2 }}>
        <Container maxWidth="lg">
          <FadeIn direction="up">
            <Box
              sx={{
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.15)})`,
                backdropFilter: "blur(20px)",
                borderRadius: { xs: "24px", md: "40px" },
                p: { xs: 4, sm: 8, md: 12 },
                border: "1px solid transparent",
                backgroundClip: "padding-box",
                boxShadow: `0 30px 60px -20px ${alpha(theme.palette.primary.main, 0.4)}, inset 0 0 40px ${alpha(theme.palette.primary.main, 0.1)}`,
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  borderRadius: { xs: "24px", md: "40px" },
                  padding: "2px",
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                  backgroundSize: "200% 200%",
                  animation: `${shimmer} 3s linear infinite`,
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  pointerEvents: "none",
                },
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "100%",
                  height: "100%",
                  background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 60%)`,
                  pointerEvents: "none",
                  mixBlendMode: "screen",
                }}
              />
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  mb: { xs: 2, md: 4 },
                  letterSpacing: { xs: "-1px", md: "-1.5px" },
                  fontSize: { xs: "2rem", md: "3.75rem" },
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {t("landing.bottomCta.title")}
              </Typography>
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  mb: { xs: 4, md: 8 },
                  maxWidth: 700,
                  mx: "auto",
                  lineHeight: 1.6,
                  fontSize: { xs: "1rem", md: "1.5rem" },
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {t("landing.bottomCta.subtitle")}
              </Typography>

              <Button
                size="large"
                variant="contained"
                onClick={handleCTA}
                sx={{
                  py: { xs: 2, md: 3 },
                  px: { xs: 5, md: 8 },
                  fontSize: { xs: "1.1rem", md: "1.3rem" },
                  fontWeight: 800,
                  borderRadius: { xs: "16px", md: "20px" },
                  position: "relative",
                  zIndex: 1,
                  background: `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: `0 15px 40px -10px ${theme.palette.primary.main}`,
                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": { transform: { xs: "none", md: "scale(1.05)" } },
                }}
              >
                {t("landing.bottomCta.button")}
              </Button>
            </Box>
          </FadeIn>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          py: { xs: 4, md: 8 },
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
          textAlign: "center",
          bgcolor: alpha(theme.palette.background.paper, 0.2),
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontWeight: 600,
            fontSize: { xs: "0.8rem", md: "0.875rem" },
            px: 2,
          }}
        >
          © {new Date().getFullYear()} Pulse. All rights reserved. Built with ❤️
          for developers.
        </Typography>
      </Box>
    </Box>
  );
};

export default Landing;
