import axios from 'axios';
import { API_BASE } from '../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/monetization`, withCredentials: true });

export const adminMonetizationService = {
  list: (params) => api.get('/', { params }).then(r => r.data),
  getById: (id) => api.get(`/${id}`).then(r => r.data),
  create: (data) => api.post('/', data).then(r => r.data),
  update: (id, data) => api.put(`/${id}`, data).then(r => r.data),
  publish: (id) => api.patch(`/${id}/publish`).then(r => r.data),
  unpublish: (id) => api.patch(`/${id}/unpublish`).then(r => r.data),
  archive: (id) => api.patch(`/${id}/archive`).then(r => r.data),
  duplicate: (id) => api.post(`/${id}/duplicate`).then(r => r.data),
  delete: (id) => api.delete(`/${id}`).then(r => r.data),
};
