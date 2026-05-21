// src/hooks/useWebSocket.js
import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (url) => {
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const ws = useRef(null);

  useEffect(() => {
    const connect = () => {
      try {
        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
          setConnectionStatus('connected');
        };

        ws.current.onmessage = (event) => {
          setLastMessage(event);
        };

        ws.current.onclose = () => {
          setConnectionStatus('disconnected');
          // Reconnect after 5 seconds
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
  }, [url]);

  return { lastMessage, connectionStatus };
};