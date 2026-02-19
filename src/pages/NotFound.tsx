import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Typography, Button, Avatar } from "@mui/material";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import HomeIcon from "@mui/icons-material/Home";
import SEO from "../components/SEO";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 3,
      }}
    >
      <SEO
        title={t("seo.notFound.title")}
        description={t("seo.notFound.description")}
      />
      <Avatar
        sx={{
          width: 80,
          height: 80,
          mb: 3,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          boxShadow: "0 0 40px rgba(99, 102, 241, 0.3)",
        }}
      >
        <SentimentVeryDissatisfiedIcon sx={{ fontSize: 44 }} />
      </Avatar>

      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: 72, md: 120 },
          fontWeight: 800,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          mb: 1,
        }}
      >
        404
      </Typography>

      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
        {t("notFound.title")}
      </Typography>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: 4, maxWidth: 400 }}
      >
        {t("notFound.subtitle")}
      </Typography>

      <Button
        variant="contained"
        size="large"
        startIcon={<HomeIcon />}
        onClick={() => navigate("/")}
        sx={{ px: 4, py: 1.2 }}
      >
        {t("notFound.goHome")}
      </Button>
    </Box>
  );
};

export default NotFound;
