import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  useTheme,
  alpha,
  Container,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const DocsNavbar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backgroundColor: alpha(theme.palette.background.default, 0.8),
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ px: { xs: 0, md: 0 }, py: 1 }}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1 }}
          >
            <Box
              onClick={() => navigate("/")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                cursor: "pointer",
                transition: "opacity 0.2s",
                "&:hover": { opacity: 0.8 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: theme.palette.primary.main,
                  borderRadius: "8px",
                  p: 0.5,
                }}
              >
                <Typography fontSize={20}>🚀</Typography>
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  fontSize: { xs: "1.25rem", md: "1.5rem" },
                  background: `linear-gradient(45deg, ${theme.palette.text.primary}, ${theme.palette.primary.main})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Pulse Docs
              </Typography>
            </Box>
          </Box>
          <Button
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            onClick={() => navigate("/")}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Back to Home
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default DocsNavbar;
