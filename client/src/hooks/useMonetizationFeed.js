import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

export function useMonetizationFeed({ placement, entity, type, limit, search }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!placement) { setLoading(false); return; }

    const params = { placement };
    if (entity?.type) params.entityType = entity.type;
    if (entity?.id)   params.entityId   = entity.id;
    if (type)         params.type        = type;
    if (limit)        params.limit       = limit;
    if (search)       params.search      = search;

    setLoading(true);
    axios.get(`${API_BASE}/monetization/feed`, { params })
      .then(r  => setItems(r.data?.data?.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [placement, entity?.type, entity?.id, type, limit, search]);

  return { items, loading };
}
