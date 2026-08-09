import React from 'react';
import { AlertTriangle, Camera, Shield, Clock, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';

const StatsCards = ({ events, cameras, isLoading, backendStatus }) => {
  const stats = {
    total: events.length,
    threats: events.filter(e => 
      e.event_type === 'intrusion' || 
      e.event_type === 'fire' || 
      e.event_type === 'theft'
    ).length,
    
    cameras: cameras.length || 1,
    lastEvent: events[0]?.timestamp || null
  };

  const cards = [
    {
      title: 'Total Events',
      value: isLoading ? '...' : stats.total,
      icon: <AlertTriangle size={24} />,
      color: '#3b82f6',
      bg: '#eff6ff',
      empty: stats.total === 0 ? 'No events yet' : null
    },
    {
      title: 'Threats Detected',
      value: isLoading ? '...' : stats.threats,
      icon: <Shield size={24} />,
      color: '#ef4444',
      bg: '#fef2f2',
      empty: stats.threats === 0 ? 'No threats' : null
    },
    {
      title: 'Active Cameras',
      value: isLoading ? '...' : stats.cameras,
      icon: <Camera size={24} />,
      color: '#10b981',
      bg: '#f0fdf4',
      subtitle: cameras.length === 0 ? 'None registered' : null
    },
    {
      title: 'Backend Status',
      value: backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : '...',
      icon: backendStatus === 'online' ? <Wifi size={24} /> : <WifiOff size={24} />,
      color: backendStatus === 'online' ? '#10b981' : '#ef4444',
      bg: backendStatus === 'online' ? '#f0fdf4' : '#fef2f2',
      subtitle: backendStatus === 'online' ? 'Connected' : 'Not connected'
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, index) => (
        <div key={index} className="stat-card">
        <div className="stat-icon" style={{ color: card.color }}>
          {card.icon}
        </div>
        <div className="stat-info">
          <h3>{card.title}</h3>
          <p className="stat-value">{card.value}</p>
        </div>
      </div>
      ))}
    </div>
  );
};

export default StatsCards;