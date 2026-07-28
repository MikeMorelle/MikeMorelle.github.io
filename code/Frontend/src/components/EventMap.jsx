import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom threat icon
const threatIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="32" height="32">
      <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const MapController = ({ selectedEvent }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedEvent?.location) {
      map.flyTo(
        [selectedEvent.location.lat, selectedEvent.location.lng],
        18,
        { duration: 1 }
      );
    }
  }, [selectedEvent, map]);

  return null;
};

const EventMap = ({ events, selectedEvent, onEventSelect }) => {
  const center = { lat: 51.505, lng: -0.09 }; // Default center

  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {events.map((event) => (
          event.location && (
            <Marker
              key={event.id}
              position={[event.location.lat, event.location.lng]}
              icon={event.severity === 'high' ? threatIcon : new L.Icon.Default()}
              eventHandlers={{
                click: () => onEventSelect(event)
              }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{event.type}</strong>
                  <p>{event.description}</p>
                  <small>{new Date(event.timestamp).toLocaleString()}</small>
                  {event.image && (
                    <img 
                      src={event.image} 
                      alt="Event" 
                      style={{ width: '150px', marginTop: '8px' }}
                    />
                  )}
                </div>
              </Popup>
            </Marker>
          )
        ))}
        
        <MapController selectedEvent={selectedEvent} />
      </MapContainer>
    </div>
  );
};

export default EventMap;