import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const setApiBaseUrl = (url: string) => {
  const baseUrl = url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
  api.defaults.baseURL = baseUrl;
};

export const getApiBaseUrl = () => {
  return api.defaults.baseURL;
};

export default api;
