import axios from 'axios';

export const api = axios.create({
  // Point this to your local backend server
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ The Interceptor dynamically adds the token before EVERY request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('driver_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      const headers = config.headers;
      if (headers && typeof headers.delete === 'function') {
        headers.delete('Content-Type');
        headers.delete('content-type');
      } else if (headers) {
        delete headers['Content-Type'];
        delete headers['content-type'];
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);