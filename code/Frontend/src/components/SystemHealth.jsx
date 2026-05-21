// src/components/SystemHealth.jsx
import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi } from 'lucide-react';

const SystemHealth = () => {
  const [health, setHealth] = useState({
    nodes: [],
    overall: 'healthy'
  });

  useEffect(() => {
    // In production, fetch from your backend
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHealth(data);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mock data for development
  const mockNodes = [
    { name: 'Master Node (RPi 5)', cpu: 45, memory: 62, disk: 38, status: 'healthy' },
    { name: 'Worker Node 1 (RPi 3)', cpu: 72, memory: 81, disk: 55, status: 'warning' },
    { name: 'Worker Node 2 (RPi 3)', cpu: 33, memory: 45, disk: 28, status: 'healthy' },
    { name: 'Camera Node 1 (RPi 5)', cpu: 58, memory: 67, disk: 41, status: 'healthy' },
  ];

  const nodesToDisplay = health.nodes.length > 0 ? health.nodes : mockNodes;

  return (
    <div className="system-health">
      <button className="health-indicator">
        <Activity size={20} />
        <span className={`health-dot ${health.overall}`} />
      </button>

      <div className="health-dropdown">
        <h3>System Health</h3>
        {nodesToDisplay.map((node, index) => (
          <div key={index} className="node-health">
            <div className="node-header">
              <span className="node-name">{node.name}</span>
              <span className={`node-status ${node.status}`}>
                {node.status}
              </span>
            </div>
            <div className="metrics-grid">
              <div className="metric">
                <Cpu size={14} />
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{ 
                      width: `${node.cpu}%`,
                      backgroundColor: node.cpu > 80 ? '#ef4444' : 
                                     node.cpu > 60 ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
                <span>{node.cpu}%</span>
              </div>
              <div className="metric">
                <HardDrive size={14} />
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{ 
                      width: `${node.memory}%`,
                      backgroundColor: node.memory > 80 ? '#ef4444' : 
                                     node.memory > 60 ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
                <span>{node.memory}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemHealth;