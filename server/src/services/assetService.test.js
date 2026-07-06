import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSET_CATEGORIES, normalizeAssetIdentity } from './assetService.js';

test('asset categories include every current runtime family', () => {
  assert.deepEqual(Object.keys(ASSET_CATEGORIES).sort(), [
    'badgeSprite', 'cardTheme', 'general', 'seasonSprite', 'siteAsset',
    'teamColorIcon', 'upgradeBadge', 'upgradeBase', 'upgradeEffect', 'upgradeMascot',
  ]);
});

test('asset categories expose the required folders and key rules', () => {
  assert.equal(ASSET_CATEGORIES.cardTheme.folder, 'card-themes');
  assert.equal(ASSET_CATEGORIES.upgradeBadge.folder, 'upgrade-badges');
  assert.deepEqual(ASSET_CATEGORIES.upgradeMascot.keys, ['happy', 'sad']);
  assert.deepEqual(ASSET_CATEGORIES.upgradeBase.keys, ['default']);
  assert.deepEqual(ASSET_CATEGORIES.upgradeEffect.keys, ['shatter']);
  assert.deepEqual(ASSET_CATEGORIES.seasonSprite.keys, ['fifaaddict']);
  assert.deepEqual(ASSET_CATEGORIES.badgeSprite.keys, ['fc-online']);
  assert.deepEqual(ASSET_CATEGORIES.siteAsset.keys, ['icons', 'favicon']);
  assert.deepEqual(ASSET_CATEGORIES.teamColorIcon.keys, ['club', 'grade', 'relation']);
  assert.ok(ASSET_CATEGORIES.general.key.test('valid-slug'));
});

test('normalizeAssetIdentity trims category and trims/lowercases keys', () => {
  assert.deepEqual(normalizeAssetIdentity(' general ', ' Featured-Card '), {
    category: 'general',
    key: 'featured-card',
  });
});

test('normalizeAssetIdentity enforces per-category key validation', () => {
  const validCases = [
    ['cardTheme', 'ng'],
    ['cardTheme', 'legendary-theme'],
    ['upgradeBadge', '13'],
    ['upgradeMascot', 'happy'],
    ['upgradeBase', 'default'],
    ['upgradeEffect', 'shatter'],
    ['seasonSprite', 'fifaaddict'],
    ['badgeSprite', 'fc-online'],
    ['siteAsset', 'favicon'],
    ['teamColorIcon', 'relation'],
    ['general', 'player-card'],
  ];

  for (const [category, key] of validCases) {
    assert.deepEqual(normalizeAssetIdentity(category, key), { category, key });
  }
});

test('normalizeAssetIdentity throws a 400 error for invalid category or key', () => {
  for (const [category, key] of [['unknown', 'key'], ['general', 'Bad Key'], ['upgradeBadge', '14']]) {
    assert.throws(
      () => normalizeAssetIdentity(category, key),
      (error) => {
        assert.equal(error.message, 'Invalid asset category or key');
        assert.equal(error.statusCode, 400);
        return true;
      }
    );
  }
});
