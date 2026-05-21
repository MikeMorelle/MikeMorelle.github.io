import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import EventLog from './EventLog';
import EventMap from './EventMap';
import StatsCards from './StatsCards';
import SystemHealth from './SystemHealth';
import NotificationBell from './NotificationBell';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';
import { Camera, Settings } from 'lucide-react';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    severity: 'all',
    dateRange: '24h',
    camera: 'all'
  });

  // Fetch initial events via REST API
  const { data: initialEvents, error } = useApi('/api/events');
  
  // Real-time updates via WebSocket/MQTT
  const { lastMessage, connectionStatus } = useWebSocket('ws://localhost:8080/ws');

  // Mock data for testing when no backend
  const mockEvents = [
    {
      id: 1,
      type: 'intrusion',
      severity: 'high',
      description: 'Unauthorized person detected in restricted area',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      cameraId: 'cam-1',
      location: { lat: 51.505, lng: -0.09, name: 'Main Entrance' },
      thumbnail: 'https://picsum.photos/200/100?random=1'
    },
    {
      id: 2,
      type: 'fire',
      severity: 'high',
      description: 'Smoke detected in server room',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      cameraId: 'cam-2',
      location: { lat: 51.51, lng: -0.1, name: 'Server Room' },
      thumbnail: 'https://picsum.photos/200/100?random=2'
    },
    {
      id: 3,
      type: 'vandalism',
      severity: 'medium',
      description: 'Graffiti activity detected near parking lot',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      cameraId: 'cam-3',
      location: { lat: 51.50, lng: -0.08, name: 'Parking Lot' },
      thumbnail: 'https://picsum.photos/200/100?random=3'
    },
    {
      id: 4,
      type: 'suspicious',
      severity: 'low',
      description: 'Loitering detected at side entrance',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      cameraId: 'cam-1',
      location: { lat: 51.506, lng: -0.095, name: 'Side Entrance' },
      thumbnail: 'https://picsum.photos/200/100?random=4'
    },
    {
      id: 5,
      type: 'theft',
      severity: 'high',
      description: 'Package theft detected at loading dock',
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      cameraId: 'cam-4',
      location: { lat: 51.508, lng: -0.085, name: 'Loading Dock' },
      thumbnail: 'https://picsum.photos/200/100?random=5'
    }
  ];

  useEffect(() => {
    // Use mock data for now, switch to real data when backend is ready
    if (initialEvents && initialEvents.length > 0) {
      setEvents(initialEvents);
    } else {
      // Load mock data for testing
      setEvents(mockEvents);
    }
    setIsLoading(false);
  }, [initialEvents]);

  useEffect(() => {
    if (lastMessage) {
      try {
        const newEvent = JSON.parse(lastMessage.data);
        setEvents(prev => [newEvent, ...prev]);
      } catch (e) {
        console.log('WebSocket message received:', lastMessage);
      }
    }
  }, [lastMessage]);

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  // Render different content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <>
            <StatsCards events={events} isLoading={isLoading} />
            <div className="main-panels">
              <div className="map-panel">
                <EventMap 
                  events={events} 
                  selectedEvent={selectedEvent}
                  onEventSelect={handleEventSelect}
                />
              </div>
              <div className="events-panel">
                <EventLog 
                  events={events}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onEventSelect={handleEventSelect}
                  selectedEvent={selectedEvent}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </>
        );

      case 'events':
        return (
          <div className="full-panel">
            <EventLog 
              events={events}
              filters={filters}
              onFilterChange={handleFilterChange}
              onEventSelect={handleEventSelect}
              selectedEvent={selectedEvent}
              isLoading={isLoading}
              fullWidth={true}
            />
          </div>
        );

      case 'map':
        return (
          <div className="full-panel map-fullscreen">
            <EventMap 
              events={events} 
              selectedEvent={selectedEvent}
              onEventSelect={handleEventSelect}
            />
          </div>
        );

      case 'cameras':
        return (
          <div className="full-panel">
            <h2>Camera Management</h2>
            <div className="camera-grid">
              {['cam-1', 'cam-2', 'cam-3', 'cam-4'].map(cam => (
                <div key={cam} className="camera-card">
                  <Camera size={48} />
                  <h3>{cam.toUpperCase()}</h3>
                  <span className="status-badge online">Online</span>
                  <p>192.168.1.{10 + parseInt(cam.split('-')[1])}</p>
                  <small>Raspberry Pi 5</small>
                </div>
              ))}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="full-panel">
            <h2>Settings</h2>
            <div className="settings-grid">
              <div className="setting-card">
                <h3>Backend API</h3>
                <input type="text" placeholder="http://backend:3001" className="setting-input" />
              </div>
              <div className="setting-card">
                <h3>WebSocket URL</h3>
                <input type="text" placeholder="ws://backend:8080/ws" className="setting-input" />
              </div>
              <div className="setting-card">
                <h3>Notification Channel</h3>
                <select className="setting-input">
                  <option>Telegram</option>
                  <option>Email</option>
                  <option>Slack</option>
                </select>
              </div>
              <div className="setting-card">
                <h3>Refresh Interval</h3>
                <input type="number" placeholder="30" className="setting-input" />
                <small>seconds</small>
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
      />
      
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h1>Edge Computing Monitoring</h1>
            <span className="connection-status">
              <span className={`status-dot ${connectionStatus === 'connected' ? 'green' : 'red'}`} />
              {connectionStatus === 'connected' ? 'Live' : 'Demo Mode'}
            </span>
          </div>
          <div className="top-bar-right">
            <NotificationBell events={events} />
            <SystemHealth />
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;