const LIVE_PLACEMENT_KEYS = new Set([
  'videos_top',
  'videos_inline',
  'player_detail_sidebar',
]);

export function filterLivePlacements(placements = []) {
  return placements.filter((placement) => LIVE_PLACEMENT_KEYS.has(placement.key));
}
