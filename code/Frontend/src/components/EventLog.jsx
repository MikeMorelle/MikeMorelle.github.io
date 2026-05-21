// src/components/EventLog.jsx
import React, { useState } from 'react';
import { Search, Filter, Download, ChevronDown } from 'lucide-react';
import EventCard from './EventCard';

const EventLog = ({ 
  events, 
  filters, 
  onFilterChange, 
  onEventSelect, 
  selectedEvent,
  isLoading 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredEvents = events.filter(event => {
    if (filters.type !== 'all' && event.type !== filters.type) return false;
    if (filters.severity !== 'all' && event.severity !== filters.severity) return false;
    if (filters.camera !== 'all' && event.cameraId !== filters.camera) return false;
    if (searchTerm && !event.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Type', 'Severity', 'Description', 'Timestamp', 'Camera'];
    const csvData = filteredEvents.map(e => [
      e.id, e.type, e.severity, e.description, e.timestamp, e.cameraId
    ]);
    
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="event-log-container">
      <div className="event-log-header">
        <h2>Event Log</h2>
        <div className="event-log-actions">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="btn-icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </button>
          <button className="btn-icon" onClick={exportCSV}>
            <Download size={18} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <select 
            value={filters.type}
            onChange={(e) => onFilterChange({ type: e.target.value })}
          >
            <option value="all">All Types</option>
            <option value="intrusion">Intrusion</option>
            <option value="fire">Fire</option>
            <option value="vandalism">Vandalism</option>
            <option value="theft">Theft</option>
          </select>
          
          <select 
            value={filters.severity}
            onChange={(e) => onFilterChange({ severity: e.target.value })}
          >
            <option value="all">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          
          <select 
            value={filters.camera}
            onChange={(e) => onFilterChange({ camera: e.target.value })}
          >
            <option value="all">All Cameras</option>
            <option value="cam-1">Camera 1</option>
            <option value="cam-2">Camera 2</option>
            <option value="cam-3">Camera 3</option>
          </select>
        </div>
      )}

      <div className="event-list">
        {isLoading ? (
          <div className="loading">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state">
            <p>No events found</p>
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={selectedEvent?.id === event.id}
              onClick={() => onEventSelect(event)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default EventLog;