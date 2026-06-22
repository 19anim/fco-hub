import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMonetizationItem } from './monetizationValidator.js';

const baseItem = {
  type: 'affiliate_link',
  title: 'Affiliate CTA',
  platform: 'custom',
  placementIds: ['placement-id'],
  content: {
    targetUrl: 'https://example.com/product',
    ctaLabel: 'Xem ngay',
  },
};

test('rejects affiliate target URLs with credentials', () => {
  const result = validateMonetizationItem({
    ...baseItem,
    content: {
      ...baseItem.content,
      targetUrl: 'https://admin:secret@example.com/product',
    },
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['content.targetUrl must be a safe http(s) URL without credentials']);
});

test('rejects affiliate link URLs with credentials', () => {
  const result = validateMonetizationItem({
    ...baseItem,
    affiliateLinks: [
      { label: 'Buy', url: 'https://admin:secret@example.com/product' },
    ],
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['affiliateLinks[0].url must be a safe http(s) URL without credentials']);
});

test('allows safe affiliate redirect URLs', () => {
  const result = validateMonetizationItem({
    ...baseItem,
    affiliateLinks: [
      { label: 'Buy', url: 'https://example.com/product?ref=abc' },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});
