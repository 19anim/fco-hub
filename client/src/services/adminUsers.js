import axios from 'axios';
import { API_BASE } from '../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/users`, withCredentials: true });

export const adminUsersService = {
  list: () => api.get('/').then(r => r.data),
  get: (id) => api.get(`/${id}`).then(r => r.data),
  create: ({ name, email, temporaryPassword, permissions }) =>
    api.post('/', { name, email, temporaryPassword, permissions }).then(r => r.data),
  update: (id, data) => api.patch(`/${id}`, data).then(r => r.data),
  resetPassword: (id, temporaryPassword) =>
    api.post(`/${id}/reset-password`, { temporaryPassword }).then(r => r.data),
};
