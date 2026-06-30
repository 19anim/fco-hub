import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdminPlayerSearchQuery, toLinkedPlayerResult } from './adminPlayerSearch.js';

test('maps PlayerEnrichment rows into linked player picker results', () => {
  const result = toLinkedPlayerResult({
    _id: '507f1f77bcf86cd799439011',
    sourceUid: '300123456',
    displayNameVi: 'Cristiano Ronaldo',
    displayNameEn: 'C. Ronaldo',
    bestPosition: 'ST',
    overall: 121,
    seasonName: '24TOTY',
    seasonCode: '300',
    imageUrl: 'https://example.test/ronaldo.png',
  });

  assert.deepEqual(result, {
    _id: '507f1f77bcf86cd799439011',
    entityId: '507f1f77bcf86cd799439011',
    sourceUid: '300123456',
    name: 'Cristiano Ronaldo',
    position: 'ST',
    overall: 121,
    seasonName: '24TOTY',
    seasonId: '300',
    imageUrl: 'https://example.test/ronaldo.png',
  });
});

test('admin player search returns an impossible query for one-character q', () => {
  assert.deepEqual(buildAdminPlayerSearchQuery({ q: ' r ' }), {
    source: 'fifaaddict-vn',
    overall: { $gt: 0 },
    _id: null,
  });
});

test('admin player search escapes regex metacharacters', () => {
  assert.deepEqual(buildAdminPlayerSearchQuery({ q: 'Ronaldo.*' }), {
    source: 'fifaaddict-vn',
    overall: { $gt: 0 },
    $or: [
      { displayNameVi: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
      { displayNameEn: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
      { fullNameVi: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
      { seasonName: { $regex: 'Ronaldo\\.\\*', $options: 'i' } },
    ],
  });
});
