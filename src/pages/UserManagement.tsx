import React, { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Skeleton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockResetIcon from "@mui/icons-material/LockReset";
import PeopleIcon from "@mui/icons-material/People";
import SEO from "../components/SEO";

interface User {
  _id: string;
  username: string;
  email: string;
  role: "admin" | "viewer";
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "viewer" as "admin" | "viewer",
  });

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/admin/users/${editing._id}`, {
          username: form.username,
          email: form.email,
          role: form.role,
        });
        toast.success("User updated");
      } else {
        await api.post("/admin/users", form);
        toast.success("User created");
      }
      setShowModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/users/${confirmDelete._id}`);
      toast.success("User deleted");
      setConfirmDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassUser || !newPassword) return;
    try {
      await api.post(`/admin/users/${resetPassUser._id}/reset-password`, {
        newPassword,
      });
      toast.success("Password reset");
      setResetPassUser(null);
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const openCreate = () => {
    setForm({ username: "", email: "", password: "", role: "viewer" });
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setForm({
      username: u.username,
      email: u.email,
      password: "",
      role: u.role,
    });
    setEditing(u);
    setShowModal(true);
  };

  if (currentUser?.role !== "admin") {
    return (
      <Box sx={{ textAlign: "center", py: 10 }}>
        <Typography variant="h6">{t("users.adminRequired")}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <SEO
        title={t("seo.users.title")}
        description={t("seo.users.description")}
      />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="body1" fontWeight={500}>
            {t("users.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("users.count", { count: users.length })}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          {t("users.addUser")}
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 3 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={50} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : users.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <PeopleIcon
                sx={{ fontSize: 56, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6">{t("users.noUsers")}</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("common.username")}</TableCell>
                    <TableCell>{t("common.email")}</TableCell>
                    <TableCell>{t("users.role")}</TableCell>
                    <TableCell>{t("common.created")}</TableCell>
                    <TableCell align="right">{t("common.actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u._id}>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {u.username}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={u.role}
                          size="small"
                          color={u.role === "admin" ? "primary" : "default"}
                          variant="outlined"
                          sx={{ fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => openEdit(u)}
                          title="Edit"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setResetPassUser(u)}
                          title="Reset password"
                        >
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                        {u._id !== currentUser?.id && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setConfirmDelete(u)}
                            title="Delete"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editing ? t("users.editUser") : t("users.createUser")}
          </DialogTitle>
          <DialogContent
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pt: "16px !important",
            }}
          >
            <TextField
              label="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              size="small"
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              size="small"
            />
            {!editing && (
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                size="small"
              />
            )}
            <FormControl size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={form.role}
                label="Role"
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as any })
                }
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="contained">
              {editing ? t("common.update") : t("common.create")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>{t("users.deleteUser")}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{confirmDelete?.username}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t("common.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password */}
      <Dialog
        open={!!resetPassUser}
        onClose={() => setResetPassUser(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {t("users.resetPassword")} - {resetPassUser?.username}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPassUser(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleResetPassword}
            disabled={!newPassword}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
