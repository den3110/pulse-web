import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/api";
import PublicNavbar from "../components/PublicNavbar";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  highlighted: boolean;
  buttonText: string;
}

const Pricing: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axiosInstance.get("/billing/plans");
        setPlans(response.data);
      } catch (error) {
        console.error("Failed to fetch billing plans:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: isDark ? "#020617" : "#f8fafc",
        color: theme.palette.text.primary,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Shared Navbar */}
      <PublicNavbar />

      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          height: "50vh",
          background: `radial-gradient(ellipse at top, ${alpha(theme.palette.primary.main, 0.15)}, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <Container
        maxWidth="lg"
        sx={{ pt: { xs: 16, md: 24 }, pb: 12, position: "relative", zIndex: 1 }}
      >
        <Box sx={{ textAlign: "center", mb: { xs: 8, md: 12 } }}>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "2.5rem", md: "4.5rem" },
              letterSpacing: "-1.5px",
              mb: 3,
            }}
          >
            {t("pricing.title", "Simple, Transparent Pricing")}
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: "auto", lineHeight: 1.6 }}
          >
            {t(
              "pricing.subtitle",
              "Choose the plan that fits your deployment needs. Grow with us.",
            )}
          </Typography>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid
            container
            spacing={4}
            alignItems="center"
            justifyContent="center"
          >
            {plans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "24px",
                    position: "relative",
                    overflow: plan.highlighted ? "visible" : "hidden",
                    bgcolor: alpha(theme.palette.background.paper, 0.4),
                    backdropFilter: "blur(20px)",
                    border: `1px solid ${plan.highlighted ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: plan.highlighted
                      ? `0 20px 40px -10px ${alpha(theme.palette.primary.main, 0.3)}`
                      : "none",
                    transform: plan.highlighted
                      ? { md: "scale(1.05)" }
                      : "none",
                    zIndex: plan.highlighted ? 2 : 1,
                    transition: "all 0.3s",
                    "&:hover": {
                      transform: plan.highlighted
                        ? { md: "scale(1.08)" }
                        : "translateY(-8px)",
                      boxShadow: `0 30px 60px -15px ${alpha(theme.palette.primary.main, 0.2)}`,
                    },
                  }}
                >
                  {plan.highlighted && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "linear-gradient(135deg, var(--primary-main), var(--secondary-main))",
                        color: "#fff",
                        px: 3,
                        py: 0.5,
                        borderRadius: "20px",
                        fontSize: "0.875rem",
                        fontWeight: "bold",
                        boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.3)}`,
                      }}
                    >
                      {t("pricing.mostPopular", "Most Popular")}
                    </Box>
                  )}

                  <CardContent sx={{ p: { xs: 4, md: 5 }, flexGrow: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {t(`pricing.plan.${plan.id}.name`, plan.name)}
                    </Typography>
                    <Typography
                      color="text.secondary"
                      sx={{ mb: 4, minHeight: 48 }}
                    >
                      {t(
                        `pricing.plan.${plan.id}.desc`,
                        "Plan description goes here.",
                      )}
                    </Typography>
                    <Box
                      sx={{ display: "flex", alignItems: "baseline", mb: 4 }}
                    >
                      <Typography
                        variant="h2"
                        sx={{ fontWeight: 800, letterSpacing: "-2px" }}
                      >
                        ${plan.price}
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        /{t(`pricing.interval.${plan.interval}`, plan.interval)}
                      </Typography>
                    </Box>

                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      {plan.features.map((feature, i) => (
                        <Box
                          key={i}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              flexShrink: 0,
                            }}
                          >
                            <CheckIcon
                              sx={{ fontSize: 16, fontWeight: "bold" }}
                            />
                          </Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {t(`pricing.plan.${plan.id}.feature.${i}`, feature)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ p: { xs: 4, md: 5 }, pt: 0 }}>
                    <Button
                      fullWidth
                      variant={plan.highlighted ? "contained" : "outlined"}
                      size="large"
                      onClick={() => navigate("/register")}
                      sx={{
                        py: 1.5,
                        borderRadius: "12px",
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        borderWidth: plan.highlighted ? 0 : "2px",
                        "&:hover": {
                          borderWidth: "2px",
                        },
                      }}
                    >
                      {t(`pricing.cta.${plan.id}`, plan.buttonText)}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default Pricing;
