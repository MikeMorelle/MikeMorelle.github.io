// src/components/StatsCards.jsx
import React from 'react';
import { AlertTriangle, Camera, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';

const StatsCards = ({ events, isLoading }) => {
  const stats = {
    total: events.length,
    threats: events.filter(e => e.severity === 'high').length,
    cameras: [...new Set(events.map(e => e.cameraId))].length,
    lastEvent: events[0]?.timestamp || null
  };

  const cards = [
    {
      title: 'Total Events',
      value: isLoading ? '...' : stats.total,
      icon: <AlertTriangle size={24} />,
      color: '#3b82f6',
      bg: '#eff6ff'
    },
    {
      title: 'Threats Detected',
      value: isLoading ? '...' : stats.threats,
      icon: <Shield size={24} />,
      color: '#ef4444',
      bg: '#fef2f2'
    },
    {
      title: 'Active Cameras',
      value: isLoading ? '...' : stats.cameras,
      icon: <Camera size={24} />,
      color: '#10b981',
      bg: '#f0fdf4'
    },
    {
      title: 'Last Detection',
      value: stats.lastEvent ? format(new Date(stats.lastEvent), 'HH:mm:ss') : 'N/A',
      icon: <Clock size={24} />,
      color: '#f59e0b',
      bg: '#fffbeb'
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, index) => (
        <div key={index} className="stat-card" style={{ backgroundColor: card.bg }}>
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