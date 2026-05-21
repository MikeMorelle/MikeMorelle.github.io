// src/components/EventCard.jsx
import React from 'react';
import { AlertTriangle, Flame, Camera, UserX, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const severityColors = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981'
};

const typeIcons = {
  intrusion: UserX,
  fire: Flame,
  vandalism: AlertTriangle,
  theft: AlertTriangle
};

const EventCard = ({ event, isSelected, onClick }) => {
  const Icon = typeIcons[event.type] || AlertTriangle;
  const timeAgo = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });

  return (
    <div 
      className={`event-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ borderLeft: `4px solid ${severityColors[event.severity]}` }}
    >
      <div className="event-card-header">
        <div className="event-type">
          <Icon size={20} color={severityColors[event.severity]} />
          <span className="event-type-text">{event.type}</span>
        </div>
        <span 
          className="severity-badge"
          style={{ backgroundColor: severityColors[event.severity] }}
        >
          {event.severity}
        </span>
      </div>
      
      <p className="event-description">{event.description}</p>
      
      <div className="event-card-footer">
        <div className="event-meta">
          <Camera size={14} />
          <span>{event.cameraId}</span>
        </div>
        <div className="event-meta">
          <Clock size={14} />
          <span>{timeAgo}</span>
        </div>
      </div>
      
      {event.thumbnail && (
        <img 
          src={event.thumbnail} 
          alt="Event thumbnail" 
          className="event-thumbnail"
        />
      )}
    </div>
  );
};

export default EventCard;