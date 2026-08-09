import React from 'react';
import { AlertTriangle, Flame, Camera, UserX, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const typeIcons = {
  intrusion: UserX,
  fire: Flame,
  vandalism: AlertTriangle,
  theft: AlertTriangle,
  suspicious: AlertTriangle
};

const EventCard = ({ event, isSelected, onClick }) => {
  const Icon = typeIcons[event.event_type] || AlertTriangle;
  const timeAgo = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });

  return (
    <div 
      className={`event-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="event-card-header">
        <div className="event-type">
          <Icon size={20} />
          <span className="event-type-text">{event.event_type}</span>
        </div>
        <span className="severity-badge" style={{ backgroundColor: '#ef4444' }}>
          {event.status}
        </span>
      </div>
      
      <p className="event-description">
        {event.event_type} detected by {event.node_id}
      </p>
      
      <div className="event-card-footer">
        <div className="event-meta">
          <Clock size={14} />
          <span>{timeAgo}</span>
        </div>
        <div className="event-meta">
          <Camera size={14} />
          <span>{event.node_id}</span>
        </div>
      </div>

      {/* Show image if file_id exists */}
      {event.file_id && (
        <img 
          src={`http://localhost:8888/buckets/events/${event.file_id}`}
          alt="Event"
          className="event-thumbnail"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
    </div>
  );
};

export default EventCard;