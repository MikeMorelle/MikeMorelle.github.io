import React, { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive } from 'lucide-react';

const SystemHealth = () => {
  const [nodes, setNodes] = useState([]);
  const [overallHealth, setOverallHealth] = useState('checking');
  const [isOpen, setIsOpen] = useState(false);

  const getApiUrl = () => {
    return localStorage.getItem('apiUrl') || 'http://localhost:8000';
  };

  const fetchHealth = async () => {
    try {
      // Try to get real nodes from backend
      const response = await fetch(`${getApiUrl()}/nodes/`);
      if (response.ok) {
        const data = await response.json();
        const nodeList = Array.isArray(data) ? data : (data.nodes || []);
        
        if (nodeList.length > 0) {
          setNodes(nodeList);
          setOverallHealth('healthy');
        } else {
          // No nodes registered yet
          setNodes([]);
          setOverallHealth('no_nodes');
        }
      } else {
        setOverallHealth('offline');
      }
    } catch (err) {
      setOverallHealth('offline');
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (overallHealth) {
      case 'healthy': return '#10b981';
      case 'no_nodes': return '#f59e0b';
      case 'offline': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const getStatusText = () => {
    switch (overallHealth) {
      case 'healthy': return 'System Healthy';
      case 'no_nodes': return 'No Nodes Connected';
      case 'offline': return 'Backend Offline';
      default: return 'Checking...';
    }
  };

  return (
    <div className="system-health" onClick={() => setIsOpen(!isOpen)}>
      <button className="health-indicator">
        <Activity size={20} />
        <span 
          className="health-dot"
          style={{ backgroundColor: getStatusColor() }}
        />
      </button>

      {isOpen && (
        <div className="health-dropdown" onClick={(e) => e.stopPropagation()}>
          <h3>System Health</h3>
          <p className="health-status-text" style={{ color: getStatusColor() }}>
            {getStatusText()}
          </p>

          {nodes.length > 0 ? (
            nodes.map((node, index) => (
              <div key={node.id || index} className="node-health">
                <div className="node-header">
                  <span className="node-name">
                    {node.name || node.node_id || `Node ${index + 1}`}
                  </span>
                  <span className={`node-status ${node.status || 'healthy'}`}>
                    {node.status || 'online'}
                  </span>
                </div>
                <div className="metrics-grid">
                  <div className="metric">
                    <Cpu size={14} />
                    <div className="metric-bar">
                      <div 
                        className="metric-fill"
                        style={{ 
                          width: `${node.cpu || 0}%`,
                          backgroundColor: (node.cpu || 0) > 80 ? '#ef4444' : 
                                         (node.cpu || 0) > 60 ? '#f59e0b' : '#10b981'
                        }}
                      />
                    </div>
                    <span>{node.cpu || '?'}%</span>
                  </div>
                  <div className="metric">
                    <HardDrive size={14} />
                    <div className="metric-bar">
                      <div 
                        className="metric-fill"
                        style={{ 
                          width: `${node.memory || 0}%`,
                          backgroundColor: (node.memory || 0) > 80 ? '#ef4444' : 
                                         (node.memory || 0) > 60 ? '#f59e0b' : '#10b981'
                        }}
                      />
                    </div>
                    <span>{node.memory || '?'}%</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-nodes-message">
              <p>No sensor nodes registered yet.</p>
              <small>Nodes will appear when cameras connect to the backend.</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemHealth;