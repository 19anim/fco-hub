import { useQuery } from '@tanstack/react-query';
import { fetchPlayers, fetchPlayerDetail, fetchMeta, fetchClubsByLeague, fetchEvents } from './api.js';
import { shouldLoadClubsForLeague } from './views/DatabaseView.filters.js';
import {
  playersKey, playerDetailKey, metaKey, clubsByLeagueKey, eventsKey,
} from './queryKeys.js';

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
