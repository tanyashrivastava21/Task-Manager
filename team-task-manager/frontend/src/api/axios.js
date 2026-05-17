import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// In-memory token storage (never localStorage for access token)
let accessToken = null;

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => { accessToken = null; };

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies (refresh token)
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    
    // Don't retry if it's already a refresh request or if we've already retried
    if (err.response?.status === 401 && !original._retry && !original.url.includes('/auth/refresh')) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        clearAccessToken();
        // Only redirect if not already on login/signup to avoid infinite reload
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }
    
    // If it's a 401 on a refresh request itself, just clear and potentially redirect
    if (err.response?.status === 401 && original.url.includes('/auth/refresh')) {
      clearAccessToken();
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
