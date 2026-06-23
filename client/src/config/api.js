export const API_ORIGIN = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
export const API_BASE = `${API_ORIGIN}/api`;
