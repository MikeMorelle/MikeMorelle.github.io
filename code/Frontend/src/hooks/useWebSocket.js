// src/hooks/useWebSocket.js
import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (defaultUrl) => {
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const ws = useRef(null);

  useEffect(() => {
    // Read WebSocket URL from localStorage or use default
    const wsUrl = localStorage.getItem('wsUrl') || defaultUrl;
    
    const connect = () => {
      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          setConnectionStatus('connected');
        };

        ws.current.onmessage = (event) => {
          setLastMessage(event);
        };

        ws.current.onclose = () => {
          setConnectionStatus('disconnected');
          setTimeout(connect, 5000);
        };

        ws.current.onerror = () => {
          setConnectionStatus('error');
        };
      } catch (error) {
        setConnectionStatus('error');
        setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [defaultUrl]);

  return { lastMessage, connectionStatus };
};