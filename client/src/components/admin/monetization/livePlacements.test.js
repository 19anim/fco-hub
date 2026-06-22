import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLivePlacements } from './livePlacements.js';

test('keeps only placements rendered in the public app', () => {
  const placements = [
    { key: 'dashboard_inline', label: 'Dashboard – Giữa trang' },
    { key: 'videos_top', label: 'Videos – Trên cùng' },
    { key: 'videos_inline', label: 'Videos – Giữa trang' },
    { key: 'player_detail_sidebar', label: 'Player Detail – Sidebar' },
  ];

  assert.deepEqual(filterLivePlacements(placements).map((p) => p.key), [
    'videos_top',
    'videos_inline',
    'player_detail_sidebar',
  ]);
});
