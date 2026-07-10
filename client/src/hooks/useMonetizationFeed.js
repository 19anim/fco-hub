import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE } from '../config/api';
import { monetizationFeedKey } from '../fco/queryKeys.js';

export function useMonetizationFeed({ placement, entity, type, limit, search }) {
  const params = { placement };
  if (entity?.type) params.entityType = entity.type;
  if (entity?.id)   params.entityId   = entity.id;
  if (type)         params.type        = type;
  if (limit)        params.limit       = limit;
  if (search)       params.search      = search;

  const { data, isLoading: loading } = useQuery({
    queryKey: monetizationFeedKey(params),
    queryFn: async () => {
      const r = await axios.get(`${API_BASE}/monetization/feed`, { params });
      return r.data?.data?.items ?? [];
    },
    enabled: !!placement,
    staleTime: 30 * 1000,
  });

  return { items: data ?? [], loading: placement ? loading : false };
}
