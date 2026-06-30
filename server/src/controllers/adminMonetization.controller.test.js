import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonetizationListFilter } from './adminMonetization.controller.js';

test('monetization list ignores one-character title search', () => {
  assert.deepEqual(buildMonetizationListFilter({ search: ' a ', status: 'published' }), {
    status: 'published',
  });
});

test('monetization list escapes title search regex metacharacters', () => {
  assert.deepEqual(buildMonetizationListFilter({ search: 'sale.*', type: 'youtube_video' }), {
    type: 'youtube_video',
    title: { $regex: 'sale\\.\\*', $options: 'i' },
  });
});
