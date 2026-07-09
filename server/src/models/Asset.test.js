import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Asset from './Asset.js';

function validVersion(overrides = {}) {
  return {
    version: 1,
    cloudinaryPublicId: 'fco/general/hero-v1',
    secureUrl: 'https://res.cloudinary.com/demo/image/upload/fco/general/hero-v1.png',
    width: 100,
    height: 80,
    format: 'png',
    bytes: 1234,
    uploadedBy: new mongoose.Types.ObjectId(),
    uploadedAt: new Date('2026-07-07T00:00:00.000Z'),
    source: 'admin',
    ...overrides,
  };
}

function validAsset(overrides = {}) {
  return new Asset({
    category: 'general',
    key: 'hero-banner',
    label: 'Hero banner',
    sourcePath: null,
    status: 'active',
    activeVersion: 1,
    versions: [validVersion()],
    ...overrides,
  });
}

async function assertInvalidField(asset, field) {
  await assert.rejects(() => asset.validate(), (error) => Boolean(error.errors?.[field]));
}

test('schema defines required indexes', () => {
  const indexes = Asset.schema.indexes();
  assert.ok(indexes.some(([fields, options]) => fields.category === 1 && fields.key === 1 && options.unique === true));
  assert.ok(indexes.some(([fields]) => fields.status === 1 && fields.category === 1 && fields.updatedAt === -1));
  assert.ok(indexes.some(([fields]) => fields.key === 'text' && fields.label === 'text' && fields.sourcePath === 'text' && fields['versions.cloudinaryPublicId'] === 'text'));
});

test('valid active asset passes validation and preserves nullable sourcePath', async () => {
  const asset = validAsset();
  await assert.doesNotReject(() => asset.validate());
  assert.equal(asset.sourcePath, null);
});

test('status is restricted to active or archived', async () => {
  await assertInvalidField(validAsset({ status: 'draft' }), 'status');
});

test('active assets require a non-empty versions array', async () => {
  await assertInvalidField(validAsset({ versions: [] }), 'versions');
});

test('activeVersion must exist in versions', async () => {
  await assertInvalidField(validAsset({ activeVersion: 2 }), 'activeVersion');
});

test('embedded version metadata is required', async () => {
  const requiredFields = ['version', 'cloudinaryPublicId', 'secureUrl', 'width', 'height', 'format', 'bytes', 'source'];
  for (const field of requiredFields) {
    const version = validVersion();
    delete version[field];
    await assertInvalidField(validAsset({ versions: [version] }), `versions.0.${field}`);
  }
});

test('version source is restricted to migration or admin', async () => {
  await assertInvalidField(validAsset({ versions: [validVersion({ source: 'api' })] }), 'versions.0.source');
});

test('version numbers must be unique positive integers', async () => {
  await assertInvalidField(validAsset({ versions: [validVersion({ version: 0 })] }), 'versions.0.version');
  await assertInvalidField(
    validAsset({
      versions: [validVersion({ version: 1 }), validVersion({ version: 1, cloudinaryPublicId: 'fco/general/hero-v1-copy' })],
    }),
    'versions'
  );
});

test('category allowlist is enforced', async () => {
  await assertInvalidField(validAsset({ category: 'misc' }), 'category');
});

test('per-category key validation is enforced', async () => {
  const validIdentities = [
    ['cardTheme', 'ng'],
    ['cardTheme', '865'],
    ['upgradeBadge', '0'],
    ['upgradeBadge', '13'],
    ['upgradeMascot', 'happy'],
    ['upgradeMascot', 'sad'],
    ['upgradeBase', 'default'],
    ['upgradeEffect', 'shatter'],
    ['seasonSprite', 'fifaaddict'],
    ['badgeSprite', 'fc-online'],
    ['siteAsset', 'favicon'],
    ['teamColorIcon', 'relation'],
    ['general', 'hero-banner'],
  ];

  for (const [category, key] of validIdentities) {
    await assert.doesNotReject(() => validAsset({ category, key }).validate());
  }

  const invalidIdentities = [
    ['cardTheme', 'bad key'],
    ['upgradeBadge', '14'],
    ['upgradeMascot', 'neutral'],
    ['upgradeBase', 'new'],
    ['upgradeEffect', 'flash'],
    ['seasonSprite', 'other'],
    ['badgeSprite', 'fc_online'],
    ['siteAsset', 'logo'],
    ['teamColorIcon', 'league'],
    ['general', 'hero_banner'],
  ];

  for (const [category, key] of invalidIdentities) {
    await assertInvalidField(validAsset({ category, key }), 'key');
  }
});

test('general keys are trimmed and lowercased', async () => {
  const asset = validAsset({ category: 'general', key: ' Legal-Notice ' });
  await asset.validate();
  assert.equal(asset.key, 'legal-notice');
});
