import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlacementIds } from './placementIds.js';

test('normalizes populated placement objects and raw ids to strings', () => {
  assert.deepEqual(
    normalizePlacementIds([
      { _id: 'placement-a', key: 'player_detail_sidebar' },
      'placement-b',
    ]),
    ['placement-a', 'placement-b']
  );
});
