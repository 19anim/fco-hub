const LIVE_PLACEMENT_KEYS = new Set([
  'videos_top',
  'videos_inline',
  'videos_aff',
  'videos_bottom',
  'player_detail_sidebar',
  'squad_top',
  'squad_bottom',
]);

export function filterLivePlacements(placements = []) {
  return placements.filter((placement) => LIVE_PLACEMENT_KEYS.has(placement.key));
}
