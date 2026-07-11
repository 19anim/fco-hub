import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE } from '../config/api.js';
import { adminAssetsService } from '../services/adminAssets.js';
import { canRunBackendSearch } from '../utils/backendSearch.js';
import { fetchPlayers, fetchPlayerDetail, fetchMeta, fetchClubsByLeague, fetchEvents } from './api.js';
import { shouldLoadClubsForLeague } from './views/DatabaseView.filters.js';
import {
  adminAssetDetailKey,
  adminAssetIdentityKey,
  adminAssetsListKey,
  adminAnalyticsSummaryKey,
  adminAuditLogKey,
  clubsByLeagueKey,
  enrichmentStatusKey,
  eventsKey,
  metaKey,
  playerDetailKey,
  playersKey,
  playerTableKey,
} from './queryKeys.js';

const PLAYERS_API_URL = `${API_BASE}/players`;
const ENRICHMENT_API_URL = `${API_BASE}/enrichment`;
const ADMIN_ANALYTICS_API_URL = `${API_BASE}/admin/analytics`;
const ADMIN_AUDIT_LOG_API_URL = `${API_BASE}/admin/audit-log`;

export function useMetaQuery() {
  return useQuery({
    queryKey: metaKey(),
    queryFn: fetchMeta,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlayersQuery(filters) {
  return useQuery({
    queryKey: playersKey(filters ?? {}),
    queryFn: () => fetchPlayers(filters),
    enabled: filters != null,
    placeholderData: (previous) => previous,
  });
}

export function usePlayerDetailQuery(id) {
  return useQuery({
    queryKey: playerDetailKey(id),
    queryFn: () => fetchPlayerDetail(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePlayerTableQuery(params) {
  return useQuery({
    queryKey: playerTableKey(params ?? {}),
    queryFn: async () => {
      const response = await axios.get(PLAYERS_API_URL, { params });
      return { players: response.data.data ?? [], totalPages: response.data.totalPages ?? 1 };
    },
    enabled: params != null && canRunBackendSearch(params.search),
    placeholderData: (previous) => previous,
  });
}

export function useEnrichmentStatusQuery() {
  return useQuery({
    queryKey: enrichmentStatusKey(),
    queryFn: async () => {
      const response = await axios.get(`${ENRICHMENT_API_URL}/status`);
      return response.data.data;
    },
  });
}

export function useClubsByLeagueQuery(league) {
  return useQuery({
    queryKey: clubsByLeagueKey(league),
    queryFn: () => fetchClubsByLeague(league),
    enabled: shouldLoadClubsForLeague(league),
  });
}

export function useEventsQuery() {
  return useQuery({
    queryKey: eventsKey(),
    queryFn: fetchEvents,
  });
}

export function useAdminAssetsListQuery(params, service = adminAssetsService) {
  return useQuery({
    queryKey: adminAssetsListKey(params ?? {}),
    queryFn: () => service.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useAdminAssetDetailQuery(id, service = adminAssetsService) {
  return useQuery({
    queryKey: adminAssetDetailKey(id),
    queryFn: () => service.getById(id),
    enabled: !!id,
  });
}

export function useAdminAssetIdentityQuery(identity, service = adminAssetsService) {
  return useQuery({
    queryKey: adminAssetIdentityKey(identity ?? {}),
    queryFn: async () => {
      const result = await service.list({ category: identity.category, search: identity.key, status: 'all', limit: 10 });
      return (result.data?.data || []).find((item) => item.category === identity.category && item.key === identity.key) || null;
    },
    enabled: Boolean(identity?.category && identity?.key),
  });
}

export function useAdminAnalyticsSummaryQuery(range) {
  return useQuery({
    queryKey: adminAnalyticsSummaryKey(range),
    queryFn: async () => {
      const from = new Date(Date.now() - range * 86400000).toISOString();
      const response = await axios.get(`${ADMIN_ANALYTICS_API_URL}/summary`, {
        params: { from },
        withCredentials: true,
      });
      return response.data.success ? response.data.data : null;
    },
  });
}

export function useAdminAuditLogQuery({ page, limit, actionFilter }) {
  const params = { page, limit, ...(actionFilter ? { action: actionFilter } : {}) };
  return useQuery({
    queryKey: adminAuditLogKey(params),
    queryFn: async () => {
      const response = await axios.get(`${ADMIN_AUDIT_LOG_API_URL}/`, {
        params,
        withCredentials: true,
      });
      return response.data.success ? response.data.data : { logs: [], total: 0 };
    },
    placeholderData: (previous) => previous,
  });
}
