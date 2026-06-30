import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEARCH_TEXT_MAX_LENGTH,
  escapeRegex,
  hasSearchText,
  normalizeSearchText,
  toSearchRegex,
} from './searchText.js';

test('normalizes search text by trimming and capping at 50 characters', () => {
  assert.equal(SEARCH_TEXT_MAX_LENGTH, 50);
  assert.equal(normalizeSearchText(`  ${'a'.repeat(60)}  `), 'a'.repeat(50));
});

test('treats empty and one-character search text as not searchable', () => {
  assert.equal(hasSearchText(''), false);
  assert.equal(hasSearchText(' a '), false);
  assert.equal(hasSearchText(' ab '), true);
});

test('escapes regex metacharacters before building regex search text', () => {
  assert.equal(escapeRegex('Ronaldo.*(ST)?'), 'Ronaldo\\.\\*\\(ST\\)\\?');
  assert.equal(toSearchRegex(' Ronaldo.*(ST)? '), 'Ronaldo\\.\\*\\(ST\\)\\?');
});
