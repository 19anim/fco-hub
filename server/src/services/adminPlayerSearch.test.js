import test from 'node:test';
import assert from 'node:assert/strict';
import { toLinkedPlayerResult } from './adminPlayerSearch.js';

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
