import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { FormControl, Select, MenuItem, Box, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const TeamSwitcher: React.FC = () => {
  const { user, fetchUser } = useAuth();
  const { t } = useTranslation();
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const fetchTeams = async () => {
    try {
      const { data } = await api.get("/teams");
      setTeams(data.teams || []);
    } catch (err) {
      // suppress soft network errors mapping
    }
  };

  const handleSwitchTeam = async (teamId: string | null) => {
    try {
      await api.post("/teams/switch", { teamId });
      toast.success(
        teamId ? "Switched team context" : "Switched to personal workspace",
      );
      fetchUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to switch team");
    }
  };

  // Only render if they belong to at least 1 team
  if (teams.length === 0) return null;

  return (
    <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
      <FormControl
        size="small"
        sx={{
          minWidth: { xs: 120, sm: 180 },
          "& .MuiOutlinedInput-root": {
            color: "inherit",
            "& fieldset": {
              borderColor: "rgba(255, 255, 255, 0.23)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(255, 255, 255, 0.5)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "primary.main",
            },
            "& .MuiSvgIcon-root": {
              color: "inherit",
            },
          },
        }}
      >
        <Select
          value={user?.currentTeam || "personal"}
          onChange={(e) =>
            handleSwitchTeam(
              e.target.value === "personal" ? null : e.target.value,
            )
          }
        >
          <MenuItem value="personal">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GroupsIcon fontSize="small" sx={{ opacity: 0.7 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Personal Workspace
              </Typography>
            </Box>
          </MenuItem>
          {teams.map((team) => (
            <MenuItem key={team._id} value={team._id}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <GroupsIcon fontSize="small" sx={{ opacity: 0.7 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {team.name}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default TeamSwitcher;
