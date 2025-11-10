const API_BASE = (
  import.meta.env?.VITE_API_BASE_URL ||
  (import.meta.env?.DEV ? 'http://localhost:3001' : 'https://owlit.onrender.com')
).replace(/\/$/, '');

export const withApiBase = (path = '') => `${API_BASE}${path}`;
export const getApiBase = () => API_BASE;
export { API_BASE };
