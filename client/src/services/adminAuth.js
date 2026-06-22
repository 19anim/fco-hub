import axios from 'axios';
import { API_BASE } from '../config/api';

const adminAuthAPI = axios.create({
  baseURL: `${API_BASE}/admin/auth`,
  withCredentials: true,
});

export const adminAuth = {
  async login(email, password) {
    const response = await adminAuthAPI.post('/login', { email, password });
    return response.data;
  },

  async logout() {
    const response = await adminAuthAPI.post('/logout');
    return response.data;
  },

  async getMe() {
    const response = await adminAuthAPI.get('/me');
    return response.data;
  },

  async changePassword(currentPassword, newPassword, confirmPassword) {
    const response = await adminAuthAPI.post('/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },
};
