import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useServer } from "../contexts/ServerContext";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Grid,
} from "@mui/material";
import NetworkCheckIcon from "@mui/icons-material/NetworkCheck";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import api from "../services/api";
import SEO from "../components/SEO";

interface BandwidthHistory {
  timestamp: string;
  rxRate: number;
  txRate: number;
}

interface ServerBandwidth {
  serverId: string;
  name: string;
  host: string;
  status: string;
  currentRx: number;
  currentTx: number;
  history: BandwidthHistory[];
}

const formatBytes = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const GlobalBandwidth: React.FC = () => {
  const { t } = useTranslation();
  const { selectedServer } = useServer();
  const [data, setData] = useState<ServerBandwidth[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async (silent = false) => {
    if (!selectedServer?._id) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/analytics/bandwidth");
      setData(
        res.data.filter(
          (s: ServerBandwidth) => s.serverId === selectedServer._id,
        ),
      );
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setData([]);
    if (selectedServer?._id) {
      fetchData();
    }
    const interval = setInterval(() => {
      if (selectedServer?._id) {
        fetchData(true);
      }
    }, 10000); // 10s is sync with scheduler
    return () => clearInterval(interval);
  }, [selectedServer?._id]);

  const totalRx = useMemo(
    () => data.reduce((acc, curr) => acc + curr.currentRx, 0),
    [data],
  );
  const totalTx = useMemo(
    () => data.reduce((acc, curr) => acc + curr.currentTx, 0),
    [data],
  );

  // Aggregate all server history into 1-minute buckets
  const aggregatedHistory = useMemo(() => {
    const buckets: Record<number, { rxRate: number; txRate: number }> = {};
    data.forEach((server) => {
      server.history.forEach((h) => {
        // Nearest minute
        const t = new Date(h.timestamp);
        t.setSeconds(0, 0);
        const key = t.getTime();
        if (!buckets[key]) buckets[key] = { rxRate: 0, txRate: 0 };
        buckets[key].rxRate += h.rxRate;
        buckets[key].txRate += h.txRate;
      });
    });

    return Object.keys(buckets)
      .sort()
      .map((key) => {
        const k = parseInt(key);
        return {
          timestamp: k,
          // Convert Bytes/sec to Megabytes/sec
          rxMBs: parseFloat((buckets[k].rxRate / (1024 * 1024)).toFixed(3)),
          txMBs: parseFloat((buckets[k].txRate / (1024 * 1024)).toFixed(3)),
        };
      });
  }, [data]);

  const highchartsOptions = useMemo(() => {
    return {
      chart: {
        type: "areaspline",
        backgroundColor: "transparent",
        style: { fontFamily: "'Inter', 'Roboto', sans-serif" },
      },
      title: { text: "" },
      xAxis: {
        type: "datetime",
        gridLineWidth: 0,
        labels: { style: { color: "#a0aec0", fontSize: "13px" } },
        lineColor: "#2d3748",
      },
      yAxis: {
        title: { text: null },
        gridLineDashStyle: "Dash",
        gridLineColor: "#2d3748",
        labels: {
          style: { color: "#a0aec0" },
          formatter: function (
            this: Highcharts.AxisLabelsFormatterContextObject,
          ) {
            return this.value + " MB/s";
          },
        },
        min: 0,
      },
      tooltip: {
        shared: true,
        xDateFormat: "%H:%M",
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        borderWidth: 1,
        borderColor: "#2d3748",
        borderRadius: 8,
        style: { color: "#fff", fontSize: "14px" },
        valueSuffix: " MB/s",
      },
      plotOptions: {
        areaspline: {
          fillOpacity: 0.3,
          lineWidth: 3,
          marker: {
            radius: 0,
            lineWidth: 2,
            lineColor: "#fff",
            symbol: "circle",
            states: { hover: { radius: 5 } },
          },
        },
      },
      legend: {
        itemStyle: { color: "#a0aec0", fontSize: "14px", fontWeight: "500" },
        itemHoverStyle: { color: "#fff" },
      },
      series: [
        {
          name: t("bandwidth.downloadSpeed", "Download Speed"),
          data: aggregatedHistory.map((d) => [d.timestamp, d.rxMBs]),
          color: "#00f2fe",
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [
                0,
                Highcharts.color("#00f2fe")
                  .setOpacity(0.5)
                  .get("rgba") as string,
              ],
              [
                1,
                Highcharts.color("#4facfe")
                  .setOpacity(0.0)
                  .get("rgba") as string,
              ],
            ],
          },
        },
        {
          name: t("bandwidth.uploadSpeed", "Upload Speed"),
          data: aggregatedHistory.map((d) => [d.timestamp, d.txMBs]),
          color: "#43e97b",
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [
                0,
                Highcharts.color("#43e97b")
                  .setOpacity(0.5)
                  .get("rgba") as string,
              ],
              [
                1,
                Highcharts.color("#38f9d7")
                  .setOpacity(0.0)
                  .get("rgba") as string,
              ],
            ],
          },
        },
      ],
      credits: { enabled: false },
    };
  }, [aggregatedHistory, t]);

  const serverBarOptions = useMemo(() => {
    return {
      chart: { type: "bar", backgroundColor: "transparent" },
      title: { text: "" },
      xAxis: {
        categories: data.map((d) => d.name),
        labels: { style: { color: "#a0aec0" } },
        lineColor: "#2d3748",
      },
      yAxis: {
        title: { text: null },
        gridLineDashStyle: "Dash",
        gridLineColor: "#2d3748",
        labels: {
          style: { color: "#a0aec0" },
          formatter: function (
            this: Highcharts.AxisLabelsFormatterContextObject,
          ) {
            return this.value + " GB";
          },
        },
      },
      tooltip: {
        shared: true,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        borderColor: "#2d3748",
        style: { color: "#fff" },
        valueSuffix: " GB",
      },
      plotOptions: { bar: { borderRadius: 4, borderWidth: 0 } },
      legend: { enabled: false },
      series: [
        {
          name: t("bandwidth.download", "Download"),
          data: data.map((d) =>
            parseFloat((d.currentRx / (1024 * 1024 * 1024)).toFixed(2)),
          ),
          color: "#00f2fe",
        },
        {
          name: t("bandwidth.upload", "Upload"),
          data: data.map((d) =>
            parseFloat((d.currentTx / (1024 * 1024 * 1024)).toFixed(2)),
          ),
          color: "#43e97b",
        },
      ],
      credits: { enabled: false },
    };
  }, [data, t]);

  if (loading && data.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <SEO title="Bandwidth" />
        <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  return (
    <Box>
      <SEO title="Bandwidth" />

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <NetworkCheckIcon sx={{ fontSize: 32, color: "#00f2fe" }} />
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              background: "-webkit-linear-gradient(45deg, #00f2fe, #4facfe)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t("nav.bandwidth", "Bandwidth")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(
              "bandwidth.subtitle",
              "Network speeds and lifetime usage for " +
                (selectedServer?.name || "this server"),
            )}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              background:
                "linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%)",
              border: "1px solid rgba(79, 172, 254, 0.2)",
            }}
          >
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 600,
                }}
              >
                {t("bandwidth.totalDownload", "Total Download")} {t("globalBandwidth.lifetime", "(Lifetime)")}</Typography>
              <Typography
                variant="h3"
                sx={{ color: "#00f2fe", mt: 1, fontWeight: 700 }}
              >
                {formatBytes(totalRx)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              background:
                "linear-gradient(135deg, rgba(67, 233, 123, 0.1) 0%, rgba(56, 249, 215, 0.1) 100%)",
              border: "1px solid rgba(67, 233, 123, 0.2)",
            }}
          >
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 600,
                }}
              >
                {t("bandwidth.totalUpload", "Total Upload")} {t("globalBandwidth.lifetime", "(Lifetime)")}</Typography>
              <Typography
                variant="h3"
                sx={{ color: "#43e97b", mt: 1, fontWeight: 700 }}
              >
                {formatBytes(totalTx)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card
        sx={{
          background: "#1c2230",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          mb: 4,
        }}
      >
        <CardContent sx={{ p: "24px !important" }}>
          <Typography variant="h6" mb={3} fontWeight={600} color="#e2e8f0">
            {t("bandwidth.networkSpeed", "Network Speed (Last Hour)")}
          </Typography>
          {aggregatedHistory.length > 0 ? (
            <Box sx={{ height: 400, width: "100%" }}>
              <HighchartsReact
                highcharts={Highcharts}
                options={highchartsOptions}
              />
            </Box>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={4}>
              {t(
                "common.noData",
                "No data available. Wait a minute for the cron job to collect stats.",
              )}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default GlobalBandwidth;
