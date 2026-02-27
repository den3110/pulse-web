import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Divider,
  Paper,
  useTheme,
  alpha,
  IconButton,
  Drawer,
  CircularProgress,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DocsNavbar from "../components/DocsNavbar";
import SEO from "../components/SEO";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface DocItem {
  id: string;
  label: string;
}

interface DocSection {
  title: string;
  items: DocItem[];
}

const Docs: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState("intro");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menu, setMenu] = useState<DocSection[]>([]);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Menu
    api
      .get("/docs/menu")
      .then((res) => {
        setMenu(res.data);
        if (res.data.length > 0 && res.data[0].items.length > 0) {
          setActiveId(res.data[0].items[0].id);
        }
      })
      .catch((err) => console.error("Failed to load docs menu:", err));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoading(true);
    setContent("");
    api
      .get(`/docs/content/${activeId}`)
      .then((res) => {
        setContent(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch doc content:", err);
        setContent("# Error\n\nFailed to load documentation for this section.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeId]);

  const handleNavClick = (id: string) => {
    setActiveId(id);
    setMobileMenuOpen(false);
  };

  const SidebarContent = (
    <Box sx={{ p: { xs: 2, md: 0 } }}>
      <Typography
        variant="h6"
        fontWeight={800}
        sx={{ mb: 3, px: 2, display: { md: "none" } }}
      >
        Docs Navigation
      </Typography>
      <List sx={{ width: "100%" }}>
        {menu.map((section, idx) => (
          <React.Fragment key={section.title}>
            <ListSubheader
              sx={{
                bgcolor: "transparent",
                fontWeight: 700,
                color: "text.primary",
                textTransform: "uppercase",
                fontSize: "0.75rem",
                letterSpacing: "1px",
                lineHeight: "2rem",
                mt: idx > 0 ? 2 : 0,
              }}
            >
              {section.title}
            </ListSubheader>
            {section.items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleNavClick(item.id)}
                    sx={{
                      borderRadius: "6px",
                      px: 2,
                      py: 0.75,
                      bgcolor: isActive
                        ? alpha(theme.palette.primary.main, 0.1)
                        : "transparent",
                      color: isActive
                        ? "var(--primary-main)"
                        : "text.secondary",
                      borderLeft: isActive
                        ? "3px solid var(--primary-main)"
                        : "3px solid transparent",
                      "&:hover": {
                        bgcolor: isActive
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.text.primary, 0.05),
                        color: isActive
                          ? "var(--primary-main)"
                          : "text.primary",
                      },
                      transition: "all 0.2s",
                    }}
                  >
                    <ListItemText
                      primary={item.label}
                      slotProps={{
                        primary: {
                          fontSize: "0.9rem",
                          fontWeight: isActive ? 600 : 500,
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        pt: { xs: 8, md: 10 },
      }}
    >
      <SEO
        title="Documentation | Pulse"
        description="Learn how to deploy and manage your VPS servers seamlessly with Pulse."
      />
      <DocsNavbar />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 10 }}>
        {/* Mobile Header Toggle */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            mb: 2,
            pb: 2,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <IconButton
            onClick={() => setMobileMenuOpen(true)}
            edge="start"
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            Docs Menu
          </Typography>
        </Box>

        <Drawer
          anchor="left"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          PaperProps={{ sx: { width: 280, bgcolor: "background.paper" } }}
        >
          {SidebarContent}
        </Drawer>

        <Grid container spacing={4}>
          {/* Desktop Sidebar */}
          <Grid
            item
            xs={12}
            md={3}
            lg={2.5}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Box
              sx={{
                position: "sticky",
                top: 100,
                maxHeight: "calc(100vh - 120px)",
                overflowY: "auto",
                pr: 2,
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: alpha(theme.palette.text.primary, 0.2),
                  borderRadius: 3,
                },
              }}
            >
              {SidebarContent}
            </Box>
          </Grid>

          {/* Main Content Area */}
          <Grid item xs={12} md={9} lg={7.5}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 5, lg: 6 },
                borderRadius: "16px",
                bgcolor: "background.paper",
                minHeight: "70vh",
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              />

              <Box
                sx={{
                  position: "relative",
                  zIndex: 1,
                  animation: "fadeIn 0.5s ease-out",
                }}
              >
                {loading ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    height="50vh"
                  >
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box
                    className="markdown-body"
                    sx={{
                      color: "text.primary",
                      "& h1": {
                        fontSize: { xs: "2rem", md: "2.5rem" },
                        fontWeight: 800,
                        mb: 2,
                        pb: 2,
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      },
                      "& h2": {
                        fontSize: "1.75rem",
                        fontWeight: 700,
                        mt: 4,
                        mb: 2,
                      },
                      "& h3": {
                        fontSize: "1.25rem",
                        fontWeight: 600,
                        mt: 3,
                        mb: 1,
                      },
                      "& p": {
                        fontSize: "1.05rem",
                        lineHeight: 1.8,
                        color: "text.secondary",
                        mb: 2,
                      },
                      "& ul, & ol": {
                        pl: 3,
                        mb: 2,
                        color: "text.secondary",
                        fontSize: "1.05rem",
                        lineHeight: 1.8,
                      },
                      "& li": {
                        mb: 1,
                        "&::marker": { color: "var(--primary-main)" },
                      },
                      "& blockquote": {
                        borderLeft: `4px solid var(--primary-main)`,
                        pl: 2,
                        fontStyle: "italic",
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        py: 1,
                        my: 2,
                      },
                      "& img": {
                        maxWidth: "100%",
                        borderRadius: 2,
                        my: 2,
                        boxShadow: theme.shadows[3],
                      },
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        code({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus as any}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                borderRadius: "8px",
                                padding: "16px",
                                marginTop: "16px",
                                marginBottom: "16px",
                              }}
                              {...props}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code
                              className={className}
                              {...props}
                              style={{
                                backgroundColor: alpha(
                                  theme.palette.primary.main,
                                  0.1,
                                ),
                                padding: "2px 6px",
                                borderRadius: "4px",
                                color: "var(--primary-main)",
                              }}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  mt: 8,
                  pt: 4,
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Didn't find what you were looking for?
                </Typography>
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Contact Support
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </Box>
  );
};

export default Docs;
