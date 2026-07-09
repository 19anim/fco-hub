import axios from 'axios';
import { API_BASE } from '../../config/api.js';

export async function fetchPublicAssetMap() {
  const response = await axios.get(`${API_BASE}/assets/public-map`);
  return {
    map: response.data?.data || {},
    updatedAt: response.data?.updatedAt ?? null,
  };
}
