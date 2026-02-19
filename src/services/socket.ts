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

  // Determine the correct socket URL and path
  // If VITE_API_URL includes a path (e.g. /backend or https://site.com/backend),
  // we need to set it as options.path and connect to the root/origin.
  try {
    const urlObj = new URL(SOCKET_URL, window.location.origin);

    // Always connect to the origin (or just "/" if you prefer, but origin is explicit)
    // extracting the origin ensures 'io' doesn't interpret the path as a namespace
    url = urlObj.origin;

    if (urlObj.pathname && urlObj.pathname !== "/") {
      options.path = `${urlObj.pathname.replace(/\/$/, "")}/socket.io`;
    }
  } catch (e) {
    console.error("[Socket] Invalid URL:", SOCKET_URL, e);
  }

  console.log("[Socket] Connecting to:", url, "with options:", options);
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
