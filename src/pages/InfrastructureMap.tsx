import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import {
  Box,
  Typography,
  Button,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
  IconButton,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import SEO from "../components/SEO";

interface TopologyNode {
  id: string;
  type: "server" | "project";
  label: string;
  status: string;
  meta: Record<string, any>;
  // Computed for rendering
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface TopologyEdge {
  source: string;
  target: string;
  label?: string;
}

const STATUS_COLORS: Record<string, string> = {
  online: "#4ade80",
  running: "#4ade80",
  stopped: "#ef4444",
  failed: "#ef4444",
  offline: "#ef4444",
  idle: "#94a3b8",
  deploying: "#fbbf24",
  building: "#fbbf24",
  unknown: "#64748b",
};

const InfrastructureMap: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const renderAnimRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const nodesRef = useRef<TopologyNode[]>([]);
  const edgesRef = useRef<TopologyEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [edges, setEdges] = useState<TopologyEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<TopologyNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    nodeId: string | null;
    isPanning: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>({
    nodeId: null,
    isPanning: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const fetchTopology = useCallback(async () => {
    try {
      const { data } = await api.get("/topology");
      const rawNodes = data.nodes || [];
      const rawEdges = data.edges || [];

      // Initialize positions with force-directed layout seed
      const centerX = 400;
      const centerY = 300;
      const serverNodes = rawNodes.filter((n: any) => n.type === "server");
      const projectNodes = rawNodes.filter((n: any) => n.type === "project");

      // Place servers in a circle
      const initializedNodes: TopologyNode[] = [];
      serverNodes.forEach((n: any, i: number) => {
        const angle = (2 * Math.PI * i) / Math.max(serverNodes.length, 1);
        const radius = 150;
        initializedNodes.push({
          ...n,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
        });
      });

      // Place projects near their servers
      projectNodes.forEach((n: any) => {
        const edge = rawEdges.find((e: any) => e.source === n.id);
        const serverNode = edge
          ? initializedNodes.find((s) => s.id === edge.target)
          : null;
        const baseX = serverNode ? serverNode.x : centerX;
        const baseY = serverNode ? serverNode.y : centerY;
        initializedNodes.push({
          ...n,
          x: baseX + (Math.random() - 0.5) * 120,
          y: baseY + (Math.random() - 0.5) * 120,
          vx: 0,
          vy: 0,
        });
      });

      setNodes(initializedNodes);
      setEdges(rawEdges);
      nodesRef.current = initializedNodes;
      edgesRef.current = rawEdges;
    } catch (error) {
      console.error("Failed to fetch topology", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopology();
  }, [fetchTopology]);

  // Force-directed simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    let iteration = 0;
    const maxIterations = 200;

    const simulate = () => {
      if (iteration >= maxIterations) return;

      const ns = nodesRef.current;
      const es = edgesRef.current;
      const damping = 0.85;
      const repulsion = 2000;
      const attraction = 0.01;
      const idealLength = 150;

      // Repulsion between all nodes
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          ns[i].vx -= fx;
          ns[i].vy -= fy;
          ns[j].vx += fx;
          ns[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of es) {
        const source = ns.find((n) => n.id === edge.source);
        const target = ns.find((n) => n.id === edge.target);
        if (!source || !target) continue;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = attraction * (dist - idealLength);
        const fx = (dx / Math.max(dist, 1)) * force;
        const fy = (dy / Math.max(dist, 1)) * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }

      // Apply velocities with damping
      for (const node of ns) {
        if (dragRef.current.nodeId === node.id) continue;
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
      }

      nodesRef.current = [...ns];
      setNodes([...ns]);
      iteration++;

      if (iteration < maxIterations) {
        animRef.current = requestAnimationFrame(simulate);
      }
    };

    animRef.current = requestAnimationFrame(simulate);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [nodes.length]);

  // Canvas continuous rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      timeRef.current += 0.015;
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || 800;
      canvas.height = rect?.height || 600;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw background dot grid for premium feel
      ctx.save();
      const dotSpacing = 30 * zoom;
      const offsetX = (pan.x + canvas.width / 2) % dotSpacing;
      const offsetY = (pan.y + canvas.height / 2) % dotSpacing;
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
      for (let x = offsetX - dotSpacing; x < canvas.width; x += dotSpacing) {
        for (let y = offsetY - dotSpacing; y < canvas.height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      ctx.save();
      ctx.translate(pan.x + canvas.width / 2, pan.y + canvas.height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // 2. Draw curved edges with animated particles
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) continue;

        const isHovered =
          hoveredNode?.id === source.id || hoveredNode?.id === target.id;

        // Calculate control point for curved line
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const cx = source.x + dx / 2 - dy * 0.15; // Offset perpendicular to line
        const cy = source.y + dy / 2 + dx * 0.15;

        // Draw Line
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(cx, cy, target.x, target.y);
        ctx.strokeStyle = isHovered
          ? isDark
            ? "rgba(0, 242, 254, 0.5)"
            : "rgba(0, 112, 243, 0.5)"
          : isDark
            ? "rgba(255,255,255,0.15)"
            : "rgba(0,0,0,0.1)";
        ctx.lineWidth = isHovered ? 2 : 1.5;
        if (isHovered) {
          ctx.shadowColor = "#00f2fe";
          ctx.shadowBlur = 8;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw animated particles flowing from source to target
        const t = (timeRef.current + (edge.source.length % 10) * 0.1) % 1;
        // Bezier interpolation
        const px =
          Math.pow(1 - t, 2) * source.x +
          2 * (1 - t) * t * cx +
          Math.pow(t, 2) * target.x;
        const py =
          Math.pow(1 - t, 2) * source.y +
          2 * (1 - t) * t * cy +
          Math.pow(t, 2) * target.y;

        ctx.beginPath();
        ctx.arc(px, py, isHovered ? 2.5 : 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = isHovered
          ? "#00f2fe"
          : isDark
            ? "rgba(255,255,255,0.8)"
            : "rgba(0,0,0,0.5)";
        if (isHovered) {
          ctx.shadowColor = "#00f2fe";
          ctx.shadowBlur = 10;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 3. Draw premium nodes
      for (const node of nodes) {
        const color = STATUS_COLORS[node.status] || STATUS_COLORS.unknown;
        const radius = node.type === "server" ? 32 : 24;
        const isHovered = hoveredNode?.id === node.id;

        // Pulsing glow animation
        const pulse = Math.sin(timeRef.current * 4 + node.x) * 0.5 + 0.5; // 0 to 1

        if (
          isHovered ||
          node.status === "deploying" ||
          node.status === "building"
        ) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 6 + pulse * 6, 0, 2 * Math.PI);
          ctx.fillStyle = `${color}25`;
          ctx.fill();
        }

        // Drop Shadow
        ctx.shadowColor = color;
        ctx.shadowBlur = isHovered ? 25 : 15;

        // Node base circle (dark background)
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? "#0f172a" : "#ffffff";
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // Inner glowing gradient
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius - 2, 0, 2 * Math.PI);
        const gradient = ctx.createRadialGradient(
          node.x - radius * 0.3,
          node.y - radius * 0.3,
          0,
          node.x,
          node.y,
          radius,
        );
        gradient.addColorStop(0, `${color}A0`);
        gradient.addColorStop(1, `${color}40`);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Node border
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();

        // Inner ring (Cyberpunk hardware detail)
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius - 6, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}50`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Icon inside node
        ctx.fillStyle = "#ffffff";
        ctx.font = `${node.type === "server" ? 22 : 14}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.type === "server" ? "🖥️" : "📦", node.x, node.y);

        // Name Tag Label (Pill shape)
        const labelStr = node.label;
        ctx.font = `${isHovered ? "bold " : "500 "}${node.type === "server" ? 12 : 11}px 'Inter', sans-serif`;
        const textMetrics = ctx.measureText(labelStr);
        const tw = textMetrics.width;
        const th = 18;
        const pillX = node.x - tw / 2 - 10;
        const pillY = node.y + radius + 10;

        ctx.beginPath();
        ctx.roundRect(pillX, pillY, tw + 20, th + 8, 12);
        ctx.fillStyle = isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.9)";
        ctx.fill();
        ctx.strokeStyle = isDark
          ? "rgba(255,255,255,0.15)"
          : "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isDark ? "#f8fafc" : "#1e293b";
        ctx.fillText(labelStr, node.x, pillY + th / 2 + 5);
      }

      ctx.restore();
      renderAnimRef.current = requestAnimationFrame(render);
    };

    renderAnimRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(renderAnimRef.current);
    };
  }, [nodes, edges, hoveredNode, zoom, pan, isDark]);

  // Mouse interaction
  const getNodeAtPos = useCallback(
    (clientX: number, clientY: number): TopologyNode | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx =
        (clientX - rect.left - pan.x - canvas.width / 2) / zoom +
        canvas.width / 2;
      const my =
        (clientY - rect.top - pan.y - canvas.height / 2) / zoom +
        canvas.height / 2;

      for (const node of nodes) {
        const radius = node.type === "server" ? 32 : 24;
        const dx = mx - node.x;
        const dy = my - node.y;
        // Increase hit detection area to encompass the node and the name tag pill below it
        if (
          dx * dx + dy * dy <= (radius + 20) * (radius + 20) ||
          (Math.abs(dx) < 60 && dy > 0 && dy < radius + 40)
        ) {
          return node;
        }
      }
      return null;
    },
    [nodes, zoom, pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current.nodeId) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx =
          (e.clientX - rect.left - pan.x - canvas.width / 2) / zoom +
          canvas.width / 2;
        const my =
          (e.clientY - rect.top - pan.y - canvas.height / 2) / zoom +
          canvas.height / 2;
        const nodeIdx = nodesRef.current.findIndex(
          (n) => n.id === dragRef.current.nodeId,
        );
        if (nodeIdx >= 0) {
          nodesRef.current[nodeIdx].x = mx;
          nodesRef.current[nodeIdx].y = my;
          nodesRef.current[nodeIdx].vx = 0;
          nodesRef.current[nodeIdx].vy = 0;
          setNodes([...nodesRef.current]);
        }
        return;
      }

      if (dragRef.current.isPanning) {
        setPan({
          x: dragRef.current.startPanX + (e.clientX - dragRef.current.startX),
          y: dragRef.current.startPanY + (e.clientY - dragRef.current.startY),
        });
        return;
      }

      const node = getNodeAtPos(e.clientX, e.clientY);
      setHoveredNode(node);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = node ? "pointer" : "grab";
      }
    },
    [getNodeAtPos, zoom, pan],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;

      const node = getNodeAtPos(e.clientX, e.clientY);
      if (node) {
        dragRef.current.nodeId = node.id;
      } else {
        dragRef.current.isPanning = true;
        dragRef.current.startPanX = pan.x;
        dragRef.current.startPanY = pan.y;
      }
    },
    [getNodeAtPos, pan],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (
        dragRef.current.nodeId &&
        Math.abs(e.clientX - dragRef.current.startX) < 5
      ) {
        // Click on node — navigate
        const node = nodes.find((n) => n.id === dragRef.current.nodeId);
        if (node) {
          if (node.type === "server") {
            navigate(`/servers/${node.meta._id}`);
          } else {
            navigate(`/projects/${node.meta._id}/deploy`);
          }
        }
      }
      dragRef.current.nodeId = null;
      dragRef.current.isPanning = false;
    },
    [nodes, navigate],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => Math.min(3, Math.max(0.3, prev - e.deltaY * 0.001)));
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 400,
        }}
      >
        <SEO title="Infrastructure Map" description="Infrastructure Topology" />
        <CircularProgress />
      </Box>
    );
  }

  if (nodes.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <SEO title="Infrastructure Map" description="Infrastructure Topology" />
        <AccountTreeIcon
          sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
        />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {t("infra.noData", "No infrastructure data")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            "infra.noDataHint",
            "Add servers and projects to see the infrastructure map.",
          )}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <SEO title="Infrastructure Map" description="Infrastructure Topology" />

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            🌐 {t("infra.title", "Infrastructure Map")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              "infra.subtitle",
              "Visual topology of your servers and projects",
            )}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          {/* Legend */}
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              mr: 2,
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.3,
              }}
            >
              <FiberManualRecordIcon sx={{ fontSize: 10, color: "#4ade80" }} />
              <Typography variant="caption" sx={{ fontSize: 10 }}>
                {t("infrastructureMap.onlineRunning", "Online/Running")}</Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.3,
              }}
            >
              <FiberManualRecordIcon sx={{ fontSize: 10, color: "#ef4444" }} />
              <Typography variant="caption" sx={{ fontSize: 10 }}>
                {t("infrastructureMap.offlineStopped", "Offline/Stopped")}</Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.3,
              }}
            >
              <FiberManualRecordIcon sx={{ fontSize: 10, color: "#fbbf24" }} />
              <Typography variant="caption" sx={{ fontSize: 10 }}>
                {t("infrastructureMap.deploying", "Deploying")}</Typography>
            </Box>
          </Box>
          <Tooltip title="Zoom In">
            <IconButton
              size="small"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton
              size="small"
              onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View">
            <IconButton size="small" onClick={resetView}>
              <CenterFocusStrongIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("common.refresh", "Refresh")}>
            <IconButton
              size="small"
              onClick={() => {
                setLoading(true);
                fetchTopology();
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Canvas */}
      <Card
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <Box
            sx={{
              width: "100%",
              height: { xs: 400, md: 600 },
              position: "relative",
              bgcolor: isDark ? "rgba(0,0,0,0.3)" : "rgba(248,250,252,1)",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
              }}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                dragRef.current.nodeId = null;
                dragRef.current.isPanning = false;
                setHoveredNode(null);
              }}
              onWheel={handleWheel}
            />

            {/* Hover tooltip */}
            {hoveredNode && (
              <Box
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  bgcolor: isDark
                    ? "rgba(15,23,42,0.95)"
                    : "rgba(255,255,255,0.95)",
                  borderRadius: 2,
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  backdropFilter: "blur(10px)",
                  minWidth: 200,
                  zIndex: 10,
                  pointerEvents: "none", // Prevent tooltip from blocking clicks on the canvas
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    {hoveredNode.type === "server" ? "🖥️" : "📦"}{" "}
                    {hoveredNode.label}
                  </Typography>
                  <Chip
                    label={hoveredNode.status}
                    size="small"
                    sx={{
                      fontSize: 10,
                      height: 18,
                      bgcolor: `${STATUS_COLORS[hoveredNode.status] || STATUS_COLORS.unknown}20`,
                      color:
                        STATUS_COLORS[hoveredNode.status] ||
                        STATUS_COLORS.unknown,
                    }}
                  />
                </Box>
                {hoveredNode.type === "server" && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                    }}
                  >
                    {hoveredNode.meta.host}
                  </Typography>
                )}
                {hoveredNode.type === "project" && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ fontSize: 11 }}
                    >
                      {t("infrastructureMap.branch", "Branch:")}{hoveredNode.meta.branch}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        wordBreak: "break-all",
                      }}
                    >
                      {hoveredNode.meta.repoUrl}
                    </Typography>
                  </>
                )}
                <Typography
                  variant="caption"
                  color="primary"
                  display="block"
                  sx={{ mt: 1, fontSize: 10 }}
                >
                  {t("infrastructureMap.clickToViewDetails", "Click to view details →")}</Typography>
              </Box>
            )}

            {/* Stats overlay */}
            <Box
              sx={{
                position: "absolute",
                bottom: 16,
                left: 16,
                display: "flex",
                gap: 1,
              }}
            >
              <Chip
                label={`${nodes.filter((n) => n.type === "server").length} Servers`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 10, height: 22 }}
              />
              <Chip
                label={`${nodes.filter((n) => n.type === "project").length} Projects`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 10, height: 22 }}
              />
              <Chip
                label={`${Math.round(zoom * 100)}%`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 10, height: 22 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InfrastructureMap;
