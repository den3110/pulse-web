import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// Event emitter for auth events (logout signal)
type AuthListener = () => void;
let onForceLogout: AuthListener | null = null;

export const setForceLogoutHandler = (handler: AuthListener) => {
  onForceLogout = handler;
};

const API_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Refresh token logic with request queuing ---
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only handle 401 (Unauthorized)
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register")
    ) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        throw new Error("No refresh token");
      }

      // Use plain axios (not the api instance) to avoid interceptor loop
      const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
        refreshToken,
      });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      // Process queued requests with new token
      processQueue(null, data.accessToken);

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // Clear tokens and force logout
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      // Notify AuthContext to clear user state
      if (onForceLogout) {
        onForceLogout();
      } else {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// Define the API object
const apiService = {
  // Expose the axios instance if needed (e.g. for interceptors in other files)
  client: api,

  // Server Operations
  getServers: () => api.get("/servers"),
  getServer: (id: string) => api.get(`/servers/${id}`),
  createServer: (data: any) => api.post("/servers", data),
  updateServer: (id: string, data: any) => api.put(`/servers/${id}`, data),
  deleteServer: (id: string) => api.delete(`/servers/${id}`),
  testConnection: (id: string) => api.post(`/servers/${id}/test`),
  getServerProjects: (id: string) => api.get(`/servers/${id}/projects`),
  getServerStats: (id: string) => api.get(`/servers/${id}/stats`),
  getStatsHistory: (id: string) => api.get(`/servers/${id}/stats/history`),
  execCommand: (id: string, command: string, timeout?: number) =>
    api.post(`/servers/${id}/exec`, { command, timeout }),
  reorderServers: (ids: string[]) => api.put("/servers/reorder", { ids }),

  // Projects
  getProjects: () => api.get("/projects"),
  getProject: (id: string) => api.get(`/projects/${id}`),
  createProject: (data: any) => api.post("/projects", data),
  updateProject: (id: string, data: any) => api.put(`/projects/${id}`, data),
  deleteProject: (id: string, password?: string) =>
    api.delete(`/projects/${id}`, { data: { password } }),
  saveAndRestart: (id: string, data: any) =>
    api.put(`/projects/${id}/save-restart`, data),
  deleteOutput: (id: string) => api.delete(`/projects/${id}/output`),
  reorderProjects: (ids: string[]) => api.put("/projects/reorder", { ids }),

  // Auth (if needed explicitly)
  login: (data: any) => api.post("/auth/login", data),
  register: (data: any) => api.post("/auth/register", data),
  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  },

  // Generic methods if needed
  get: api.get,
  post: api.post,
  put: api.put,
  delete: api.delete,
  patch: api.patch,
};

export default apiService;
