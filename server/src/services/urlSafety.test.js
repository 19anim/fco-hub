import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeRedirectUrl, sanitizeAffiliateLinks } from './urlSafety.js';

test('rejects redirect URLs with username or password', () => {
  assert.equal(isSafeRedirectUrl('https://admin:secret@example.com/path'), false);
  assert.equal(isSafeRedirectUrl('https://admin@example.com/path'), false);
});

test('allows only http and https redirect URLs without credentials', () => {
  assert.equal(isSafeRedirectUrl('https://example.com/path?x=1'), true);
  assert.equal(isSafeRedirectUrl('http://example.com/path'), true);
  assert.equal(isSafeRedirectUrl('javascript:alert(1)'), false);
});

test('sanitizes public affiliate links by removing raw urls', () => {
  assert.deepEqual(
    sanitizeAffiliateLinks([{ label: 'Buy', url: 'https://example.com/secret', imageUrl: 'https://cdn.example.com/a.png' }]),
    [{ label: 'Buy', imageUrl: 'https://cdn.example.com/a.png' }]
  );
});
