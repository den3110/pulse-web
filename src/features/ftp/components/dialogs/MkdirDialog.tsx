import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import { useTranslation } from "react-i18next";

interface MkdirDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (folderName: string) => void;
  loading: boolean;
  isMobile: boolean;
}

export const MkdirDialog: React.FC<MkdirDialogProps> = ({
  open,
  onClose,
  onSubmit,
  loading,
  isMobile,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim());
      setName("");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
      TransitionProps={{ onExited: () => setName("") }}
    >
      <DialogTitle>{t("ftp.createFolder")}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label={t("ftp.folderName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !name.trim()}
        >
          {t("common.create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
