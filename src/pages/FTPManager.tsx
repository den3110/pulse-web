import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  Paper,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Breadcrumbs,
  TablePagination,
  Link,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Checkbox,
  FormControlLabel,
  Skeleton,
  Tab,
  Tabs,
  LinearProgress,
  Menu,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  InputAdornment,
  Drawer,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemButton,
} from "@mui/material";
import { useServer } from "../contexts/ServerContext";
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  CreateNewFolder as CreateNewFolderIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  DriveFileRenameOutline as RenameIcon,
  Security as SecurityIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  MoreVert as MoreVertIcon,
  ContentCopy as CopyPathIcon,
  Link as SymlinkIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Search as SearchIcon,
  SortByAlpha as SortIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  BookmarkBorder as BookmarkIcon,
  Star as StarIcon,
  StarOutline as StarOutlineIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  FolderZip as ZipIcon,
  Unarchive as UnzipIcon,
  ContentCut as CutIcon,
  ContentPaste as PasteIcon,
  FileCopy as FileCopyIcon,
  Image as ImageIcon,
  Storage as StorageIcon,
  History as HistoryIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  InfoOutlined as InfoIcon,
  DriveFileMove as DriveFileMoveIcon,
  Terminal as TerminalIcon,
  NoteAdd as NoteAddIcon, // For New File
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../services/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import CodeEditor from "../components/CodeEditor";
import ServerFolderBrowserDialog from "../components/ServerFolderBrowserDialog";
import TerminalTabs from "../components/TerminalTabs";

/* ─── Language detection helper ─── */
const detectLanguage = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    php: "php",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    html: "html",
    htm: "html",
    xml: "xml",
    svg: "xml",
    css: "css",
    scss: "scss",
    less: "less",
    sql: "sql",
    md: "markdown",
    dockerfile: "docker",
    conf: "nginx",
    nginx: "nginx",
    env: "bash",
    toml: "toml",
    ini: "ini",
    cfg: "ini",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    lua: "lua",
    r: "r",
  };
  return map[ext] || "text";
};

interface FileEntry {
  name: string;
  type: "file" | "directory" | "symlink";
  size: number;
  permissions: string;
  permissionsOctal: string;
  owner: number;
  group: number;
  modified: string;
  isHidden: boolean;
}

interface ServerOption {
  _id: string;
  name: string;
  host: string;
}

/* ─────────── helpers ─────────── */
function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function fileIcon(entry: FileEntry) {
  if (entry.type === "symlink")
    return <SymlinkIcon fontSize="small" sx={{ color: "info.main" }} />;
  if (entry.type === "directory")
    return <FolderIcon fontSize="small" sx={{ color: "warning.main" }} />;
  return <FileIcon fontSize="small" sx={{ color: "text.secondary" }} />;
}

/* ─── Memoized row components ─── */
/* ─── Memoized row components ─── */
interface RowProps {
  entry: FileEntry;
  selected: boolean;
  onSelect: (name: string) => void;
  onEntryClick: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent<HTMLElement>, entry: FileEntry) => void;
  onOpenTerminal: (entry: FileEntry) => void;
  folderSize?: string;
}

const FileTableRow = React.memo<RowProps>(
  ({
    entry,
    selected,
    onSelect,
    onEntryClick,
    onContextMenu,
    onOpenTerminal,
    folderSize,
  }) => (
    <TableRow
      hover
      onClick={() => onEntryClick(entry)}
      onContextMenu={(e) => onContextMenu(e, entry)}
      selected={selected}
      sx={{ cursor: "pointer", opacity: entry.isHidden ? 0.6 : 1 }}
    >
      <TableCell padding="checkbox">
        <Checkbox
          size="small"
          checked={selected}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(entry.name);
          }}
        />
      </TableCell>
      <TableCell>{fileIcon(entry)}</TableCell>
      <TableCell>
        <Typography
          component="div"
          variant="body2"
          fontWeight={entry.type === "directory" ? 600 : 400}
          sx={{
            color: entry.type === "directory" ? "primary.main" : "text.primary",
            display: "flex",
            alignItems: "center",
          }}
        >
          {entry.name}
          {entry.type === "symlink" && (
            <Chip label="link" size="small" sx={{ ml: 1 }} />
          )}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" color="text.secondary">
          {entry.type === "directory"
            ? folderSize || "—"
            : formatSize(entry.size)}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={entry.permissionsOctal}
          size="small"
          variant="outlined"
          title={entry.permissions}
          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {formatDate(entry.modified)}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTerminal(entry);
          }}
          sx={{ mr: 1 }}
        >
          <TerminalIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={(e) => onContextMenu(e, entry)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  ),
  (prev, next) => {
    return (
      prev.selected === next.selected &&
      prev.entry === next.entry &&
      prev.folderSize === next.folderSize &&
      prev.onSelect === next.onSelect &&
      prev.onEntryClick === next.onEntryClick &&
      prev.onContextMenu === next.onContextMenu &&
      prev.onOpenTerminal === next.onOpenTerminal
    );
  },
);

const FileCardRow = React.memo<RowProps>(
  ({
    entry,
    selected,
    onSelect,
    onEntryClick,
    onContextMenu,
    onOpenTerminal,
    folderSize,
  }) => (
    <Box
      onClick={() => onEntryClick(entry)}
      onContextMenu={(e) => onContextMenu(e, entry)}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 1.5,
        borderRadius: 2,
        bgcolor: selected
          ? "rgba(25, 118, 210, 0.12)"
          : "rgba(255,255,255,0.02)",
        border: "1px solid",
        borderColor: selected ? "primary.main" : "rgba(255,255,255,0.06)",
        transition: "all 0.2s",
        gap: 1,
        cursor: "pointer",
        opacity: entry.isHidden ? 0.6 : 1,
        "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mr: 1,
        }}
      >
        <Checkbox
          size="small"
          checked={selected}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(entry.name);
          }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flex: 1,
          minWidth: 0,
        }}
      >
        {fileIcon(entry)}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="body2"
            fontWeight={entry.type === "directory" ? 600 : 400}
            noWrap
            sx={{
              color:
                entry.type === "directory" ? "primary.main" : "text.primary",
            }}
          >
            {entry.name}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, mt: 0.25 }}>
            {entry.type !== "directory" && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: 11 }}
              >
                {formatSize(entry.size)}
              </Typography>
            )}
            {entry.type === "directory" && folderSize && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: 11 }}
              >
                {folderSize}
              </Typography>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 11 }}
            >
              {entry.permissionsOctal}
            </Typography>
          </Box>
        </Box>
      </Box>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onOpenTerminal(entry);
        }}
      >
        <TerminalIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={(e) => onContextMenu(e, entry)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
    </Box>
  ),
  (prev, next) => {
    return (
      prev.selected === next.selected &&
      prev.entry === next.entry &&
      prev.folderSize === next.folderSize &&
      prev.onSelect === next.onSelect &&
      prev.onEntryClick === next.onEntryClick &&
      prev.onContextMenu === next.onContextMenu &&
      prev.onOpenTerminal === next.onOpenTerminal
    );
  },
);

/* ────────── Component ────────── */
const FTPManager: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { t } = useTranslation();

  // Server state (Global)
  const {
    selectedServer,
    loading: loadingServers,
    servers,
    selectServer,
  } = useServer();

  // Local state for compatibility (derived from global) or unused
  // const [servers, setServers] = useState<ServerOption[]>([]);
  // const [selectedServer, setSelectedServer] = useState("");
  // const [loadingServers, setLoadingServers] = useState(true);

  /* ─── Query Params for Deep Linking ─── */
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPath = searchParams.get("path");
  const initialServerId = searchParams.get("server");

  // Browse state
  const [currentPath, setCurrentPath] = useState(initialPath || "/");

  // Effect: Auto-select server if provided in URL
  useEffect(() => {
    if (initialServerId && !loadingServers && servers.length > 0) {
      // Only switch if different (and exists)
      const target = servers.find((s) => s._id === initialServerId);
      if (target && selectedServer?._id !== target._id) {
        selectServer(target._id);
      }
    }
  }, [initialServerId, servers, loadingServers, selectedServer, selectServer]);

  // Effect: Update path if URL params change (e.g. navigation from another page while component is mounted)
  useEffect(() => {
    const p = searchParams.get("path");
    if (p && p !== currentPath) {
      setCurrentPath(p);
    }
  }, [searchParams]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  // Client-side cache for directory listings

  // Client-side cache for directory listings (useRef to avoid re-renders and dependency loops)
  const dirCache = useRef<
    Record<string, { entries: FileEntry[]; timestamp: number }>
  >({});
  const CACHE_DURATION = 60 * 1000; // 1 minute cache
  const [showHidden, setShowHidden] = useState(() => {
    return localStorage.getItem("ftp_showHidden") === "true";
  });

  useEffect(() => {
    localStorage.setItem("ftp_showHidden", String(showHidden));
  }, [showHidden]);
  const [folderSizes, setFolderSizes] = useState<Record<string, string>>({});

  useEffect(() => {
    setFolderSizes({});
  }, [currentPath]);

  // Search & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "size" | "modified" | "type">(
    "name",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Reset page when path changes
  useEffect(() => {
    setPage(0);
  }, [currentPath, searchQuery]);

  // Dialogs
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPath, setEditorPath] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<"edit" | "preview">("edit");

  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [mkdirName, setMkdirName] = useState(""); // Renamed from newDirName

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
  const [newName, setNewName] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);

  const [chmodOpen, setChmodOpen] = useState(false);
  const [chmodTarget, setChmodTarget] = useState<FileEntry | null>(null);
  const [chmodMode, setChmodMode] = useState("");

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<FileEntry | null>(null);
  const [moveDestination, setMoveDestination] = useState("");
  const [moveBrowserOpen, setMoveBrowserOpen] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [propertiesTarget, setPropertiesTarget] = useState<FileEntry | null>(
    null,
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-select
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Clipboard (cut/copy)
  const [clipboard, setClipboard] = useState<{
    mode: "cut" | "copy";
    sourcePath: string;
    entries: FileEntry[];
  } | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    () => (localStorage.getItem("ftp_viewMode") as "list" | "grid") || "list",
  );

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ftp_bookmarks") || "[]");
    } catch {
      return [];
    }
  });
  const [bookmarkDrawerOpen, setBookmarkDrawerOpen] = useState(false);

  // Recent files
  const [recentFiles, setRecentFiles] = useState<
    { path: string; name: string; time: number }[]
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("ftp_recent") || "[]");
    } catch {
      return [];
    }
  });
  const [recentDrawerOpen, setRecentDrawerOpen] = useState(false);

  // Breadcrumb path input
  const [pathInputMode, setPathInputMode] = useState(false);
  const [pathInputValue, setPathInputValue] = useState("");

  // Disk usage
  const [diskUsage, setDiskUsage] = useState<{
    size: string;
    used: string;
    available: string;
    usePercent: string;
  } | null>(null);

  // File preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");

  // Zip dialog
  const [zipOpen, setZipOpen] = useState(false);
  const [zipName, setZipName] = useState("");

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    anchor?: HTMLElement;
    mouse?: { mouseX: number; mouseY: number };
    entry: FileEntry;
  } | null>(null);

  // Terminal
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalPath, setTerminalPath] = useState("");

  // Create File
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [createFileName, setCreateFileName] = useState("");

  const handleCreateFile = async () => {
    if (!createFileName) return;
    const cleanName = createFileName.trim();
    const fullPath =
      (currentPath === "/" ? "/" : currentPath + "/") + cleanName;
    const cacheKey = `${selectedServer?._id}:${currentPath}`; // Current dir cache key

    // Optimistic update
    const tempEntry: FileEntry = {
      name: cleanName,
      type: "file",
      size: 0,
      permissions: "644",
      permissionsOctal: "644",
      owner: 0,
      group: 0,
      modified: new Date().toISOString(),
      isHidden: cleanName.startsWith("."),
    };
    setEntries((prev) =>
      [...prev, tempEntry].sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return a.name.localeCompare(b.name);
      }),
    );
    // Update Cache heavily to prevent stale data on re-visit
    // Update Cache heavily to prevent stale data on re-visit
    if (dirCache.current[cacheKey]) {
      dirCache.current[cacheKey] = {
        ...dirCache.current[cacheKey],
        entries: [...dirCache.current[cacheKey].entries, tempEntry],
      };
    }

    setCreateFileOpen(false);
    setCreateFileName("");

    try {
      await api.post(`/ftp/${selectedServer?._id}/write`, {
        path: fullPath,
        content: "",
      });
      toast.success(t("ftp.fileCreated"));
      // No need to browse() immediately if we trust our optimistic update,
      // but browsing ensures we get real metadata (owner, permissions, etc.)
      // Let's browse quietly (without full loading spinner if possible, or just rely on next refresh)
      // For now, allow browse to sync state
      browse(currentPath, true);
    } catch (err: any) {
      // Revert optimistic update
      setEntries((prev) => prev.filter((e) => e.name !== cleanName));
      toast.error(err.response?.data?.message || t("ftp.createFailed"));
    }
  };

  const handleOpenTerminal = (path?: string) => {
    setTerminalPath(path || currentPath);
    setTerminalOpen(true);
    setContextMenu(null);
  };

  const handleOpenTerminalEntry = useCallback(
    (entry: FileEntry) => {
      handleOpenTerminal(
        entry.type === "directory"
          ? (currentPath === "/" ? "" : currentPath) + "/" + entry.name
          : currentPath,
      );
    },
    [currentPath, handleOpenTerminal],
  );

  /* ─── Fetch servers (Handled globally) ─── */
  // useEffect(() => {
  //   api
  //     .get("/servers")
  //     .then((res) => {
  //       setServers(res.data);
  //       // Do not auto-select first server
  //       // if (res.data.length > 0) setSelectedServer(res.data[0]._id);
  //     })
  //     .catch(() => toast.error(t("ftp.loadServersFailed")))
  //     .finally(() => setLoadingServers(false));
  // }, []);

  /* ─── Browse directory ─── */
  const browse = useCallback(
    async (path: string, silent = false) => {
      if (!selectedServer) return;

      // Check cache first
      // Check cache first
      const cacheKey = `${selectedServer._id}:${path}`;
      const cached = dirCache.current[cacheKey];
      const isCachedValid =
        cached && Date.now() - cached.timestamp < CACHE_DURATION;

      if (isCachedValid && !silent) {
        setEntries(cached.entries);
        setCurrentPath(path);
        setSearchQuery("");
        setLoading(false);
        // Optional: Background re-validate if needed, but for now we trust cache to avoid "lag"
        // If we want SWR, we would continue to fetch here but without setting loading=true
        // Let's implement SWR-lite: use cache, but fetch fresh data silently
        silent = true;
      }

      if (!silent) setLoading(true);

      try {
        const { data } = await api.get(`/ftp/${selectedServer?._id}/list`, {
          params: { path, showHidden },
        });

        // Update state
        setEntries(data.entries);
        setCurrentPath(data.path);
        setSearchQuery("");

        // Update cache
        dirCache.current[cacheKey] = {
          entries: data.entries,
          timestamp: Date.now(),
        };
      } catch (err: any) {
        toast.error(err.response?.data?.message || t("ftp.browseFailed"));
      } finally {
        setLoading(false);
      }
    },
    [selectedServer, showHidden], // removed dirCache dependency
  );

  useEffect(() => {
    if (selectedServer) browse(currentPath);
  }, [selectedServer, showHidden, currentPath, browse]);

  /* ─── Navigation ─── */
  /* ─── Navigation ─── */
  const navigateTo = useCallback(
    (path: string) => {
      setSearchParams((prev) => {
        prev.set("path", path);
        if (selectedServer) {
          prev.set("server", selectedServer._id);
        }
        return prev;
      });
    },
    [setSearchParams, selectedServer],
  );

  const goUp = useCallback(() => {
    if (currentPath === "/") return;
    const parent = currentPath.replace(/\/[^/]+\/?$/, "") || "/";
    navigateTo(parent);
  }, [currentPath, navigateTo]);

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split("/").filter(Boolean);
    const crumbs = [{ label: "/", path: "/" }];
    let acc = "";
    for (const part of parts) {
      acc += "/" + part;
      crumbs.push({ label: part, path: acc });
    }
    return crumbs;
  }, [currentPath]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }

    // Sort: directories first, then by field
    result = [...result].sort((a, b) => {
      // Directories always first
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;

      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "size":
          cmp = (a.size || 0) - (b.size || 0);
          break;
        case "modified":
          cmp = new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
        case "type":
          cmp = a.name
            .split(".")
            .pop()!
            .localeCompare(b.name.split(".").pop()!);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [entries, searchQuery, sortBy, sortDir]);

  const visibleEntries = useMemo(() => {
    return filteredEntries.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [filteredEntries, page, rowsPerPage]);

  // Optimization: Auto folder size calculation
  useEffect(() => {
    if (!selectedServer || loading) return;

    // Only fetch for visible directories that don't have size yet
    const visibleDirs = visibleEntries
      .filter((e) => e.type === "directory" && !folderSizes[e.name])
      .map((e) => e.name);

    if (visibleDirs.length === 0) return;

    api
      .post(`/ftp/${selectedServer._id}/dir-sizes`, {
        path: currentPath,
        items: visibleDirs,
      })
      .then((res) => {
        setFolderSizes((prev) => ({ ...prev, ...res.data }));
      })
      .catch(() => {
        // ignore error
      });
  }, [selectedServer, currentPath, loading, visibleEntries, folderSizes]);

  /* ─── File actions ─── */
  const toggleSelectFile = useCallback((name: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleEntryClick = useCallback(
    (entry: FileEntry) => {
      if (selectMode) {
        toggleSelectFile(entry.name);
        return;
      }
      if (entry.type === "directory" || entry.type === "symlink") {
        navigateTo(
          (currentPath === "/" ? "/" : currentPath + "/") + entry.name,
        );
      } else {
        // Open text editor
        openEditor(entry);
      }
    },
    [currentPath, navigateTo, selectMode, toggleSelectFile],
  );

  const openEditor = useCallback(
    async (entry: FileEntry) => {
      const filePath =
        (currentPath === "/" ? "/" : currentPath + "/") + entry.name;
      setEditorTab("edit");
      const toastId = toast.loading(t("ftp.loading"));
      try {
        const { data } = await api.get(`/ftp/${selectedServer?._id}/read`, {
          params: { path: filePath },
        });
        toast.dismiss(toastId);
        setEditorPath(filePath);
        setEditorContent(data.content);
        setEditorOpen(true);
        addRecentFile(filePath, entry.name);
      } catch (err: any) {
        toast.dismiss(toastId);
        toast.error(err.response?.data?.message || t("ftp.readFailed"));
      }
    },
    [currentPath, selectedServer],
  );

  const saveEditor = useCallback(async () => {
    setEditorSaving(true);
    try {
      await api.post(`/ftp/${selectedServer?._id}/write`, {
        path: editorPath,
        content: editorContent,
      });
      toast.success(t("ftp.fileSaved"));
      setEditorOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("ftp.saveFailed"));
    } finally {
      setEditorSaving(false);
    }
  }, [selectedServer, editorPath, editorContent]);

  const handleDownload = useCallback(
    async (entry: FileEntry) => {
      const filePath =
        (currentPath === "/" ? "/" : currentPath + "/") + entry.name;
      try {
        const response = await api.get(`/ftp/${selectedServer?._id}/download`, {
          params: { path: filePath },
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", entry.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        toast.error(t("ftp.downloadFailed"));
      }
    },
    [currentPath, selectedServer],
  );

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.append("file", files[i]);
          formData.append("path", currentPath);
          await api.post(`/ftp/${selectedServer?._id}/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        toast.success(t("ftp.uploadSuccess", { count: files.length }));
        browse(currentPath);
      } catch (err: any) {
        toast.error(err.response?.data?.message || t("ftp.uploadFailed"));
      } finally {
        setUploading(false);
        setUploadOpen(false);
      }
    },
    [currentPath, selectedServer, browse],
  );

  const handleMkdir = useCallback(async () => {
    if (!mkdirName.trim()) return;
    const cleanName = mkdirName.trim();
    const path = (currentPath === "/" ? "/" : currentPath + "/") + cleanName;
    const cacheKey = `${selectedServer?._id}:${currentPath}`;

    // Optimistic update
    const tempEntry: FileEntry = {
      name: cleanName,
      type: "directory",
      size: 4096, // placeholder
      permissions: "755",
      permissionsOctal: "755",
      owner: 0,
      group: 0,
      modified: new Date().toISOString(),
      isHidden: cleanName.startsWith("."),
    };
    setEntries((prev) => {
      const next = [...prev, tempEntry];
      return next.sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return a.name.localeCompare(b.name);
      });
    });

    if (dirCache.current[cacheKey]) {
      dirCache.current[cacheKey] = {
        ...dirCache.current[cacheKey],
        entries: [...dirCache.current[cacheKey].entries, tempEntry],
      };
    }

    setMkdirOpen(false);
    setMkdirName("");

    try {
      await api.post(`/ftp/${selectedServer?._id}/mkdir`, { path });
      toast.success(t("ftp.created"));
      browse(currentPath, true);
    } catch (err: any) {
      setEntries((prev) => prev.filter((e) => e.name !== cleanName));
      toast.error(err.response?.data?.message || t("ftp.createFailed"));
    }
  }, [currentPath, selectedServer, mkdirName, browse]);

  const handleRename = useCallback(async () => {
    if (!renameTarget || !newName.trim()) return;
    setProcessing(true);
    const oldPath =
      (currentPath === "/" ? "/" : currentPath + "/") + renameTarget.name;
    const newPath =
      (currentPath === "/" ? "/" : currentPath + "/") + newName.trim();
    try {
      await api.post(`/ftp/${selectedServer?._id}/rename`, {
        oldPath,
        newPath,
      });
      toast.success(t("ftp.renamed"));
      setRenameOpen(false);
      setRenameTarget(null);
      setNewName("");
      browse(currentPath);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("ftp.renameFailed"));
    } finally {
      setProcessing(false);
    }
  }, [currentPath, selectedServer, renameTarget, newName, browse]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setProcessing(true);
    const filePath =
      (currentPath === "/" ? "/" : currentPath + "/") + deleteTarget.name;
    try {
      await api.delete(`/ftp/${selectedServer?._id}/file`, {
        params: { path: filePath, type: deleteTarget.type },
      });
      toast.success(t("ftp.deleted"));
      setDeleteOpen(false);
      setDeleteTarget(null);
      browse(currentPath);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("ftp.deleteFailed"));
    } finally {
      setProcessing(false);
    }
  }, [currentPath, selectedServer, deleteTarget, browse]);

  const handleChmod = useCallback(async () => {
    if (!chmodTarget || !chmodMode.trim()) return;
    setProcessing(true);
    const filePath =
      (currentPath === "/" ? "/" : currentPath + "/") + chmodTarget.name;
    try {
      await api.post(`/ftp/${selectedServer?._id}/chmod`, {
        path: filePath,
        mode: chmodMode.trim(),
      });
      toast.success(t("ftp.permUpdated"));
      setChmodOpen(false);
      setChmodTarget(null);
      setChmodMode("");
      browse(currentPath);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("ftp.chmodFailed"));
    } finally {
      setProcessing(false);
    }
  }, [currentPath, selectedServer, chmodTarget, chmodMode, browse]);

  const handleMove = useCallback(async () => {
    if (!moveTarget || !moveDestination.trim()) return;
    setProcessing(true);
    const oldPath =
      (currentPath === "/" ? "/" : currentPath + "/") + moveTarget.name;
    // user enters target DIRECTORY, we append filename
    const destDir = moveDestination.trim().replace(/\/$/, "");
    const newPath = destDir + "/" + moveTarget.name;

    try {
      await api.post(`/ftp/${selectedServer?._id}/rename`, {
        oldPath,
        newPath,
      });
      toast.success(t("ftp.moved"));
      setMoveOpen(false);
      setMoveTarget(null);
      setMoveDestination("");
      browse(currentPath);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("ftp.moveFailed"));
    } finally {
      setProcessing(false);
    }
  }, [currentPath, selectedServer, moveTarget, moveDestination, browse, t]);

  const copyPath = useCallback(
    (entry: FileEntry) => {
      const filePath =
        (currentPath === "/" ? "/" : currentPath + "/") + entry.name;
      navigator.clipboard.writeText(filePath);
      toast.success(t("ftp.pathCopied"));
    },
    [currentPath],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLElement>, entry: FileEntry) => {
      e.stopPropagation();
      if (e.type === "contextmenu") {
        e.preventDefault();
        setContextMenu({
          mouse: { mouseX: e.clientX + 2, mouseY: e.clientY - 6 },
          entry,
        });
      } else {
        setContextMenu({ anchor: e.currentTarget, entry });
      }
    },
    [],
  );

  /* ────────── Drag & Drop ────────── */
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload],
  );

  /* ────────── Multi-select helpers ────────── */

  const selectAll = useCallback(() => {
    setSelectedFiles(new Set(filteredEntries.map((e) => e.name)));
  }, [filteredEntries]);

  const deselectAll = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;
    setProcessing(true);
    try {
      const paths = Array.from(selectedFiles).map(
        (name) => (currentPath === "/" ? "/" : currentPath + "/") + name,
      );

      await api.post(`/ftp/${selectedServer?._id}/delete-multiple`, {
        paths,
      });

      toast.success(t("ftp.bulkDeleteDone", { count: selectedFiles.size }));
      setSelectedFiles(new Set());
      setSelectMode(false);
      setDeleteOpen(false);
      browse(currentPath);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("ftp.deleteFailed"));
    } finally {
      setProcessing(false);
    }
  }, [selectedFiles, currentPath, selectedServer, browse]);

  /* ────────── Clipboard (cut/copy/paste) ────────── */
  const handleCut = useCallback(() => {
    const selected = entries.filter((e) => selectedFiles.has(e.name));
    if (selected.length === 0 && contextMenu) {
      setClipboard({
        mode: "cut",
        sourcePath: currentPath,
        entries: [contextMenu.entry],
      });
    } else {
      setClipboard({ mode: "cut", sourcePath: currentPath, entries: selected });
    }
    toast.success(t("ftp.cutDone"));
    setContextMenu(null);
  }, [entries, selectedFiles, contextMenu, currentPath]);

  const handleCopy = useCallback(() => {
    const selected = entries.filter((e) => selectedFiles.has(e.name));
    if (selected.length === 0 && contextMenu) {
      setClipboard({
        mode: "copy",
        sourcePath: currentPath,
        entries: [contextMenu.entry],
      });
    } else {
      setClipboard({
        mode: "copy",
        sourcePath: currentPath,
        entries: selected,
      });
    }
    toast.success(t("ftp.copyDone"));
    setContextMenu(null);
  }, [entries, selectedFiles, contextMenu, currentPath]);

  const handlePaste = useCallback(async () => {
    if (!clipboard) return;
    setProcessing(true);
    try {
      for (const entry of clipboard.entries) {
        const source =
          (clipboard.sourcePath === "/" ? "/" : clipboard.sourcePath + "/") +
          entry.name;
        const dest =
          (currentPath === "/" ? "/" : currentPath + "/") + entry.name;
        if (clipboard.mode === "cut") {
          await api.post(`/ftp/${selectedServer?._id}/rename`, {
            oldPath: source,
            newPath: dest,
          });
        } else {
          await api.post(`/ftp/${selectedServer?._id}/copy`, {
            sourcePath: source,
            destPath: dest,
          });
        }
      }
      toast.success(t("ftp.pasteDone", { count: clipboard.entries.length }));
      if (clipboard.mode === "cut") setClipboard(null);
      browse(currentPath);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("ftp.pasteFailed"));
    } finally {
      setProcessing(false);
    }
  }, [clipboard, currentPath, selectedServer, browse]);

  /* ────────── View mode toggle ────────── */
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === "list" ? "grid" : "list";
      localStorage.setItem("ftp_viewMode", next);
      return next;
    });
  }, []);

  /* ────────── Bookmarks ────────── */
  const toggleBookmark = useCallback((path: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [...prev, path];
      localStorage.setItem("ftp_bookmarks", JSON.stringify(next));
      return next;
    });
  }, []);

  /* ────────── Recent files ────────── */
  const addRecentFile = useCallback((path: string, name: string) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((r) => r.path !== path);
      const next = [{ path, name, time: Date.now() }, ...filtered].slice(0, 20);
      localStorage.setItem("ftp_recent", JSON.stringify(next));
      return next;
    });
  }, []);

  /* ────────── Path input ────────── */
  const handlePathInputSubmit = useCallback(() => {
    const p = pathInputValue.trim();
    if (p && p.startsWith("/")) {
      navigateTo(p);
    }
    setPathInputMode(false);
  }, [pathInputValue, navigateTo]);

  /* ────────── Disk usage ────────── */
  const fetchDiskUsage = useCallback(async () => {
    if (!selectedServer) return;
    try {
      const { data } = await api.get(`/ftp/${selectedServer?._id}/disk`, {
        params: { path: currentPath },
      });
      setDiskUsage(data);
    } catch {
      setDiskUsage(null);
    }
  }, [selectedServer, currentPath]);

  useEffect(() => {
    if (selectedServer) fetchDiskUsage();
  }, [selectedServer, currentPath]);

  /* ────────── File preview ────────── */
  const isImageFile = useCallback((name: string) => {
    return /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(name);
  }, []);

  const isArchiveFile = useCallback((name: string) => {
    return /\.(tar\.gz|tgz|tar\.bz2|tar|zip|gz|rar|7z)$/i.test(name);
  }, []);

  const handlePreview = useCallback(
    (entry: FileEntry) => {
      if (!isImageFile(entry.name)) return;
      try {
        const filePath =
          (currentPath === "/" ? "/" : currentPath + "/") + entry.name;
        const token = localStorage.getItem("accessToken");
        const url = `/api/ftp/${selectedServer?._id}/preview?path=${encodeURIComponent(
          filePath,
        )}&token=${token}`;

        setPreviewUrl(url);
        setPreviewName(entry.name);
        setPreviewOpen(true);
      } catch {
        toast.error(t("ftp.previewFailed"));
      }
    },
    [selectedServer, currentPath, isImageFile],
  );

  /* ────────── Zip / Unzip ────────── */
  const handleZip = useCallback(async () => {
    if (!zipName.trim()) return;
    setProcessing(true);
    const items =
      selectedFiles.size > 0
        ? Array.from(selectedFiles)
        : contextMenu
          ? [contextMenu.entry.name]
          : [];
    if (items.length === 0) return;
    try {
      await api.post(`/ftp/${selectedServer?._id}/zip`, {
        archiveName: zipName.trim().endsWith(".tar.gz")
          ? zipName.trim()
          : zipName.trim() + ".tar.gz",
        items,
        basePath: currentPath,
      });
      toast.success(t("ftp.zipDone"));
      setZipOpen(false);
      setZipName("");
      setSelectedFiles(new Set());
      browse(currentPath);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("ftp.zipFailed"));
    } finally {
      setProcessing(false);
    }
  }, [
    zipName,
    selectedFiles,
    contextMenu,
    selectedServer,
    currentPath,
    browse,
  ]);

  const handleUnzip = useCallback(
    async (entry: FileEntry) => {
      setProcessing(true);
      const archivePath =
        (currentPath === "/" ? "/" : currentPath + "/") + entry.name;
      try {
        await api.post(`/ftp/${selectedServer?._id}/unzip`, {
          archivePath,
          destPath: currentPath,
        });
        toast.success(t("ftp.unzipDone"));
        browse(currentPath);
      } catch (err: any) {
        toast.error(err.response?.data?.message || t("ftp.unzipFailed"));
      } finally {
        setProcessing(false);
      }
    },
    [selectedServer, currentPath, browse],
  );

  /* ────────── RENDER ────────── */
  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          mb: 3,
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box>
          <Typography variant="body1" fontWeight={500}>
            {t("ftp.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("ftp.subtitle", { server: selectedServer?.name })}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Button
            variant="contained"
            size="small"
            startIcon={<UploadIcon />}
            onClick={() => setUploadOpen(true)}
            disabled={!selectedServer || processing}
          >
            {t("ftp.upload")}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TerminalIcon />}
            onClick={() => handleOpenTerminal(currentPath)}
            disabled={!selectedServer || processing}
            sx={{ mr: 1 }}
          >
            {t("ftp.terminal")}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CreateNewFolderIcon />}
            onClick={() => setMkdirOpen(true)}
            disabled={!selectedServer || processing}
          >
            {t("ftp.newFolder")}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<NoteAddIcon />}
            onClick={() => setCreateFileOpen(true)}
            disabled={!selectedServer || processing}
            sx={{ ml: 1 }}
          >
            {t("ftp.newFile")}
          </Button>

          <Divider orientation="vertical" flexItem />

          {/* Select mode */}
          <Tooltip title={t("ftp.selectMode")}>
            <IconButton
              size="small"
              color={selectMode ? "primary" : "default"}
              onClick={() => {
                setSelectMode((v) => !v);
                setSelectedFiles(new Set());
              }}
              disabled={!selectedServer || processing}
            >
              {selectMode ? <CheckBoxIcon /> : <CheckBoxBlankIcon />}
            </IconButton>
          </Tooltip>

          {/* Select all / deselect */}
          {selectMode && (
            <>
              <Tooltip title={t("ftp.selectAll")}>
                <IconButton size="small" onClick={selectAll}>
                  <SelectAllIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("ftp.deselectAll")}>
                <IconButton size="small" onClick={deselectAll}>
                  <DeselectIcon />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Bulk actions */}
          {selectMode && selectedFiles.size > 0 && (
            <>
              <Chip
                label={`${selectedFiles.size} ${t("ftp.selected")}`}
                size="small"
                color="primary"
              />
              <Tooltip title={t("ftp.zip")}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setZipName("archive.tar.gz");
                    setZipOpen(true);
                  }}
                  disabled={processing}
                >
                  <ZipIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("ftp.cut")}>
                <IconButton
                  size="small"
                  onClick={handleCut}
                  disabled={processing}
                >
                  <CutIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("ftp.copy")}>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  disabled={processing}
                >
                  <FileCopyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("ftp.bulkDelete")}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={handleBulkDelete}
                  disabled={processing}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Paste */}
          {clipboard && (
            <Tooltip title={t("ftp.paste") + ` (${clipboard.entries.length})`}>
              <IconButton size="small" color="primary" onClick={handlePaste}>
                <Badge badgeContent={clipboard.entries.length} color="primary">
                  <PasteIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          <Divider orientation="vertical" flexItem />

          {/* Bookmarks */}
          <Tooltip title={t("ftp.bookmarks")}>
            <IconButton
              size="small"
              onClick={() => setBookmarkDrawerOpen(true)}
            >
              <Badge badgeContent={bookmarks.length} color="primary">
                <BookmarkIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Recent */}
          <Tooltip title={t("ftp.recent")}>
            <IconButton size="small" onClick={() => setRecentDrawerOpen(true)}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>

          {/* View toggle */}
          <Tooltip
            title={viewMode === "list" ? t("ftp.gridView") : t("ftp.listView")}
          >
            <IconButton size="small" onClick={toggleViewMode}>
              {viewMode === "list" ? <GridViewIcon /> : <ViewListIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Server Selector + Controls (Removed - moved to Global Layout) */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: { xs: "stretch", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            {/* Server select removed */}

            <FormControlLabel
              control={
                <Checkbox
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {showHidden ? (
                    <VisibilityIcon fontSize="small" />
                  ) : (
                    <VisibilityOffIcon fontSize="small" />
                  )}
                  <Typography variant="body2">
                    {t("ftp.hiddenFiles")}
                  </Typography>
                </Box>
              }
            />

            <Box sx={{ flex: 1 }} />

            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title={t("ftp.refresh")}>
                <IconButton
                  onClick={() => browse(currentPath)}
                  disabled={!selectedServer}
                  size="small"
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={t("ftp.newFolder")}>
                <IconButton
                  onClick={() => setMkdirOpen(true)}
                  disabled={!selectedServer}
                >
                  <CreateNewFolderIcon />
                </IconButton>
              </Tooltip>

              {/* New File */}
              <Tooltip title={t("ftp.newFile")}>
                <IconButton
                  onClick={() => setCreateFileOpen(true)}
                  disabled={!selectedServer}
                >
                  <NoteAddIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Breadcrumbs */}
      <Card sx={{ mb: 3 }}>
        <CardContent
          sx={{
            p: { xs: 1.5, md: 2 },
            "&:last-child": { pb: { xs: 1.5, md: 2 } },
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Tooltip title={t("ftp.goUp")}>
            <span>
              <IconButton
                size="small"
                onClick={goUp}
                disabled={currentPath === "/" || loading}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {pathInputMode ? (
            <TextField
              size="small"
              value={pathInputValue}
              onChange={(e) => setPathInputValue(e.target.value)}
              onBlur={handlePathInputSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePathInputSubmit();
                if (e.key === "Escape") setPathInputMode(false);
              }}
              autoFocus
              placeholder="/"
              sx={{ flex: 1 }}
              InputProps={{
                sx: { fontFamily: "monospace", fontSize: "0.875rem" },
              }}
            />
          ) : (
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" />}
              sx={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                cursor: "pointer",
              }}
              maxItems={isMobile ? 3 : 8}
              onDoubleClick={() => {
                setPathInputValue(currentPath);
                setPathInputMode(true);
              }}
            >
              {breadcrumbs.map((crumb, i) => (
                <Link
                  key={crumb.path}
                  component="button"
                  underline="hover"
                  onClick={() => navigateTo(crumb.path)}
                  color={
                    i === breadcrumbs.length - 1 ? "text.primary" : "inherit"
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                    cursor: "pointer",
                    maxWidth: { xs: 100, sm: "none" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {i === 0 && <HomeIcon fontSize="small" />}
                  {crumb.label}
                </Link>
              ))}
            </Breadcrumbs>
          )}

          {/* Bookmark current path */}
          <Tooltip
            title={
              bookmarks.includes(currentPath)
                ? t("ftp.removeBookmark")
                : t("ftp.addBookmark")
            }
          >
            <IconButton
              size="small"
              onClick={() => toggleBookmark(currentPath)}
              color={bookmarks.includes(currentPath) ? "warning" : "default"}
            >
              {bookmarks.includes(currentPath) ? (
                <StarIcon fontSize="small" />
              ) : (
                <StarOutlineIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          {/* Disk usage */}
          {diskUsage && (
            <Tooltip
              title={`${t("ftp.diskUsage")}: ${diskUsage.used} / ${diskUsage.size} (${diskUsage.usePercent})`}
            >
              <Chip
                icon={<StorageIcon />}
                label={`${diskUsage.used} / ${diskUsage.size}`}
                size="small"
                variant="outlined"
                color={
                  parseInt(diskUsage.usePercent) > 90
                    ? "error"
                    : parseInt(diskUsage.usePercent) > 70
                      ? "warning"
                      : "default"
                }
                sx={{ flexShrink: 0 }}
              />
            </Tooltip>
          )}

          <Chip
            label={t("ftp.items", { count: filteredEntries.length })}
            size="small"
            variant="outlined"
            sx={{ display: { xs: "none", sm: "inline-flex" }, flexShrink: 0 }}
          />
          <TablePagination
            component="div"
            count={filteredEntries.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage={t("ftp.rowsPerPage")}
          />
        </CardContent>
      </Card>

      {/* Bulk Action Toolbar */}
      {selectedFiles.size > 0 && selectedServer ? (
        <Paper
          elevation={3}
          sx={{
            position: "fixed",
            bottom: { xs: 80, md: 40 },
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 3,
            py: 1.5,
            borderRadius: 8,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {selectedFiles.size} {t("ftp.selected")}
          </Typography>
          <Divider orientation="vertical" flexItem variant="middle" />
          <Tooltip title={t("ftp.bulkDelete")}>
            <IconButton
              color="error"
              size="small"
              onClick={() => {
                setDeleteTarget(null); // Ensure no single target
                setDeleteOpen(true);
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("ftp.deselectAll")}>
            <IconButton size="small" onClick={deselectAll}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Paper>
      ) : null}

      {/* Search & Sort toolbar */}
      {selectedServer && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 1,
            alignItems: { xs: "stretch", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <TextField
            size="small"
            placeholder={t("ftp.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, maxWidth: { sm: 300 } }}
          />
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
            {(["name", "size", "modified", "type"] as const).map((field) => (
              <Chip
                key={field}
                label={t(`ftp.sort.${field}`)}
                size="small"
                variant={sortBy === field ? "filled" : "outlined"}
                color={sortBy === field ? "primary" : "default"}
                onClick={() => {
                  if (sortBy === field) {
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                  } else {
                    setSortBy(field);
                    setSortDir("asc");
                  }
                }}
                icon={
                  sortBy === field ? (
                    sortDir === "asc" ? (
                      <ArrowUpIcon fontSize="small" />
                    ) : (
                      <ArrowDownIcon fontSize="small" />
                    )
                  ) : undefined
                }
                sx={{ cursor: "pointer" }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Loading bar */}
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* File list */}
      <Card
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        sx={{
          border: dragOver ? "2px dashed" : "2px solid transparent",
          borderColor: dragOver ? "primary.main" : "transparent",
          transition: "border-color 0.2s",
        }}
      >
        <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          {dragOver && (
            <Box
              sx={{
                textAlign: "center",
                py: 4,
                color: "primary.main",
                fontWeight: 600,
                fontSize: "1.1rem",
              }}
            >
              📥 {t("ftp.dropToUpload", { path: currentPath })}
            </Box>
          )}

          {loading ? (
            isMobile ? (
              /* Mobile skeleton */
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[0, 1].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: { xs: 1.5, md: 2 },
                      borderRadius: 2,
                      border: "1px solid rgba(255,255,255,0.06)",
                      gap: 1.5,
                    }}
                  >
                    <Skeleton variant="circular" width={8} height={8} />
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                          mb: 0.5,
                        }}
                      >
                        <Skeleton variant="text" width={100} height={22} />
                        <Skeleton variant="rounded" width={52} height={20} />
                      </Box>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Skeleton variant="text" width={150} height={16} />
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Skeleton variant="circular" width={28} height={28} />
                      <Skeleton variant="circular" width={28} height={28} />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : viewMode === "list" ? (
              /* Desktop skeleton - LIST */
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell width={40}>
                          <Skeleton variant="circular" width={24} height={24} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width="60%" />
                        </TableCell>
                        <TableCell align="right">
                          <Skeleton width={60} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={40} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={100} />
                        </TableCell>
                        <TableCell align="center">
                          <Skeleton variant="circular" width={28} height={28} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              /* Desktop skeleton - GRID */
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(3, 1fr)",
                    md: "repeat(4, 1fr)",
                    lg: "repeat(6, 1fr)",
                  },
                  gap: 1.5,
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid rgba(255,255,255,0.06)",
                      gap: 1,
                    }}
                  >
                    <Skeleton variant="circular" width={36} height={36} />
                    <Skeleton variant="text" width="80%" height={24} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                ))}
              </Box>
            )
          ) : !selectedServer ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <FolderIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="body1" color="text.secondary">
                {t("ftp.selectServer")}
              </Typography>
            </Box>
          ) : filteredEntries.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <FolderIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="body1" color="text.secondary">
                {searchQuery ? t("ftp.noResults") : t("ftp.emptyDir")}
              </Typography>
            </Box>
          ) : isMobile || viewMode === "list" ? (
            isMobile ? (
              /* ── Mobile: card rows ── */
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 1,
                    mb: 1,
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={
                      filteredEntries.length > 0 &&
                      selectedFiles.size === filteredEntries.length
                    }
                    indeterminate={
                      selectedFiles.size > 0 &&
                      selectedFiles.size < filteredEntries.length
                    }
                    onChange={(e) =>
                      e.target.checked ? selectAll() : deselectAll()
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t("ftp.selectAll")}
                  </Typography>
                </Box>
                {visibleEntries.map((entry) => (
                  <FileCardRow
                    key={entry.name}
                    entry={entry}
                    selected={selectedFiles.has(entry.name)}
                    onSelect={toggleSelectFile}
                    onEntryClick={handleEntryClick}
                    onContextMenu={handleContextMenu}
                    onOpenTerminal={handleOpenTerminalEntry}
                    folderSize={folderSizes[entry.name]}
                  />
                ))}
              </Box>
            ) : (
              /* ── Desktop: table layout ── */
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={
                            filteredEntries.length > 0 &&
                            selectedFiles.size === filteredEntries.length
                          }
                          indeterminate={
                            selectedFiles.size > 0 &&
                            selectedFiles.size < filteredEntries.length
                          }
                          onChange={(e) =>
                            e.target.checked ? selectAll() : deselectAll()
                          }
                        />
                      </TableCell>
                      <TableCell width={40} />
                      <TableCell sx={{ fontWeight: 700 }}>
                        {t("ftp.name")}
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700 }}
                        align="right"
                        width={100}
                      >
                        {t("ftp.size")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={120}>
                        {t("ftp.permissions")}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} width={170}>
                        {t("ftp.modified")}
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700 }}
                        width={120}
                        align="center"
                      >
                        {t("ftp.actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleEntries.map((entry) => (
                      <FileTableRow
                        key={entry.name}
                        entry={entry}
                        selected={selectedFiles.has(entry.name)}
                        onSelect={toggleSelectFile}
                        onEntryClick={handleEntryClick}
                        onContextMenu={handleContextMenu}
                        onOpenTerminal={handleOpenTerminalEntry}
                        folderSize={folderSizes[entry.name]}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : (
            /* ── Grid view ── */
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1,
                  mb: 2,
                }}
              >
                <Checkbox
                  size="small"
                  checked={
                    filteredEntries.length > 0 &&
                    selectedFiles.size === filteredEntries.length
                  }
                  indeterminate={
                    selectedFiles.size > 0 &&
                    selectedFiles.size < filteredEntries.length
                  }
                  onChange={(e) =>
                    e.target.checked ? selectAll() : deselectAll()
                  }
                />
                <Typography variant="body2" color="text.secondary">
                  {t("ftp.selectAll")} ({selectedFiles.size} selected)
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, 1fr)",
                    sm: "repeat(3, 1fr)",
                    md: "repeat(4, 1fr)",
                    lg: "repeat(6, 1fr)",
                  },
                  gap: 1.5,
                }}
              >
                {visibleEntries.map((entry) => (
                  <Box
                    key={entry.name}
                    onClick={() => {
                      if (selectMode) toggleSelectFile(entry.name);
                      else handleEntryClick(entry);
                    }}
                    onContextMenu={(e: React.MouseEvent<HTMLElement>) =>
                      handleContextMenu(e, entry)
                    }
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      position: "relative",
                      p: 2,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: selectedFiles.has(entry.name)
                        ? "primary.main"
                        : "divider",
                      bgcolor: selectedFiles.has(entry.name)
                        ? "action.selected"
                        : "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.light",
                        transform: "translateY(-2px)",
                        boxShadow: 1,
                      },
                      opacity: entry.isHidden ? 0.6 : 1,
                      minWidth: 0,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={selectedFiles.has(entry.name)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectFile(entry.name);
                      }}
                      sx={{
                        position: "absolute",
                        top: 4,
                        left: 4,
                        p: 0.5,
                        bgcolor: selectedFiles.has(entry.name)
                          ? "background.paper"
                          : "transparent",
                        borderRadius: "50%",
                      }}
                    />
                    <Box
                      sx={{
                        fontSize: 36,
                        mb: 0.5,
                        color:
                          entry.type === "directory"
                            ? "primary.main"
                            : "text.secondary",
                      }}
                    >
                      {fileIcon(entry)}
                    </Box>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        width: "100%",
                        textAlign: "center",
                        fontWeight: entry.type === "directory" ? 600 : 400,
                      }}
                    >
                      {entry.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ width: "100%", textAlign: "center" }}
                    >
                      {entry.type === "directory"
                        ? folderSizes[entry.name] || t("ftp.directory")
                        : formatSize(entry.size)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ─── Context menu ─── */}
      <Menu
        open={Boolean(contextMenu)}
        anchorReference={contextMenu?.mouse ? "anchorPosition" : "anchorEl"}
        anchorPosition={
          contextMenu?.mouse
            ? { top: contextMenu.mouse.mouseY, left: contextMenu.mouse.mouseX }
            : undefined
        }
        anchorEl={contextMenu?.anchor}
        onClose={() => setContextMenu(null)}
      >
        <MenuItem
          onClick={() => {
            if (contextMenu?.entry?.type === "directory") {
              handleOpenTerminal(
                (currentPath === "/" ? "" : currentPath) +
                  "/" +
                  contextMenu.entry.name,
              );
            } else {
              handleOpenTerminal(currentPath);
            }
          }}
        >
          <ListItemIcon>
            <TerminalIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("ftp.openTerminal")}</ListItemText>
        </MenuItem>
        <Divider />
        {/* Preview image */}
        {contextMenu?.entry.type === "file" &&
          isImageFile(contextMenu.entry.name) && (
            <MenuItem
              onClick={() => {
                handlePreview(contextMenu!.entry);
                setContextMenu(null);
              }}
            >
              <ListItemIcon>
                <ImageIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t("ftp.preview")}</ListItemText>
            </MenuItem>
          )}
        {contextMenu?.entry.type === "file" && (
          <MenuItem
            onClick={() => {
              openEditor(contextMenu!.entry);
              setContextMenu(null);
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("ftp.edit")}</ListItemText>
          </MenuItem>
        )}
        {contextMenu?.entry.type === "file" && (
          <MenuItem
            onClick={() => {
              handleDownload(contextMenu!.entry);
              setContextMenu(null);
            }}
          >
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t("ftp.download")}</ListItemText>
          </MenuItem>
        )}

        <Divider />

        {/* Cut / Copy */}
        <MenuItem onClick={handleCut}>
          <ListItemIcon>
            <CutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("ftp.cut")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCopy}>
          <ListItemIcon>
            <FileCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("ftp.copy")}</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setMoveTarget(contextMenu!.entry);
            setMoveDestination(currentPath);
            setMoveOpen(true);
            setContextMenu(null);
          }}
        >
          <ListItemIcon>
            <DriveFileMoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("ftp.moveTo")}</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setRenameTarget(contextMenu!.entry);
            setNewName(contextMenu!.entry.name);
            setRenameOpen(true);
            setContextMenu(null);
          }}
        >
          <ListItemIcon>
            <RenameIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("ftp.rename")}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setChmodTarget(contextMenu!.entry);
            setChmodMode(contextMenu!.entry.permissionsOctal);
            setChmodOpen(true);
            setContextMenu(null);
          }}
        >
          <ListItemIcon>
            <SecurityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("ftp.permissions")}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            copyPath(contextMenu!.entry);
            setContextMenu(null);
          }}
        >
          <ListItemIcon>
            <CopyPathIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("ftp.copyPath")}</ListItemText>
        </MenuItem>

        <Divider />

        {/* Zip */}
        <MenuItem
          onClick={() => {
            setZipName(contextMenu!.entry.name + ".tar.gz");
            setZipOpen(true);
            setContextMenu(null);
          }}
        >
          <ListItemIcon>
            <ZipIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("ftp.zip")}</ListItemText>
        </MenuItem>

        {/* Unzip (for archives) */}
        {contextMenu?.entry.type === "file" &&
          isArchiveFile(contextMenu.entry.name) && (
            <MenuItem
              onClick={() => {
                handleUnzip(contextMenu!.entry);
                setContextMenu(null);
              }}
            >
              <ListItemIcon>
                <UnzipIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t("ftp.extract")}</ListItemText>
            </MenuItem>
          )}

        <Divider />

        <MenuItem
          onClick={() => {
            setPropertiesTarget(contextMenu!.entry);
            setPropertiesOpen(true);
            setContextMenu(null);
          }}
        >
          <ListItemIcon>
            <InfoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("ftp.properties")}</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={() => {
            setDeleteTarget(contextMenu!.entry);
            setDeleteOpen(true);
            setContextMenu(null);
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>{t("ftp.delete")}</ListItemText>
        </MenuItem>
      </Menu>

      {/* ─── Editor dialog ─── */}
      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EditIcon />
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {editorPath}
          </Typography>
          <IconButton onClick={() => setEditorOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Tabs
          value={editorTab}
          onChange={(_, v) => setEditorTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: "divider", minHeight: 36 }}
        >
          <Tab
            label={t("ftp.edit")}
            value="edit"
            sx={{ minHeight: 36, py: 0 }}
          />
          <Tab
            label={t("ftp.preview")}
            value="preview"
            sx={{ minHeight: 36, py: 0 }}
          />
        </Tabs>
        <DialogContent dividers sx={{ p: 0, flex: 1, overflow: "auto" }}>
          {editorTab === "edit" ? (
            <CodeEditor
              value={editorContent}
              onChange={(val) => setEditorContent(val || "")}
              filename={editorPath}
              height="60vh"
            />
          ) : (
            <SyntaxHighlighter
              language={detectLanguage(editorPath)}
              style={vscDarkPlus}
              showLineNumbers
              wrapLines
              customStyle={{ margin: 0, borderRadius: 0, minHeight: 200 }}
            >
              {editorContent}
            </SyntaxHighlighter>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>
            {t("ftp.cancel")}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveEditor}
            disabled={editorSaving}
          >
            {editorSaving ? t("ftp.saving") : t("ftp.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Mkdir dialog ─── */}
      <Dialog
        open={mkdirOpen}
        onClose={() => setMkdirOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{t("ftp.createFolder")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t("ftp.folderName")}
            value={mkdirName}
            onChange={(e) => setMkdirName(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && handleMkdir()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMkdirOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleMkdir} variant="contained" disabled={loading}>
            {t("common.create")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Create File dialog ─── */}
      <Dialog
        open={createFileOpen}
        onClose={() => setCreateFileOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{t("ftp.createFile")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t("ftp.fileName")}
            value={createFileName}
            onChange={(e) => setCreateFileName(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFileOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleCreateFile}
            variant="contained"
            disabled={loading}
          >
            {t("common.create")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Rename dialog ─── */}
      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{t("ftp.rename")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t("ftp.renameTo", { name: renameTarget?.name })}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label={t("ftp.newName")}
            fullWidth
            variant="outlined"
            size="small"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={processing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !processing) handleRename();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)} disabled={processing}>
            {t("ftp.cancel")}
          </Button>
          <Button
            onClick={handleRename}
            variant="contained"
            disabled={processing || !newName.trim()}
          >
            {t("ftp.rename")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Move dialog ─── */}
      <Dialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{t("ftp.moveTo")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t("ftp.move")} <strong>{moveTarget?.name}</strong> to:
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label={t("ftp.path")}
            fullWidth
            variant="outlined"
            size="small"
            value={moveDestination}
            onChange={(e) => setMoveDestination(e.target.value)}
            disabled={processing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !processing) handleMove();
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setMoveBrowserOpen(true)}
                    edge="end"
                  >
                    <FolderIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <ServerFolderBrowserDialog
            open={moveBrowserOpen}
            onClose={() => setMoveBrowserOpen(false)}
            serverId={selectedServer?._id || ""}
            initialPath={currentPath}
            onSelect={(path) => setMoveDestination(path)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveOpen(false)} disabled={processing}>
            {t("ftp.cancel")}
          </Button>
          <Button
            onClick={handleMove}
            variant="contained"
            disabled={processing || !moveDestination.trim()}
          >
            {t("ftp.move")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete dialog ─── */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ color: "error.main" }}>
          {t("ftp.confirmDelete")}
        </DialogTitle>
        <DialogContent>
          <Typography component="div">
            {deleteTarget ? (
              <>
                {t("ftp.confirmDeleteMsg")} <strong>{deleteTarget.name}</strong>
                ?
                {deleteTarget.type === "directory" && (
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    ⚠️ {t("ftp.recursiveWarning")}
                  </Typography>
                )}
              </>
            ) : (
              <>
                {t("ftp.confirmDeleteMsg")}{" "}
                <strong>{selectedFiles.size} items</strong>?
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  ⚠️ {t("ftp.recursiveWarning")}
                </Typography>
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={processing}>
            {t("ftp.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={deleteTarget ? handleDelete : handleBulkDelete}
            disabled={processing}
          >
            {t("ftp.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Chmod dialog ─── */}
      <Dialog
        open={chmodOpen}
        onClose={() => setChmodOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{t("ftp.permissionsTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t("ftp.permissionsFor", { name: chmodTarget?.name })}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label={t("ftp.permissionsOctal")}
            placeholder="755"
            value={chmodMode}
            onChange={(e) => setChmodMode(e.target.value)}
            helperText={t("ftp.chmodHelper")}
            disabled={processing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !processing) handleChmod();
            }}
            sx={{ mt: 1 }}
            InputProps={{
              sx: { fontFamily: "monospace" },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChmodOpen(false)} disabled={processing}>
            {t("ftp.cancel")}
          </Button>
          <Button
            onClick={handleChmod}
            variant="contained"
            disabled={processing || !chmodMode.trim()}
          >
            {t("ftp.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Upload dialog ─── */}
      <Dialog
        open={uploadOpen}
        onClose={() => !uploading && setUploadOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{t("ftp.uploadFiles")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t("ftp.uploadTo")} <strong>{currentPath}</strong>
          </Typography>
          <Box
            sx={{
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "action.hover",
              },
              transition: "all 0.2s",
              mt: 2,
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
            <Typography>{t("ftp.clickOrDrop")}</Typography>
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleUpload(e.target.files)}
          />
          {uploading && <LinearProgress sx={{ mt: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>
            {t("ftp.close")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Bookmark drawer ─── */}
      <Drawer
        anchor="right"
        open={bookmarkDrawerOpen}
        onClose={() => setBookmarkDrawerOpen(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            <BookmarkIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            {t("ftp.bookmarks")}
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {bookmarks.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("ftp.noBookmarks")}
            </Typography>
          ) : (
            <List dense>
              {bookmarks.map((path) => (
                <ListItem
                  key={path}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => toggleBookmark(path)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                  disablePadding
                >
                  <ListItemButton
                    onClick={() => {
                      navigateTo(path);
                      setBookmarkDrawerOpen(false);
                    }}
                  >
                    <ListItemIcon>
                      <FolderIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={path}
                      primaryTypographyProps={{
                        noWrap: true,
                        sx: { fontFamily: "monospace", fontSize: "0.8rem" },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Drawer>

      {/* ─── Recent files drawer ─── */}
      <Drawer
        anchor="right"
        open={recentDrawerOpen}
        onClose={() => setRecentDrawerOpen(false)}
      >
        <Box sx={{ width: 320, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            <HistoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            {t("ftp.recent")}
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {recentFiles.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("ftp.noRecent")}
            </Typography>
          ) : (
            <List dense>
              {recentFiles.map((r) => (
                <ListItemButton
                  key={r.path + r.time}
                  onClick={() => {
                    const dir =
                      r.path.substring(0, r.path.lastIndexOf("/")) || "/";
                    navigateTo(dir);
                    setRecentDrawerOpen(false);
                  }}
                >
                  <ListItemIcon>
                    <FileIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={r.name}
                    secondary={r.path}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      sx: { fontFamily: "monospace", fontSize: "0.7rem" },
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Drawer>

      {/* ─── Image preview dialog ─── */}
      <Dialog
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          if (previewUrl) window.URL.revokeObjectURL(previewUrl);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <ImageIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          {previewName}
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", p: 2 }}>
          {previewUrl && (
            <img
              src={previewUrl}
              alt={previewName}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: 8,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPreviewOpen(false);
              if (previewUrl) window.URL.revokeObjectURL(previewUrl);
            }}
          >
            {t("ftp.close")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Zip dialog ─── */}
      <Dialog
        open={zipOpen}
        onClose={() => setZipOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <ZipIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          {t("ftp.createArchive")}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={t("ftp.archiveName")}
            value={zipName}
            onChange={(e) => setZipName(e.target.value)}
            helperText={t("ftp.archiveHelper")}
            disabled={processing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !processing) handleZip();
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZipOpen(false)} disabled={processing}>
            {t("ftp.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleZip}
            disabled={processing || !zipName.trim()}
          >
            {t("ftp.create")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Properties dialog ─── */}
      <Dialog
        open={propertiesOpen}
        onClose={() => setPropertiesOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>{t("ftp.properties")}</DialogTitle>
        <DialogContent>
          {propertiesTarget && (
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell variant="head" width={100}>
                    {t("ftp.name")}
                  </TableCell>
                  <TableCell sx={{ wordBreak: "break-all" }}>
                    {propertiesTarget.name}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell variant="head">{t("ftp.type")}</TableCell>
                  <TableCell>{propertiesTarget.type}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell variant="head">{t("ftp.path")}</TableCell>
                  <TableCell sx={{ wordBreak: "break-all" }}>
                    {(currentPath === "/" ? "/" : currentPath + "/") +
                      propertiesTarget.name}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell variant="head">{t("ftp.size")}</TableCell>
                  <TableCell>
                    {propertiesTarget.type === "directory"
                      ? folderSizes[propertiesTarget.name] || "—"
                      : formatSize(propertiesTarget.size)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell variant="head">{t("ftp.permissions")}</TableCell>
                  <TableCell>
                    {propertiesTarget.permissions} (
                    {propertiesTarget.permissionsOctal})
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell variant="head">{t("ftp.owner")}</TableCell>
                  <TableCell>
                    {propertiesTarget.owner} / {propertiesTarget.group}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell variant="head">{t("ftp.modified")}</TableCell>
                  <TableCell>{formatDate(propertiesTarget.modified)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPropertiesOpen(false)}>
            {t("ftp.close")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terminal Panel - Persistent */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "40vh",
          bgcolor: "#1e1e1e",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          zIndex: 1300, // Drawer z-index
          display: terminalOpen ? "block" : "none",
          boxShadow: "0px -4px 20px rgba(0,0,0,0.5)",
          transition: "transform 0.3s ease-in-out",
        }}
      >
        <TerminalTabs
          serverId={selectedServer?._id || ""}
          initialPath={terminalPath}
          onClose={() => setTerminalOpen(false)}
        />
      </Box>
    </Box>
  );
};

export default FTPManager;
