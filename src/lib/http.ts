import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Attach JWT from localStorage if present
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('vista_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ??
      err.response?.statusText ??
      err.message ??
      'Error de red';
    return Promise.reject(new Error(message));
  }
);

export default http;
