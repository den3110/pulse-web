import React, { useState, useEffect } from "react";
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Button,
  TextField,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  MenuItem,
  ButtonGroup,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StorageIcon from "@mui/icons-material/Storage";
import TableChartIcon from "@mui/icons-material/TableChart";
import CodeIcon from "@mui/icons-material/Code";
import TerminalIcon from "@mui/icons-material/Terminal";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import Editor from "@monaco-editor/react";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import api from "../services/api";
import { useTranslation } from "react-i18next";
import RemoteTerminal from "../components/RemoteTerminal";
import InputAdornment from "@mui/material/InputAdornment";

interface DatabaseStudioProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
  container: any;
}

// Helper to stringify nested objects (e.g. Mongo ObjectId or Arrays) to prevent DataGrid `[object Object]` renderer
const sanitizeDataForGrid = (data: any[]) => {
  return data.map((row, idx) => {
    let gridId = idx;
    if (typeof row.id === "string" || typeof row.id === "number") {
      gridId = row.id;
    } else if (typeof row._id === "string" || typeof row._id === "number") {
      gridId = row._id;
    } else if (row._id && row._id.$oid) {
      gridId = row._id.$oid;
    }

    const newRow: any = { id: gridId };

    Object.keys(row).forEach((key) => {
      const val = row[key];
      if (val === null) {
        newRow[key] = "null";
      } else if (typeof val === "object") {
        if (val.$oid) {
          newRow[key] = val.$oid;
        } else if (val.$date) {
          newRow[key] = val.$date;
        } else {
          try {
            newRow[key] = JSON.stringify(val);
          } catch (e) {
            newRow[key] = "[Circular/Unparseable]";
          }
        }
      } else {
        newRow[key] = val;
      }
    });
    return newRow;
  });
};

export const DatabaseStudio: React.FC<DatabaseStudioProps> = ({
  open,
  onClose,
  serverId,
  container,
}) => {
  const { t } = useTranslation();

  // Connection State
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [config, setConfig] = useState({ dbName: "", user: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  // UI State
  const [tab, setTab] = useState(0);

  // Schema State
  const [tables, setTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Data Viewer State
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableCols, setTableCols] = useState<GridColDef[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [queryLimit, setQueryLimit] = useState(100);
  const [queryPage, setQueryPage] = useState(1);

  // Query Editor State
  const [queryCode, setQueryCode] = useState(
    "-- Write your SQL/Mongo query here\\n",
  );
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [queryCols, setQueryCols] = useState<GridColDef[]>([]);
  const [runningQuery, setRunningQuery] = useState(false);

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setConnected(false);
      setConfig({ dbName: "", user: "", password: "" });
      setTables([]);
      setSelectedTable(null);
      setTableData([]);
      setQueryResults([]);
      setTab(0);
    }
  }, [open]);

  // Try to load auth from session config on mount so users don't need to retype on refresh
  useEffect(() => {
    if (container?.id) {
      const savedConfig = sessionStorage.getItem(`db_config_${container.id}`);
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    }
  }, [container]);

  // Initial connection test
  const handleConnect = async () => {
    if (!config.dbName || !config.user) {
      toast.error("Database Name and Username are required");
      return;
    }
    setConnecting(true);
    try {
      // Test connection by fetching schema
      const { data } = await api.post(`/database/${serverId}/schema`, {
        containerId: container.id,
        dbType: container.type,
        dbName: config.dbName,
        dbUser: config.user,
        dbPassword: config.password,
      });
      setTables(data);
      setConnected(true);
      // Persist config safely avoiding saving password on shared computers if needed, but since it's personal dashboard session storage is okay
      sessionStorage.setItem(
        `db_config_${container.id}`,
        JSON.stringify(config),
      );
      toast.success("Connected to database");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  const fetchTableData = async (
    tableName: string,
    limitOverride?: number,
    pageOverride?: number,
  ) => {
    const limit = limitOverride || queryLimit;
    const page = pageOverride || queryPage;
    const offset = (page - 1) * limit;

    setSelectedTable(tableName);
    setLoadingData(true);
    setTab(0); // auto switch to Data tab
    try {
      const q =
        container.type === "mongo"
          ? `db.${tableName}.find().skip(${offset}).limit(${limit}).toArray()`
          : `SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offset}`;

      const { data } = await api.post(`/database/${serverId}/query`, {
        containerId: container.id,
        dbType: container.type,
        dbName: config.dbName,
        dbUser: config.user,
        dbPassword: config.password,
        query: q,
      });

      if (Array.isArray(data) && data.length > 0) {
        setTableData(sanitizeDataForGrid(data));
      } else {
        setTableData([]);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch data");
    } finally {
      setLoadingData(false);
    }
  };

  const handleEditClick = (row: any) => {
    setEditingRowId(row.id);
    setEditFormData({ ...row });
  };

  const handleCancelClick = () => {
    // If it was a new unsaved row, remove it
    if (editFormData.isNew) {
      setTableData(tableData.filter((r) => r.id !== editFormData.id));
    }
    setEditingRowId(null);
    setEditFormData({});
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditFormData({ ...editFormData, [field]: value });
  };

  const handleSaveClick = async () => {
    if (!selectedTable || !editingRowId) return;

    const oldRow = tableData.find((r) => r.id === editingRowId) || {};
    const newRow = { ...editFormData };

    const changedFields: any = {};
    Object.keys(newRow).forEach((key) => {
      if (key !== "id" && key !== "isNew" && newRow[key] !== oldRow[key]) {
        changedFields[key] = newRow[key] === "null" ? null : newRow[key];
      }
    });

    if (Object.keys(changedFields).length === 0 && !newRow.isNew) {
      setEditingRowId(null);
      return;
    }

    try {
      const isMongo = container.type === "mongo";
      let idField = "id";
      let idValue = oldRow.id;
      if (isMongo) {
        idField = "_id";
        idValue = typeof oldRow._id === "object" ? oldRow._id.$oid : oldRow._id;
      } else if (oldRow.id === undefined && oldRow._id === undefined) {
        // Fallback PK check
        const keys = Object.keys(oldRow);
        if (keys.length > 0) {
          idField = keys[0];
          idValue = oldRow[idField];
        }
      }

      const action = newRow.isNew ? "insert" : "update";
      const payloadData = newRow.isNew ? { ...newRow } : changedFields;
      delete payloadData.id;
      delete payloadData.isNew;

      await api.post(`/database/${serverId}/action`, {
        containerId: container.id,
        dbType: container.type,
        dbName: config.dbName,
        dbUser: config.user,
        dbPassword: config.password,
        table: selectedTable,
        action,
        idField,
        idValue,
        data: payloadData,
      });

      const updatedRow = { ...newRow, isNew: false };
      setTableData(
        tableData.map((r) => (r.id === editingRowId ? updatedRow : r)),
      );
      setEditingRowId(null);
      setEditFormData({});
      toast.success(`Record ${action}d successfully`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save record");
    }
  };

  const handleDeleteClick = async (id: string, row: any) => {
    if (!selectedTable) return;
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      const isMongo = container.type === "mongo";
      let idField = "id";
      let idValue = id;
      if (isMongo) {
        idField = "_id";
        idValue = typeof row._id === "object" ? row._id.$oid : row._id || id;
      }

      await api.post(`/database/${serverId}/action`, {
        containerId: container.id,
        dbType: container.type,
        dbName: config.dbName,
        dbUser: config.user,
        dbPassword: config.password,
        table: selectedTable,
        action: "delete",
        idField,
        idValue,
      });
      setTableData(tableData.filter((r) => r.id !== id));
      toast.success("Record deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete record");
    }
  };

  const handleAddNewRecord = () => {
    if (!selectedTable) return;
    const id = Math.random().toString(36).substr(2, 9);
    // Determine fields from the first row if available, otherwise just id
    const newRecord: any = { id, isNew: true };
    if (tableData.length > 0) {
      Object.keys(tableData[0]).forEach((k) => {
        if (k !== "id") newRecord[k] = "";
      });
    }
    setTableData([{ ...newRecord }, ...tableData]);
    setEditingRowId(id);
    setEditFormData(newRecord);
  };

  const executeQuery = async () => {
    if (!queryCode.trim()) return;
    setRunningQuery(true);
    try {
      const { data } = await api.post(`/database/${serverId}/query`, {
        containerId: container.id,
        dbType: container.type,
        dbName: config.dbName,
        dbUser: config.user,
        dbPassword: config.password,
        query: queryCode,
      });

      if (Array.isArray(data)) {
        if (data.length > 0) {
          const firstRow = data[0];
          // Handle scalar string returns (e.g., MySQL UPDATE response parsing heuristic)
          if (typeof firstRow === "string") {
            setQueryCols([
              { field: "result", headerName: "Result", width: 400 },
            ]);
            setQueryResults(data.map((r, i) => ({ id: i, result: r })));
          } else {
            const cols: GridColDef[] = Object.keys(firstRow).map((key) => ({
              field: key,
              headerName: key,
              width: 200,
            }));
            setQueryCols(cols);
            setQueryResults(sanitizeDataForGrid(data));
          }
        } else {
          setQueryCols([]);
          setQueryResults([]);
          toast.success("Query executed successfully (0 rows)");
        }
      } else {
        setQueryCols([{ field: "result", headerName: "Result", width: 400 }]);
        setQueryResults([{ id: 1, result: JSON.stringify(data) }]);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Query failed");
    } finally {
      setRunningQuery(false);
    }
  };

  const getLanguage = () => {
    return container?.type === "mongo" ? "javascript" : "sql";
  };

  if (!container) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: "#1e1e1e" } }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          borderBottom: "1px solid #333",
          bgcolor: "#111",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <StorageIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
            Pulse DB Studio{" "}
            <Typography
              component="span"
              sx={{ color: "#666", ml: 1, fontSize: 14 }}
            >
              {container.name} ({container.type.toUpperCase()})
            </Typography>
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: "#888", "&:hover": { color: "#fff" } }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {!connected ? (
        // Connection Form
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#1e1e1e",
          }}
        >
          <Paper
            sx={{
              p: 4,
              width: 400,
              bgcolor: "#252526",
              borderRadius: 2,
              border: "1px solid #333",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                mb: 3,
                fontWeight: 600,
                textAlign: "center",
                color: "#fff",
              }}
            >
              Connect to Database
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                label="Database Name"
                fullWidth
                size="small"
                value={config.dbName}
                onChange={(e) =>
                  setConfig({ ...config, dbName: e.target.value })
                }
                variant="outlined"
                sx={{
                  input: { color: "#fff" },
                  label: { color: "#aaa" },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#444" },
                  },
                }}
              />
              <TextField
                label="Username"
                fullWidth
                size="small"
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                sx={{
                  input: { color: "#fff" },
                  label: { color: "#aaa" },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#444" },
                  },
                }}
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                fullWidth
                size="small"
                value={config.password}
                onChange={(e) =>
                  setConfig({ ...config, password: e.target.value })
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: "#aaa" }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  input: { color: "#fff" },
                  label: { color: "#aaa" },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "#444" },
                  },
                }}
              />
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleConnect}
                disabled={connecting}
                sx={{ mt: 1, py: 1.2, fontWeight: 600 }}
              >
                {connecting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Connect & Open Studio"
                )}
              </Button>
            </Box>
          </Paper>
        </Box>
      ) : (
        // Studio Interface
        <Box sx={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <PanelGroup orientation="horizontal">
            {/* Sidebar (Schema Explorer) */}
            <Panel defaultSize={20} minSize={15}>
              <Box
                sx={{
                  height: "100%",
                  bgcolor: "#252526",
                  borderRight: "1px solid #333",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: "1px solid #333",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 600,
                      color: "#ccc",
                      fontSize: 13,
                      textTransform: "uppercase",
                    }}
                  >
                    Explorer
                  </Typography>
                </Box>
                <List
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    p: 0,
                    "& .MuiListItemButton-root": { py: 0.5, px: 2 },
                  }}
                >
                  {tables.map((t) => {
                    // Handle different format returns. Postgres/MySQL return obj like { table_name: "users" } or string
                    const tName =
                      typeof t === "string"
                        ? t
                        : t.table_name ||
                          t.TABLE_NAME ||
                          t.Name ||
                          Object.values(t)[0];
                    return (
                      <ListItem key={tName as string} disablePadding>
                        <ListItemButton
                          selected={selectedTable === tName}
                          onClick={() => fetchTableData(tName as string)}
                          sx={{
                            "&.Mui-selected": {
                              bgcolor: "rgba(144, 202, 249, 0.16)",
                            },
                          }}
                        >
                          <TableChartIcon
                            sx={{ fontSize: 16, mr: 1.5, color: "#888" }}
                          />
                          <ListItemText
                            primary={tName as string}
                            primaryTypographyProps={{
                              fontSize: 13,
                              fontFamily: "monospace",
                              color: "#ddd",
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            </Panel>

            <PanelResizeHandle
              style={{
                width: 4,
                background: "transparent",
                cursor: "col-resize",
              }}
            />

            {/* Main Content Area */}
            <Panel defaultSize={80}>
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  bgcolor: "#1e1e1e",
                }}
              >
                {/* Tabs */}
                <Box
                  sx={{ borderBottom: "1px solid #333", bgcolor: "#252526" }}
                >
                  <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{
                      minHeight: 40,
                      "& .MuiTab-root": {
                        minHeight: 40,
                        py: 0,
                        color: "#888",
                        fontSize: 13,
                        textTransform: "none",
                      },
                      "& .Mui-selected": { color: "#fff" },
                    }}
                  >
                    <Tab
                      icon={<TableChartIcon sx={{ fontSize: 16 }} />}
                      iconPosition="start"
                      label="Data"
                    />
                    <Tab
                      icon={<CodeIcon sx={{ fontSize: 16 }} />}
                      iconPosition="start"
                      label="Query Editor"
                    />
                    <Tab
                      icon={<TerminalIcon sx={{ fontSize: 16 }} />}
                      iconPosition="start"
                      label="Console"
                    />
                  </Tabs>
                </Box>

                {/* Tab Content */}
                <Box
                  sx={{
                    flex: 1,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* DATA VIEWER */}
                  {tab === 0 && (
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          mb: 2,
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography sx={{ color: "#fff", fontWeight: 600 }}>
                          {selectedTable
                            ? `Table: ${selectedTable}`
                            : "Select a table from the sidebar"}
                        </Typography>
                        {selectedTable && (
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <TextField
                              select
                              size="small"
                              value={queryLimit}
                              onChange={(e) => {
                                const newLimit = Number(e.target.value);
                                setQueryLimit(newLimit);
                                setQueryPage(1); // Reset to page 1 on limit change
                                fetchTableData(selectedTable, newLimit, 1);
                              }}
                              sx={{
                                width: 110,
                                "& .MuiOutlinedInput-root": {
                                  bgcolor: "#1e1e1e",
                                  color: "#fff",
                                },
                                "& .MuiSelect-icon": { color: "#fff" },
                              }}
                            >
                              <MenuItem value={50}>Limit 50</MenuItem>
                              <MenuItem value={100}>Limit 100</MenuItem>
                              <MenuItem value={500}>Limit 500</MenuItem>
                              <MenuItem value={1000}>Limit 1000</MenuItem>
                              <MenuItem value={5000}>Limit 5000</MenuItem>
                            </TextField>

                            <ButtonGroup
                              size="small"
                              variant="outlined"
                              sx={{ mr: 1, bgcolor: "#1e1e1e" }}
                            >
                              <Button
                                onClick={() => {
                                  const newPage = Math.max(1, queryPage - 1);
                                  setQueryPage(newPage);
                                  fetchTableData(
                                    selectedTable,
                                    queryLimit,
                                    newPage,
                                  );
                                }}
                                disabled={queryPage <= 1}
                              >
                                <ChevronLeftIcon fontSize="small" />
                              </Button>
                              <Button
                                disabled
                                sx={{
                                  color: "#fff !important",
                                  minWidth: "40px",
                                }}
                              >
                                {queryPage}
                              </Button>
                              <Button
                                onClick={() => {
                                  const newPage = queryPage + 1;
                                  setQueryPage(newPage);
                                  fetchTableData(
                                    selectedTable,
                                    queryLimit,
                                    newPage,
                                  );
                                }}
                                disabled={tableData.length < queryLimit}
                              >
                                <ChevronRightIcon fontSize="small" />
                              </Button>
                            </ButtonGroup>

                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              startIcon={<AddIcon />}
                              onClick={handleAddNewRecord}
                            >
                              New Record
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<StorageIcon />}
                              onClick={() => fetchTableData(selectedTable)}
                            >
                              Refresh
                            </Button>
                          </Box>
                        )}
                      </Box>
                      {loadingData ? (
                        <Box
                          sx={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <CircularProgress />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            flex: 1,
                            overflowY: "auto",
                            pb: 2,
                          }}
                        >
                          {tableData.length > 0 ? (
                            <Grid container spacing={2}>
                              {tableData.map((row) => {
                                const isEditing = editingRowId === row.id;
                                const displayData = isEditing
                                  ? editFormData
                                  : row;

                                return (
                                  <Grid item xs={12} key={row.id}>
                                    <Card
                                      sx={{
                                        bgcolor: "#1a1a1a",
                                        border: isEditing
                                          ? "1px solid #4a9eff66"
                                          : "1px solid #2d2d2d",
                                        borderRadius: 1.5,
                                        overflow: "hidden",
                                        boxShadow: isEditing
                                          ? "0 0 12px #4a9eff22"
                                          : "none",
                                        transition: "all 0.15s ease",
                                      }}
                                    >
                                      {/* Header */}
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          px: 2,
                                          py: 0.8,
                                          bgcolor: "#252526",
                                          borderBottom: "1px solid #2d2d2d",
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            overflow: "hidden",
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: 6,
                                              height: 6,
                                              flexShrink: 0,
                                              borderRadius: "50%",
                                              bgcolor: isEditing
                                                ? "#4a9eff"
                                                : "#3c3c3c",
                                              border: "1px solid",
                                              borderColor: isEditing
                                                ? "#4a9eff"
                                                : "#555",
                                            }}
                                          />
                                          <Typography
                                            noWrap
                                            sx={{
                                              color: "#e0e0e0",
                                              fontSize: 12.5,
                                              fontWeight: 600,
                                              fontFamily:
                                                "'Fira Code', 'JetBrains Mono', monospace",
                                              letterSpacing: 0,
                                            }}
                                          >
                                            {String(
                                              Object.values(displayData).find(
                                                (v) =>
                                                  v !== null &&
                                                  v !== undefined &&
                                                  String(v).length > 2 &&
                                                  String(v).length < 80,
                                              ) ?? row.id,
                                            ).slice(0, 72)}
                                          </Typography>
                                        </Box>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            flexShrink: 0,
                                            gap: 0.3,
                                          }}
                                        >
                                          {isEditing ? (
                                            <>
                                              <Tooltip title="Save (Ctrl+S)">
                                                <IconButton
                                                  size="small"
                                                  color="primary"
                                                  onClick={handleSaveClick}
                                                  sx={{
                                                    p: 0.5,
                                                    borderRadius: 1,
                                                    "&:hover": {
                                                      bgcolor: "#4a9eff18",
                                                    },
                                                  }}
                                                >
                                                  <SaveIcon
                                                    sx={{ fontSize: 15 }}
                                                  />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="Cancel">
                                                <IconButton
                                                  size="small"
                                                  onClick={handleCancelClick}
                                                  sx={{
                                                    p: 0.5,
                                                    borderRadius: 1,
                                                    color: "#666",
                                                    "&:hover": {
                                                      bgcolor: "#ff444418",
                                                      color: "#ff6666",
                                                    },
                                                  }}
                                                >
                                                  <CancelIcon
                                                    sx={{ fontSize: 15 }}
                                                  />
                                                </IconButton>
                                              </Tooltip>
                                            </>
                                          ) : (
                                            <>
                                              <Tooltip title="Edit">
                                                <IconButton
                                                  size="small"
                                                  onClick={() =>
                                                    handleEditClick(row)
                                                  }
                                                  sx={{
                                                    p: 0.5,
                                                    borderRadius: 1,
                                                    color: "#555",
                                                    "&:hover": {
                                                      bgcolor: "#4a9eff18",
                                                      color: "#4a9eff",
                                                    },
                                                  }}
                                                >
                                                  <EditIcon
                                                    sx={{ fontSize: 15 }}
                                                  />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="Delete">
                                                <IconButton
                                                  size="small"
                                                  onClick={() =>
                                                    handleDeleteClick(
                                                      row.id,
                                                      row,
                                                    )
                                                  }
                                                  sx={{
                                                    p: 0.5,
                                                    borderRadius: 1,
                                                    color: "#555",
                                                    "&:hover": {
                                                      bgcolor: "#ff444418",
                                                      color: "#ff5555",
                                                    },
                                                  }}
                                                >
                                                  <DeleteOutlinedIcon
                                                    sx={{ fontSize: 15 }}
                                                  />
                                                </IconButton>
                                              </Tooltip>
                                            </>
                                          )}
                                        </Box>
                                      </Box>

                                      {/* Body: two-column table */}
                                      <Box
                                        component="table"
                                        sx={{
                                          width: "100%",
                                          borderCollapse: "collapse",
                                        }}
                                      >
                                        <Box component="tbody">
                                          {Object.entries(displayData)
                                            .filter(
                                              ([k]) =>
                                                k !== "id" && k !== "isNew",
                                            )
                                            .map(([k, v], idx) => (
                                              <Box
                                                component="tr"
                                                key={k}
                                                sx={{
                                                  bgcolor:
                                                    idx % 2 === 0
                                                      ? "#1a1a1a"
                                                      : "#1f1f1f",
                                                  "&:hover": {
                                                    bgcolor: "#252525",
                                                  },
                                                }}
                                              >
                                                <Box
                                                  component="td"
                                                  sx={{
                                                    px: 2,
                                                    py: 0.6,
                                                    width: "28%",
                                                    minWidth: "120px",
                                                    borderRight:
                                                      "1px solid #2a2a2a",
                                                    verticalAlign: "middle",
                                                  }}
                                                >
                                                  <Typography
                                                    sx={{
                                                      color: "#6bb5f0",
                                                      fontSize: 11.5,
                                                      fontFamily:
                                                        "'Fira Code', monospace",
                                                      userSelect: "none",
                                                      lineHeight: 1.5,
                                                    }}
                                                  >
                                                    {k}
                                                  </Typography>
                                                </Box>
                                                <Box
                                                  component="td"
                                                  sx={{
                                                    px: 2,
                                                    py: 0.6,
                                                    verticalAlign: "middle",
                                                  }}
                                                >
                                                  {isEditing ? (
                                                    <TextField
                                                      fullWidth
                                                      size="small"
                                                      variant="standard"
                                                      value={
                                                        v === null ||
                                                        v === undefined
                                                          ? ""
                                                          : String(v)
                                                      }
                                                      onChange={(e) =>
                                                        handleFieldChange(
                                                          k,
                                                          e.target.value,
                                                        )
                                                      }
                                                      sx={{
                                                        "& .MuiInput-root": {
                                                          color: "#e8e8e8",
                                                          fontSize: 11.5,
                                                          fontFamily:
                                                            "'Fira Code', monospace",
                                                        },
                                                        "& .MuiInput-underline:before":
                                                          {
                                                            borderColor: "#333",
                                                          },
                                                        "& .MuiInput-underline:hover:before":
                                                          {
                                                            borderColor:
                                                              "#4a9eff",
                                                          },
                                                        "& .MuiInput-underline:after":
                                                          {
                                                            borderColor:
                                                              "#4a9eff",
                                                          },
                                                      }}
                                                    />
                                                  ) : (
                                                    <Typography
                                                      sx={{
                                                        color:
                                                          v === null ||
                                                          v === undefined
                                                            ? "#444"
                                                            : "#bbb",
                                                        fontSize: 11.5,
                                                        fontStyle:
                                                          v === null ||
                                                          v === undefined
                                                            ? "italic"
                                                            : "normal",
                                                        fontFamily:
                                                          "'Fira Code', monospace",
                                                        wordBreak: "break-all",
                                                        lineHeight: 1.5,
                                                      }}
                                                    >
                                                      {v === null ||
                                                      v === undefined
                                                        ? "null"
                                                        : String(v)}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              </Box>
                                            ))}
                                        </Box>
                                      </Box>
                                    </Card>
                                  </Grid>
                                );
                              })}
                            </Grid>
                          ) : (
                            <Box
                              sx={{ p: 3, textAlign: "center", color: "#666" }}
                            >
                              No data to display.
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* QUERY EDITOR */}
                  {tab === 1 && (
                    <PanelGroup orientation="vertical">
                      <Panel defaultSize={50} minSize={20}>
                        <Box
                          sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <Box
                            sx={{
                              p: 1,
                              display: "flex",
                              bgcolor: "#2d2d2d",
                              borderBottom: "1px solid #1e1e1e",
                            }}
                          >
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<PlayArrowIcon />}
                              onClick={executeQuery}
                              disabled={runningQuery}
                            >
                              Run Query
                            </Button>
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Editor
                              height="100%"
                              defaultLanguage={getLanguage()}
                              theme="vs-dark"
                              value={queryCode}
                              onChange={(v) => setQueryCode(v || "")}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                              }}
                            />
                          </Box>
                        </Box>
                      </Panel>
                      <PanelResizeHandle
                        style={{
                          height: 4,
                          background: "#333",
                          cursor: "row-resize",
                        }}
                      />
                      <Panel defaultSize={50}>
                        <Box sx={{ height: "100%", bgcolor: "#fff" }}>
                          {runningQuery ? (
                            <Box
                              sx={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "#1e1e1e",
                              }}
                            >
                              <CircularProgress />
                            </Box>
                          ) : queryCols.length > 0 ? (
                            <DataGrid
                              rows={queryResults}
                              columns={queryCols}
                              density="compact"
                              slots={{ toolbar: GridToolbar }}
                              disableRowSelectionOnClick
                              sx={{ border: "none", height: "100%" }}
                            />
                          ) : (
                            <Box
                              sx={{
                                p: 2,
                                bgcolor: "#1e1e1e",
                                color: "#666",
                                height: "100%",
                              }}
                            >
                              Results will appear here
                            </Box>
                          )}
                        </Box>
                      </Panel>
                    </PanelGroup>
                  )}

                  {/* RAW TERMINAL */}
                  {tab === 2 && (
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        p: 1,
                        bgcolor: "#1e1e1e",
                      }}
                    >
                      {/* For now we just embed RemoteTerminal. Advanced initial commands can be typed by the user directly. */}
                      <Typography
                        variant="caption"
                        sx={{ color: "#aaa", mb: 1, px: 1 }}
                      >
                        Connected to host via SSH. Type `
                        {container.type === "postgres"
                          ? "psql"
                          : container.type === "mysql"
                            ? "mysql"
                            : "mongosh"}
                        ` to enter the raw CLI.
                      </Typography>
                      <Box
                        sx={{
                          flex: 1,
                          border: "1px solid #333",
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        <RemoteTerminal
                          serverId={serverId || ""}
                          termId={9999 + Math.floor(Math.random() * 1000)}
                          deployPath="~"
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Panel>
          </PanelGroup>
        </Box>
      )}
    </Dialog>
  );
};

export default DatabaseStudio;
