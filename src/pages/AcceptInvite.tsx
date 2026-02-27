import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, fetchUser } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Verifying invitation...");
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invitation token found in URL.");
      return;
    }

    if (!user) {
      // User must be logged in to accept invite
      // We can redirect them to login with a returnUrl, or just say please login
      setStatus("error");
      setMessage(
        "You must be logged in to accept an invitation. Please log in first.",
      );
      return;
    }

    const acceptInv = async () => {
      try {
        const { data } = await api.post("/teams/accept-invite", { token });
        setStatus("success");
        setTeamName(data.team?.name || "the team");
        setMessage("You have successfully joined the team!");
        fetchUser(); // Refresh user data to get currentTeam
        toast.success("Joined team successfully");
      } catch (err: any) {
        setStatus("error");
        setMessage(
          err.response?.data?.message || "Failed to accept invitation",
        );
      }
    };

    acceptInv();
  }, [token, user, fetchUser]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%", p: 2, textAlign: "center" }}>
        <CardContent>
          {status === "loading" && (
            <Box sx={{ py: 4 }}>
              <CircularProgress size={48} sx={{ mb: 3 }} />
              <Typography variant="h6">{message}</Typography>
            </Box>
          )}

          {status === "success" && (
            <Box sx={{ py: 3 }}>
              <CheckCircleOutlineIcon
                color="success"
                sx={{ fontSize: 64, mb: 2 }}
              />
              <Typography variant="h5" gutterBottom>
                Invitation Accepted
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Welcome to <strong>{teamName}</strong>. You now have access to
                this team's projects and servers.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate("/")}
                size="large"
              >
                Go to Dashboard
              </Button>
            </Box>
          )}

          {status === "error" && (
            <Box sx={{ py: 3 }}>
              <ErrorOutlineIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h5" color="error" gutterBottom>
                Invalid Invitation
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                {message}
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                {!user ? (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() =>
                      navigate(`/login?returnUrl=/accept-invite?token=${token}`)
                    }
                  >
                    Log In
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate("/")}
                  >
                    Return Home
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AcceptInvite;
