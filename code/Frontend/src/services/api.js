// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Events API endpoints
export const eventsApi = {
  getAll: () => api.get('/api/events'),
  getById: (id) => api.get(`/api/events/${id}`),
  getByCamera: (cameraId) => api.get(`/api/events/camera/${cameraId}`),
  getByDateRange: (start, end) => api.get(`/api/events/range?start=${start}&end=${end}`),
  getBySeverity: (severity) => api.get(`/api/events/severity/${severity}`),
};

// Health API endpoints
export const healthApi = {
  getStatus: () => api.get('/api/health'),
  getNodeStatus: (nodeId) => api.get(`/api/health/${nodeId}`),
  getClusterStatus: () => api.get('/api/health/cluster'),
};

// Camera API endpoints
export const cameraApi = {
  getAll: () => api.get('/api/cameras'),
  getById: (id) => api.get(`/api/cameras/${id}`),
  getStatus: (id) => api.get(`/api/cameras/${id}/status`),
};

export default api;