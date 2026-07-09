import axios from 'axios';
import { API_BASE } from '../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/assets`, withCredentials: true });

export const adminAssetsService = {
  list: (params) => api.get('/', { params }).then((r) => r.data),
  getById: (id) => api.get(`/${id}`).then((r) => r.data),
  upload: (formData) => api.post('/upload', formData).then((r) => r.data),
  replace: (id, formData) => api.post(`/${id}/upload`, formData).then((r) => r.data),
  setActiveVersion: (id, version) => api.patch(`/${id}/active-version`, { version }).then((r) => r.data),
  archive: (id) => api.patch(`/${id}/archive`).then((r) => r.data),
  deleteAsset: (id) => api.delete(`/${id}`).then((r) => r.data),
};
