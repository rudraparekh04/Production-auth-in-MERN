import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Public Instance (no auth needed) ────────────────────────────────────────
export const publicApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,      // Send cookies (refresh token)
  headers: { 'Content-Type': 'application/json' },
});

// ─── Private Instance (auto-injects access token) ─────────────────────────────
const privateApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token management (in-memory — NOT localStorage) ─────────────────────────
let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => {
  accessToken = null;
};

// ─── Request Interceptor: inject access token ─────────────────────────────────
privateApi.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: auto-refresh on 401 ────────────────────────────────
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

privateApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already a retry
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      error.response?.data?.code === 'TOKEN_EXPIRED'
    ) {
      if (isRefreshing) {
        // Queue request until refresh completes
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(privateApi(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh using HttpOnly cookie
        const response = await publicApi.post('/auth/refresh');
        const newAccessToken = response.data.accessToken;

        setAccessToken(newAccessToken);
        onRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return privateApi(originalRequest);
      } catch (refreshError) {
        // Refresh failed → force logout
        clearAccessToken();
        refreshSubscribers = [];
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default privateApi;
