import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  useTheme,
  Pagination,
  Tooltip,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export const TeamSettingsCard: React.FC = () => {
  const { user, fetchUser } = useAuth();
  const theme = useTheme();
  const { t } = useTranslation();

  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");

  const [page, setPage] = useState(1);
  const rowsPerPage = 5;

  const handleChangePage = (
    event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setPage(value);
  };

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/teams");
      setTeams(data.teams);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch teams");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async (teamId: string) => {
    try {
      const { data } = await api.get(`/teams/${teamId}/invite`);
      setInvites(data.invites);
    } catch (err) {
      // ignore or log
    }
  };

  useEffect(() => {
    fetchTeams();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (user?.currentTeam) {
      fetchInvites(user.currentTeam);
    }
  }, [user?.currentTeam]);

  const handleCreateTeam = async () => {
    if (!newTeamName) return;
    try {
      await api.post("/teams", { name: newTeamName });
      toast.success("Team created");
      setCreateOpen(false);
      setNewTeamName("");
      fetchTeams();
      fetchUser(); // to update currentTeam
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create team");
    }
  };

  const handleSwitchTeam = async (teamId: string | null) => {
    try {
      await api.post("/teams/switch", { teamId });
      toast.success(
        teamId ? "Switched team" : "Switched to personal workspace",
      );
      fetchUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to switch team");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !user?.currentTeam) return;
    try {
      const { data } = await api.post(`/teams/${user.currentTeam}/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });
      toast.success("Invitation created");

      // In a real app, email is sent. For MVP, we copy link to clipboard to simulate sending.
      const invLink = `${window.location.origin}/accept-invite?token=${data.invite.token}`;
      navigator.clipboard.writeText(invLink);
      toast.success("Invite link copied to clipboard for testing!");

      setInviteOpen(false);
      setInviteEmail("");
      fetchInvites(user.currentTeam);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to invite member");
    }
  };

  const currentTeamObj = teams.find((t) => t._id === user?.currentTeam);
  const isOwner = currentTeamObj?.owner?._id === user?.id;
  const isMemberAdmin = currentTeamObj?.members?.some(
    (m: any) => m.user?._id === user?.id && m.role === "admin",
  );
  const canManage = isOwner || isMemberAdmin;

  // Unified members array for pagination
  const allMembers: any[] = [];
  if (currentTeamObj) {
    if (currentTeamObj.owner) {
      allMembers.push({
        _id: currentTeamObj.owner._id || "owner",
        user: currentTeamObj.owner,
        role: "owner",
        isOwner: true,
      });
    }
    if (currentTeamObj.members) {
      currentTeamObj.members.forEach((m: any) => {
        allMembers.push({
          _id: m.user?._id || m._id || Math.random(),
          user: m.user,
          role: m.role,
          isOwner: false,
        });
      });
    }
  }

  const paginatedMembers = allMembers.slice(
    (page - 1) * rowsPerPage,
    (page - 1) * rowsPerPage + rowsPerPage,
  );

  return (
    <Card sx={{ height: "100%", gridColumn: { lg: "span 2" } }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <GroupsIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6" fontSize={16} fontWeight={600}>
            Team & Workspace Settings
          </Typography>
          <Chip
            label="PRO"
            size="small"
            color="primary"
            sx={{ fontSize: 10, height: 20 }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            size="small"
            sx={{ height: 40, whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Create Team
          </Button>

          {teams.length > 0 && (
            <TextField
              select
              size="small"
              label="Active Workspace"
              value={user?.currentTeam || "personal"}
              onChange={(e) =>
                handleSwitchTeam(
                  e.target.value === "personal" ? null : e.target.value,
                )
              }
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="personal">Personal Workspace</MenuItem>
              {teams.map((t) => (
                <MenuItem key={t._id} value={t._id}>
                  {t.name} {t.owner?._id === user?.id ? "(Owner)" : ""}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>

        {currentTeamObj && (
          <Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Members of {currentTeamObj.name}
              </Typography>
              {canManage && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setInviteOpen(true)}
                >
                  Invite Member
                </Button>
              )}
            </Box>

            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                mb: 3,
                overflow: "hidden",
              }}
            >
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ borderRadius: 0 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      {canManage && (
                        <TableCell align="right">Actions</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedMembers.map((m: any) => (
                      <TableRow key={m._id}>
                        <TableCell>{m.user?.username}</TableCell>
                        <TableCell>{m.user?.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={m.role === "owner" ? "Owner" : m.role}
                            size="small"
                            color={m.role === "owner" ? "primary" : "default"}
                          />
                        </TableCell>
                        {canManage && (
                          <TableCell align="right">
                            {m.isOwner ? (
                              <Tooltip title="Owner cannot be removed">
                                <span>
                                  <IconButton size="small" disabled>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            ) : (
                              <Tooltip title="Remove member">
                                <IconButton size="small" color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {allMembers.length > rowsPerPage && (
                <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                  <Pagination
                    count={Math.ceil(allMembers.length / rowsPerPage)}
                    page={page}
                    onChange={handleChangePage}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              )}
            </Box>

            {canManage && invites.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Pending Invites
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {invites.map((inv) => (
                    <Chip
                      key={inv._id}
                      label={`${inv.email} (${inv.role})`}
                      onDelete={() => {}}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Create Team Dialog */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
          <DialogTitle>Create a New Team</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Team Name"
              type="text"
              fullWidth
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Invite Member Dialog */}
        <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)}>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogContent>
            <TextField
              margin="dense"
              label="Email Address"
              type="email"
              fullWidth
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              sx={{ mb: 2, mt: 1 }}
              InputLabelProps={{ shrink: true }}
              placeholder="user@example.com"
            />
            <TextField
              select
              margin="dense"
              label="Role"
              fullWidth
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} variant="contained">
              Send Invite
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};
