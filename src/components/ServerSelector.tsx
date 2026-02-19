import React from "react";
import { useServer } from "../contexts/ServerContext";
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import DnsIcon from "@mui/icons-material/Dns";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { useTranslation } from "react-i18next";

const ServerSelector: React.FC = () => {
  const { servers, selectedServer, selectServer, loading } = useServer();
  const { t } = useTranslation();

  if (loading && servers.length === 0) {
    return (
      <Box sx={{ mr: 2, display: "flex", alignItems: "center" }}>
        <CircularProgress size={20} color="inherit" />
      </Box>
    );
  }

  return (
    <Box sx={{ mr: 2, display: "flex", alignItems: "center" }}>
      <FormControl
        size="small"
        sx={{
          minWidth: { xs: 120, sm: 200 },
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
          value={selectedServer?._id || ""}
          onChange={(e) => selectServer(e.target.value)}
          displayEmpty
          renderValue={(selected) => {
            if (!selected) {
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DnsIcon fontSize="small" />
                  <Typography variant="body2">
                    {t("serverSelector.selectServer")}
                  </Typography>
                </Box>
              );
            }
            const server = servers.find((s) => s._id === selected);
            return (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FiberManualRecordIcon
                  sx={{
                    fontSize: 12,
                    color:
                      server?.status === "online"
                        ? "success.main"
                        : "error.main",
                  }}
                />
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {server?.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.7, display: { xs: "none", sm: "block" } }}
                  >
                    ({server?.host})
                  </Typography>
                </Box>
              </Box>
            );
          }}
        >
          {servers.map((server) => (
            <MenuItem key={server._id} value={server._id}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FiberManualRecordIcon
                  sx={{
                    fontSize: 12,
                    color:
                      server.status === "online"
                        ? "success.main"
                        : "error.main",
                  }}
                />
                <Box>
                  <Typography variant="body2">{server.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {server.host}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default ServerSelector;
