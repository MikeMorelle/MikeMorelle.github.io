// src/components/NotificationBell.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = ({ events }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenId, setLastSeenId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (events.length > 0 && events[0].id !== lastSeenId) {
      setUnreadCount(prev => prev + 1);
    }
  }, [events, lastSeenId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
      setLastSeenId(events[0]?.id);
    }
  };

  const recentEvents = events.slice(0, 5);

  return (
    <div className="notification-container" ref={dropdownRef}>
      <button className="notification-bell" onClick={handleOpen}>
        {unreadCount > 0 ? <BellRing size={20} /> : <Bell size={20} />}
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
          </div>
          {recentEvents.length === 0 ? (
            <div className="notification-empty">No notifications</div>
          ) : (
            recentEvents.map(event => (
              <div key={event.id} className="notification-item">
                <div className={`notification-dot ${event.severity}`} />
                <div className="notification-content">
                  <strong>{event.type}</strong>
                  <p>{event.description}</p>
                  <small>
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;