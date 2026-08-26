import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import EventLog from './EventLog';
import StatsCards from './StatsCards';
import NotificationBell from './NotificationBell';
import { Camera, Server, WifiOff, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../services/api';

// Converts backend event fields to the names our components expect.
// This prevents errors when fields like "description" are missing.
const normalizeEvent = (raw) => {
  const type = raw.type || raw.event_type || 'unknown';
  const severity =
    raw.severity ||
    (['intrusion', 'fire', 'theft'].includes(type) ? 'high' : 'medium');

  return {
    ...raw,                                  // keep all original data
    id: raw.id || `${raw.node_id}-${raw.timestamp}`,
    type: type,
    severity: severity,
    description:
      raw.description ||
      `${type} detected by ${raw.node_id || 'unknown'}`,
    cameraId: raw.cameraId || raw.node_id || 'unknown',
    location: raw.location || null,
    thumbnail: raw.file_id
      ? `http://100.95.198.3:8888/buckets/events/${raw.file_id}`
      : null,
  };
};

const Dashboard = () => {
  // Check for saved theme or default to dark
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  // Apply theme to body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  const [activeView, setActiveView] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online', 'offline', 'checking'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    severity: 'all',
    dateRange: '24h',
    camera: 'all'
  });
  const [refreshInterval, setRefreshInterval] = useState(
    Number(localStorage.getItem('refreshInterval')) || 30
  );

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/health`);
      if (response.ok) {
        setBackendStatus('online');
        return true;
      }
      setBackendStatus('offline');
      return false;
    } catch {
      setBackendStatus('offline');
      return false;
    }
  };

  // Fetch events from backend
  const fetchEvents = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/events/?limit=100`);
      if (response.ok) {
        const data = await response.json();
        // Handle both array and wrapped responses
        const eventList = Array.isArray(data) ? data : (data.events || []);
        setEvents(eventList.map(normalizeEvent));
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.log('Backend not available, showing offline state');
    }
  };

  // Fetch cameras from backend
  const fetchCameras = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/nodes/`);
      if (response.ok) {
        const data = await response.json();
        const nodeList = Array.isArray(data) ? data : (data.nodes || []);
        setCameras(nodeList);
      }
    } catch (err) {
      console.log('Cannot fetch cameras');
    }
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const isOnline = await checkBackendHealth();
      if (isOnline) {
        await Promise.all([fetchEvents(), fetchCameras()]);
      }
      setIsLoading(false);
    };
    init();

    // Poll every 30 seconds
    const interval = setInterval(async () => {
      const isOnline = await checkBackendHealth();
      if (isOnline) {
        await fetchEvents();
        await fetchCameras();
      }
    }, refreshInterval * 1000); // <-- use state (convert seconds to ms)

    return () => clearInterval(interval);
  }, [refreshInterval]); // <-- run again when refreshInterval changes

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      await Promise.all([fetchEvents(), fetchCameras()]);
    }
    setIsLoading(false);
  };

  // Render different content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <>
            {/* Backend Status Banner */}
            {backendStatus !== 'online' && (
              <div className="status-banner warning">
                <WifiOff size={18} />
                <span>Backend not connected. Showing demo mode.</span>
                <button onClick={handleRefresh} className="retry-btn">
                  <RefreshCw size={14} /> Retry
                </button>
              </div>
            )}

            {/* Empty State Banner */}
            {backendStatus === 'online' && events.length === 0 && !isLoading && (
              <div className="status-banner info">
                <Server size={18} />
                <span>Connected to backend, but no events detected yet. Waiting for camera data...</span>
              </div>
            )}

            <StatsCards 
              events={events} 
              cameras={cameras}
              isLoading={isLoading} 
              backendStatus={backendStatus}
            />
            
            <div className="main-panels">
              <div className="events-panel">
                <EventLog 
                  events={events}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onEventSelect={handleEventSelect}
                  selectedEvent={selectedEvent}
                  isLoading={isLoading}
                  backendStatus={backendStatus}
                />
              </div>
            </div>
          </>
        );

      case 'events':
        return (
          <div className="full-panel">
            {backendStatus !== 'online' && (
              <div className="status-banner warning">
                <WifiOff size={18} />
                <span>Backend offline — showing cached data</span>
              </div>
            )}
            <EventLog 
              events={events}
              filters={filters}
              onFilterChange={handleFilterChange}
              onEventSelect={handleEventSelect}
              selectedEvent={selectedEvent}
              isLoading={isLoading}
              backendStatus={backendStatus}
              fullWidth={true}
            />
          </div>
        );

      case 'cameras':
        return (
          <div className="full-panel">
            <h2>Camera Management</h2>
            
            {cameras.length > 0 ? (
              <div className="camera-grid">
                {cameras.map((camera, index) => (
                  <div key={camera.id || index} className="camera-card">
                    <Camera size={48} />
                    <h3>{camera.name || `Camera ${index + 1}`}</h3>
                    <span className={`status-badge ${camera.status || 'online'}`}>
                      {camera.status || 'Online'}
                    </span>
                    <p>{camera.ip && <p>{camera.ip}</p>}</p>
                    <small>{camera.type || 'Raspberry Pi'}</small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <Camera size={64} />
                <h3>No Cameras Registered</h3>
                <p>Cameras will appear here when sensor nodes connect to the backend</p>
                <button onClick={handleRefresh} className="setting-button" style={{ width: 'auto', marginTop: '16px' }}>
                  <RefreshCw size={16} /> Check for Cameras
                </button>
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className="full-panel">
            <h2>Settings</h2>
            <div className="settings-grid">
              <div className="setting-card">
                <h3>Backend API URL</h3>
                <input 
                  type="text" 
                  placeholder="http://backend:3001" 
                  className="setting-input"
                  defaultValue={localStorage.getItem('apiUrl') || 'http://100.95.198.3:8000'}
                  onChange={(e) => localStorage.setItem('apiUrl', e.target.value)}
                />
                <small>REST API endpoint for events and health data</small>
              </div>

              <div className="setting-card">
                <h3>Refresh Interval (seconds)</h3>
                <input 
                  type="number" 
                  className="setting-input"
                  value={refreshInterval}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    setRefreshInterval(newValue);
                    localStorage.setItem('refreshInterval', newValue);
                  }}
                  min="5"
                  max="300"                
                />
                <small>How often to poll for new events</small>
              </div>

              <div className="setting-card">
                <h3>Connection Status</h3>
                <div className="connection-info">
                  <span className={`status-indicator ${backendStatus}`}></span>
                  <span>
                    {backendStatus === 'online' ? 'Backend Connected' : 
                     backendStatus === 'offline' ? 'Backend Offline' : 
                     'Checking...'}
                  </span>
                </div>
                <button 
                  className="setting-button"
                  style={{ marginTop: '12px' }}
                  onClick={() => {
                    const apiUrl = localStorage.getItem('apiUrl') || 'http://100.95.198.3:8000';
                    fetch(`${apiUrl}/health`)
                      .then(r => r.json())
                      .then(data => {
                        setBackendStatus('online');
                        alert('✅ Connected!\n\n' + JSON.stringify(data, null, 2));
                      })
                      .catch(err => {
                        setBackendStatus('offline');
                        alert('❌ Cannot connect to:\n' + apiUrl);
                      });
                  }}
                >
                  Test Connection
                </button>
              </div>
              
              <div className="setting-card">
                <h3>Reset to Defaults</h3>
                <button 
                  className="setting-button reset"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                >
                  Reset All Settings
                </button>
                <small>Clear saved settings and reload</small>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a view</div>;
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView}
        backendStatus={backendStatus}
      />
      
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h1>Edge Computing Monitoring</h1>
            <span className="connection-status">
              {backendStatus === 'online' ? (
                <>
                  <span className="status-dot green"></span>
                  <span>Connected</span>
                </>
              ) : backendStatus === 'offline' ? (
                <>
                  <span className="status-dot red"></span>
                  <span>Offline</span>
                </>
              ) : (
                <>
                  <span className="status-dot yellow"></span>
                  <span>Checking...</span>
                </>
              )}
            </span>
          </div>
          <div className="top-bar-right">
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            
            <button onClick={handleRefresh} className="refresh-btn-header">
              <RefreshCw size={16} />
            </button>
            <NotificationBell events={events} />
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;