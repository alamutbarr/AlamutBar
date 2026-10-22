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
    // Grab the token from localStorage
    const token = localStorage.getItem('driver_token') || localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);