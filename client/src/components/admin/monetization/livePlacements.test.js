import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLivePlacements } from './livePlacements.js';

test('keeps only placements rendered in the public app', () => {
  const placements = [
    { key: 'dashboard_inline', label: 'Dashboard – Giữa trang' },
    { key: 'market_top', label: 'Market – Trên cùng' },
    { key: 'videos_top', label: 'Videos – Trên cùng' },
    { key: 'videos_inline', label: 'Videos – Nội dung chính' },
    { key: 'videos_aff', label: 'Videos – Sidebar affiliate' },
    { key: 'videos_bottom', label: 'Videos – Dưới cùng' },
    { key: 'calculator_bottom', label: 'Calculator – Dưới cùng' },
    { key: 'player_detail_sidebar', label: 'Player Detail – Sidebar' },
  ];

  assert.deepEqual(filterLivePlacements(placements).map((p) => p.key), [
    'videos_top',
    'videos_inline',
    'videos_aff',
    'videos_bottom',
    'player_detail_sidebar',
  ]);
});
