import React, { useCallback, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { useTheme } from "@mui/material";
import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import toast from "react-hot-toast";
import { formatNginxConfig } from "../utils/nginxFormatter";

// Prettier standalone
import * as prettier from "prettier/standalone";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import parserHtml from "prettier/plugins/html";
import parserPostCss from "prettier/plugins/postcss";

// Helper to get plugin even if imported as module namespace or default
const getPlugin = (p: any) => p.default || p;

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  filename?: string; // Optional, can be used to auto-detect language
}

const detectLanguage = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    sh: "shell",
    bash: "shell",
    conf: "nginx", // Nginx config
    nginx: "nginx",
    env: "shell",
    dockerfile: "dockerfile",
    sql: "sql",
    java: "java",
    go: "go",
    php: "php",
    rb: "ruby",
    rs: "rust",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
  };
  return map[ext] || "plaintext";
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  height = "400px",
  readOnly = false,
  filename,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [formatting, setFormatting] = useState(false);

  // Determine language: prop > filename > default
  const finalLanguage =
    language ||
    (filename ? detectLanguage(filename) : "plaintext") ||
    "plaintext";

  const handleFormat = useCallback(async () => {
    if (readOnly) return;
    setFormatting(true);
    try {
      // 1. Handle Nginx specially with custom formatter
      if (
        finalLanguage === "nginx" ||
        finalLanguage === "conf" ||
        filename?.endsWith(".nginx") ||
        filename?.endsWith(".conf")
      ) {
        const formatted = formatNginxConfig(value);
        onChange(formatted);
        toast.success("Nginx config formatted!");
        setFormatting(false);
        return;
      }

      // 2. Handle others with Prettier
      let formatted = value;
      let parser = "";
      let plugins: any[] = [];

      // Select parser based on language
      switch (finalLanguage) {
        case "javascript":
        case "typescript":
        case "json":
          parser = "babel";
          plugins = [getPlugin(parserBabel), getPlugin(parserEstree)];
          if (finalLanguage === "json") parser = "json";
          break;
        case "html":
        case "xml":
          parser = "html";
          plugins = [getPlugin(parserHtml)];
          break;
        case "css":
        case "scss":
        case "less":
          parser = "css";
          plugins = [getPlugin(parserPostCss)];
          break;
        default:
          // Try to infer from extension if language is generic
          if (filename?.endsWith(".json")) {
            parser = "json";
            plugins = [getPlugin(parserBabel), getPlugin(parserEstree)];
          } else if (filename?.endsWith(".js") || filename?.endsWith(".ts")) {
            parser = "babel";
            plugins = [getPlugin(parserBabel), getPlugin(parserEstree)];
          } else if (filename?.endsWith(".css")) {
            parser = "css";
            plugins = [getPlugin(parserPostCss)];
          } else if (filename?.endsWith(".html")) {
            parser = "html";
            plugins = [getPlugin(parserHtml)];
          }
          break;
      }

      // Filter out undefined plugins just in case
      plugins = plugins.filter(Boolean);

      if (parser && plugins.length > 0) {
        formatted = await prettier.format(value, {
          parser,
          plugins,
          tabWidth: 2,
          printWidth: 80,
          useTabs: false,
          singleQuote: false,
        });
        onChange(formatted);
        toast.success("Code formatted!");
      } else {
        toast("No formatter available for this language", { icon: "ℹ️" });
      }
    } catch (err: any) {
      console.error("Format error:", err);
      toast.error("Failed to format: " + err.message);
    } finally {
      setFormatting(false);
    }
  }, [value, finalLanguage, filename, onChange, readOnly]);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {!readOnly && (
        <Box
          sx={{
            position: "absolute",
            top: 4,
            right: 16,
            zIndex: 10,
            bgcolor: "background.paper",
            borderRadius: 1,
            boxShadow: 2,
            opacity: 0.8,
            "&:hover": { opacity: 1 },
          }}
        >
          <Tooltip title="Format Code">
            <IconButton
              size="small"
              onClick={handleFormat}
              disabled={formatting}
              color="primary"
            >
              {formatting ? (
                <CircularProgress size={16} />
              ) : (
                <AutoFixHighIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Editor
        height={height}
        language={finalLanguage === "nginx" ? "shell" : finalLanguage} // Monaco doesn't have built-in nginx, shell is a decent fallback
        value={value}
        onChange={onChange}
        theme={isDark ? "vs-dark" : "light"}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          fontFamily:
            "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
          fontLigatures: true,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 10, bottom: 10 },
        }}
        loading={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 2,
            }}
          >
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Loading Editor...
            </Typography>
          </Box>
        }
      />
    </Box>
  );
};

export default CodeEditor;
