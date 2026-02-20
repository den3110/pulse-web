import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/", // Fixes MIME type error in production
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5012",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5012",
        ws: true,
      },
    },
    host: true, // Listen on all addresses
    allowedHosts: true, // Allow all hosts (Vite 6 / 5.1+)
  },
});
