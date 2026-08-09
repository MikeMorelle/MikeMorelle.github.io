import axios from 'axios';

const getApiUrl = () => {
  return localStorage.getItem('apiUrl') || 
         process.env.REACT_APP_API_URL || 
         'http://localhost:3001';
};

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Update base URL dynamically before each request
api.interceptors.request.use(config => {
  config.baseURL = getApiUrl();
  return config;
});

// ==================== EVENTS API ====================
export const eventsApi = {
  // Get all events
  getAll: (params = {}) => 
    api.get('/events/', { params }),
  
  // Create a new event
  create: (eventData) => 
    api.post('/events/', eventData),
  
  // Get event image
  getImage: (eventId) => 
    api.get(`/events/${eventId}/image`, { responseType: 'blob' }),
  
  // Update event status
  updateStatus: (eventId, status) => 
    api.put(`/events/${eventId}/status`, { status }),
  
  // Delete event
  delete: (eventId) => 
    api.delete(`/events/${eventId}`),
};

// ==================== NODES API ====================
export const nodesApi = {
  // Get all nodes
  getAll: () => 
    api.get('/nodes/'),
  
  // Create/register a node
  create: (nodeData) => 
    api.post('/nodes/', nodeData),
  
  // Get one node
  getById: (nodeId) => 
    api.get(`/nodes/${nodeId}`),
  
  // Delete a node
  delete: (nodeId) => 
    api.delete(`/nodes/${nodeId}`),
  
  // Send heartbeat
  heartbeat: (nodeId) => 
    api.post(`/nodes/${nodeId}/heartbeat`),
};

// ==================== HEALTH API ====================
export const healthApi = {
  check: () => 
    api.get('/health'),
};

export default api;