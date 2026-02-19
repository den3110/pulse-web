import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  const token = localStorage.getItem("accessToken");
  const SOCKET_URL = import.meta.env.VITE_API_URL || "/";

  let url = SOCKET_URL;
  let options: any = {
    auth: { token },
    transports: ["websocket", "polling"],
  };

  // If URL has path, use it as base path for socket.io
  if (SOCKET_URL.startsWith("http")) {
    try {
      const urlObj = new URL(SOCKET_URL);
      url = urlObj.origin;
      if (urlObj.pathname && urlObj.pathname !== "/") {
        options.path = `${urlObj.pathname.replace(/\/$/, "")}/socket.io`;
      }
    } catch (e) {
      console.error("[Socket] Invalid URL:", SOCKET_URL);
    }
  }

  socket = io(url, options);

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
  });

  socket.on("disconnect", () => {
    console.log("[Socket] Disconnected");
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
