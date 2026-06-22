import axios from 'axios';
import { API_BASE } from '../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/placements`, withCredentials: true });

export const adminPlacementsService = {
  list: () => api.get('/').then(r => r.data),
  update: (id, data) => api.patch(`/${id}`, data).then(r => r.data),
};
