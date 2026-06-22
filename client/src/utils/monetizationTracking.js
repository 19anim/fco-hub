import axios from 'axios';
import { API_BASE } from '../config/api';

let _sessionId = null;
function getSessionId() {
  if (!_sessionId) {
    _sessionId = sessionStorage.getItem('fco_sid') ||
      (Math.random().toString(36).slice(2) + Date.now().toString(36));
    sessionStorage.setItem('fco_sid', _sessionId);
  }
  return _sessionId;
}

export function trackImpression(itemId, placementKey, entityType, entityId) {
  axios.post(`${API_BASE}/monetization/events`, {
    itemId, placementKey, eventType: 'impression',
    entityType, entityId, sessionId: getSessionId(),
  }).catch(() => {});
}

export function getClickUrl(itemId, placementKey, entityType, entityId) {
  const params = new URLSearchParams({ placement: placementKey, sessionId: getSessionId() });
  if (entityType) params.set('entityType', entityType);
  if (entityId)   params.set('entityId', entityId);
  return `${API_BASE}/monetization/click/${itemId}?${params}`;
}
