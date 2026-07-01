import { expect, it } from 'vitest';
import { normalizePlacementIds } from './placementIds.js';

it('normalizes populated placement objects and raw ids to strings', () => {
  expect(
    normalizePlacementIds([
      { _id: 'placement-a', key: 'player_detail_sidebar' },
      'placement-b',
    ])
  ).toEqual(['placement-a', 'placement-b']);
});
