// src/hooks/useApi.js
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const getApiUrl = () => {
  return localStorage.getItem('apiUrl') || 
         process.env.REACT_APP_API_URL || 
         'http://localhost:3001';
};

export const useApi = (endpoint) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}${endpoint}`);
      
      // Handle both array response and wrapped response
      if (Array.isArray(response.data)) {
        setData(response.data);
      } else if (response.data && response.data.events) {
        setData(response.data.events);
      } else {
        setData(response.data);
      }
      setError(null);
    } catch (err) {
      // Silently fail - dashboard will show mock data
      if (err.response && err.response.status !== 404) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
    
    // Poll based on refresh interval setting
    const interval = parseInt(localStorage.getItem('refreshInterval') || '30');
    const pollInterval = setInterval(fetchData, interval * 1000);
    
    return () => clearInterval(pollInterval);
  }, [fetchData]);

  return { data, error, loading, refetch: fetchData };
};