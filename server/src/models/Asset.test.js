import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Asset from './Asset.js';

function validVersion(overrides = {}) {
  return {
    version: 1,
    cloudinaryPublicId: 'assets/card-themes/ng/v1',
    secureUrl: 'https://res.cloudinary.com/demo/image/upload/assets/card-themes/ng/v1.png',
    width: 120,
    height: 160,
    format: 'png',
    bytes: 4096,
    uploadedBy: new mongoose.Types.ObjectId(),
    uploadedAt: new Date('2026-07-07T00:00:00.000Z'),
    source: 'admin',
    ...overrides,
  };
}

function validAsset(overrides = {}) {
  return new Asset({
    category: 'cardTheme',
    key: 'ng',
    label: 'New Generation Theme',
    status: 'active',
    sourcePath: null,
    activeVersion: 1,
    versions: [validVersion()],
    ...overrides,
  });
}

async function assertValidationError(path, overrides) {
  await assert.rejects(
    () => validAsset(overrides).validate(),
    (error) => {
      assert.ok(error.errors);
      assert.deepEqual(Object.keys(error.errors), [path]);
      return true;
    }
  );
}

test('asset schema defines required indexes for uniqueness, list search, and text search', () => {
  const indexes = Asset.schema.indexes();

  assert.ok(indexes.some(([fields, options]) => (
    fields.category === 1 && fields.key === 1 && options.unique === true
  )));
  assert.ok(indexes.some(([fields]) => (
    fields.status === 1 && fields.category === 1 && fields.updatedAt === -1
  )));
  assert.ok(indexes.some(([fields]) => (
    fields.key === 'text' && fields.label === 'text' && fields.sourcePath === 'text'
      && fields['versions.cloudinaryPublicId'] === 'text'
  )));
});

test('active asset validates with a nullable sourcePath and complete version metadata', async () => {
  await assert.doesNotReject(() => validAsset({ sourcePath: null }).validate());
});

test('asset status is limited to draft, active, archived, and disabled', async () => {
  await assertValidationError('status', { status: 'published' });
});

test('active assets require at least one version', async () => {
  await assertValidationError('versions', { versions: [], activeVersion: undefined });
});

test('version metadata fields are required', async () => {
  const version = validVersion();
  delete version.secureUrl;

  await assertValidationError('versions.0.secureUrl', { versions: [version] });
});

test('version numbers must be positive and unique within an asset', async () => {
  await assertValidationError('versions.0.version', { status: 'draft', activeVersion: undefined, versions: [validVersion({ version: 0 })] });
  await assertValidationError('versions', { versions: [validVersion(), validVersion({ cloudinaryPublicId: 'assets/card-themes/ng/v1-copy' })] });
});

test('activeVersion must reference an existing version', async () => {
  await assertValidationError('activeVersion', { activeVersion: 2 });
});

test('category must be in the asset category allowlist', async () => {
  await assertValidationError('category', { status: 'draft', category: 'unknown', activeVersion: undefined });
});

test('category-specific key validation rejects invalid keys with the key field', async () => {
  const cases = [
    ['cardTheme', 'bad_theme'],
    ['upgradeBadge', '14'],
    ['upgradeMascot', 'angry'],
    ['upgradeBase', 'alternate'],
    ['upgradeEffect', 'sparkle'],
    ['seasonSprite', 'other'],
    ['badgeSprite', 'other'],
    ['siteAsset', 'logo'],
    ['teamColorIcon', 'tier'],
    ['general', 'Bad Key'],
  ];

  for (const [category, key] of cases) {
    await assertValidationError('key', { category, key });
  }
});
