export const getApiUrl = () => {
  return localStorage.getItem('apiUrl') || 
          process.env.REACT_APP_API_URL || 
          'http://100.95.198.3:8000';
};