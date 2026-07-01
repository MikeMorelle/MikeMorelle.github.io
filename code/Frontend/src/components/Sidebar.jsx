import React from 'react';
import { LayoutDashboard, AlertTriangle, Map, Settings, Camera, Shield, Activity } from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'events', label: 'Events', icon: AlertTriangle },
  { id: 'map', label: 'Map View', icon: Map },
  { id: 'cameras', label: 'Cameras', icon: Camera },
  { id: 'grafana', label: 'Grafana', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Sidebar = ({ activeView, onViewChange }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Shield size={28} color="#3b82f6" />
        <span>EdgeMonitor</span>
      </div>
      <nav>
        <ul className="sidebar-nav">
          {menuItems.map(item => (
            <li
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <div className="cluster-status">
          <span className="status-indicator online"></span>
          <span>Cluster Online</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;