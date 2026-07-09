import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSET_CATEGORIES,
  archiveAsset,
  createAssetUpload,
  getAssetDetail,
  getPublicAssetMap,
  listAssets,
  normalizeAssetIdentity,
  replaceAssetUpload,
  rollbackAssetVersion,
} from './assetService.js';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function version(number, overrides = {}) {
  return {
    version: number,
    cloudinaryPublicId: `pid-v${number}`,
    secureUrl: `https://cdn.example.com/v${number}.png`,
    width: 100 + number,
    height: 200 + number,
    format: 'png',
    bytes: 1000 + number,
    uploadedBy: `user-${number}`,
    uploadedAt: new Date(`2026-01-0${Math.min(number, 9)}T00:00:00.000Z`).toISOString(),
    source: 'admin',
    ...overrides,
  };
}

function asset(overrides = {}) {
  return {
    _id: 'asset-1',
    category: 'general',
    key: 'hero',
    label: 'Hero',
    sourcePath: '/local/hero.png',
    status: 'active',
    activeVersion: 1,
    versions: [version(1)],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function matchesValue(actual, expected) {
  if (expected instanceof RegExp) {
    return expected.test(String(actual ?? ''));
  }
  return actual === expected;
}

function getPath(value, path) {
  return path.split('.').reduce((current, part) => {
    if (Array.isArray(current)) {
      return current.map((item) => item?.[part]);
    }
    return current?.[part];
  }, value);
}

function matchesCriteria(doc, criteria = {}) {
  return Object.entries(criteria).every(([key, expected]) => {
    if (key === '$or') {
      return expected.some((condition) => matchesCriteria(doc, condition));
    }
    const actual = getPath(doc, key);
    if (Array.isArray(actual)) {
      return actual.some((item) => matchesValue(item, expected));
    }
    return matchesValue(actual, expected);
  });
}

function compareValues(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  return String(left).localeCompare(String(right));
}

function makeRepository(initialDocs = [], options = {}) {
  const state = initialDocs.map(clone);
  const calls = [];
  const repository = {
    state,
    calls,
    async create(doc) {
      calls.push({ method: 'create', doc: clone(doc) });
      if (options.createError) {
        throw options.createError;
      }
      const now = options.now ?? '2026-02-01T00:00:00.000Z';
      const created = { _id: `asset-${state.length + 1}`, createdAt: now, updatedAt: now, ...clone(doc) };
      state.push(created);
      return clone(created);
    },
    findOne(filter) {
      calls.push({ method: 'findOne', filter: clone(filter) });
      const found = state.find((doc) => matchesCriteria(doc, filter));
      return Promise.resolve(clone(found) ?? null);
    },
    findById(id) {
      calls.push({ method: 'findById', id });
      const found = state.find((doc) => doc._id === id);
      return Promise.resolve(clone(found) ?? null);
    },
    async updateOne(filter, update, optionsArg) {
      calls.push({ method: 'updateOne', filter: clone(filter), update: clone(update), options: clone(optionsArg) });
      if (options.updateError) {
        throw options.updateError;
      }
      if (options.matchedCount === 0) {
        return { matchedCount: 0, modifiedCount: 0 };
      }
      const doc = state.find((item) => matchesCriteria(item, filter));
      if (!doc) {
        return { matchedCount: 0, modifiedCount: 0 };
      }
      if (update.$push?.versions) {
        doc.versions.push(clone(update.$push.versions));
      }
      if (update.$set) {
        Object.assign(doc, clone(update.$set));
      }
      doc.updatedAt = options.updatedAt ?? '2026-03-01T00:00:00.000Z';
      return { matchedCount: 1, modifiedCount: 1 };
    },
    find(criteria, optionsArg) {
      const { sort, skip = 0, limit = Number.MAX_SAFE_INTEGER } = optionsArg ?? {};
      calls.push({ method: 'find', criteria: clone(criteria), sort: clone(sort), skip, limit });
      let docs = state.filter((doc) => matchesCriteria(doc, criteria)).map(clone);
      if (sort) {
        const entries = Object.entries(sort);
        docs.sort((a, b) => {
          for (const [field, direction] of entries) {
            const comparison = compareValues(a[field], b[field]);
            if (comparison !== 0) {
              return direction >= 0 ? comparison : -comparison;
            }
          }
          return 0;
        });
      }
      return Promise.resolve(docs.slice(skip, skip + limit));
    },
    countDocuments(criteria) {
      calls.push({ method: 'countDocuments', criteria: clone(criteria) });
      return Promise.resolve(state.filter((doc) => matchesCriteria(doc, criteria)).length);
    },
  };
  return repository;
}

function makeUploader(events = [], result = {}) {
  const calls = [];
  const uploader = async (input) => {
    calls.push(clone(input));
    events.push('upload');
    return {
      publicId: `uploaded-${input.version}`,
      secureUrl: `https://cdn.example.com/uploaded-${input.version}.png`,
      width: 321,
      height: 654,
      format: 'png',
      bytes: 9876,
      ...result,
    };
  };
  uploader.calls = calls;
  return uploader;
}

test('asset categories include every current runtime family', () => {
  assert.deepEqual(Object.keys(ASSET_CATEGORIES).sort(), [
    'badgeSprite', 'cardTheme', 'general', 'seasonSprite', 'siteAsset',
    'teamColorIcon', 'upgradeBadge', 'upgradeBase', 'upgradeEffect', 'upgradeMascot',
  ]);
});

test('asset category folders match the migration contract', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(ASSET_CATEGORIES).map(([category, rule]) => [category, rule.folder])),
    {
      cardTheme: 'card-themes',
      upgradeBadge: 'upgrade-badges',
      upgradeMascot: 'upgrade-mascots',
      upgradeBase: 'upgrade-bases',
      upgradeEffect: 'upgrade-effects',
      seasonSprite: 'season-sprites',
      badgeSprite: 'badge-sprites',
      siteAsset: 'site-assets',
      teamColorIcon: 'team-color-icons',
      general: 'general',
    }
  );
});

test('normalizeAssetIdentity trims category and lowercases key', () => {
  assert.deepEqual(normalizeAssetIdentity(' general ', ' Hero-Banner '), {
    category: 'general',
    key: 'hero-banner',
  });
});

test('normalizeAssetIdentity validates category-specific keys', () => {
  const valid = [
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
    ['siteAsset', 'icons'],
    ['siteAsset', 'favicon'],
    ['teamColorIcon', 'club'],
    ['teamColorIcon', 'grade'],
    ['teamColorIcon', 'relation'],
    ['general', 'legal-notice-2026'],
  ];

  for (const [category, key] of valid) {
    assert.deepEqual(normalizeAssetIdentity(category, key), { category, key });
  }
});

test('normalizeAssetIdentity rejects unknown category and invalid keys with status 400', () => {
  const invalid = [
    ['unknown', 'key'],
    ['upgradeBadge', '14'],
    ['upgradeMascot', 'angry'],
    ['upgradeBase', 'alternate'],
    ['upgradeEffect', 'sparkle'],
    ['seasonSprite', 'other'],
    ['badgeSprite', 'fc_online'],
    ['siteAsset', 'logo'],
    ['teamColorIcon', 'league'],
    ['general', 'bad slug'],
  ];

  for (const [category, key] of invalid) {
    assert.throws(
      () => normalizeAssetIdentity(category, key),
      (error) => error.message === 'Invalid asset category or key' && error.statusCode === 400
    );
  }
});

test('createAssetUpload uploads before DB create and creates version 1', async () => {
  const events = [];
  const repository = makeRepository([], { now: '2026-04-01T00:00:00.000Z' });
  const originalCreate = repository.create;
  repository.create = async (doc) => {
    events.push('create');
    return originalCreate.call(repository, doc);
  };
  const uploader = makeUploader(events);

  const result = await createAssetUpload(
    { category: ' general ', key: ' Hero ', label: 'Hero', sourcePath: '/hero.png', uploadedBy: 'admin-1', source: 'admin' },
    { repository, uploader }
  );

  assert.deepEqual(events, ['upload', 'create']);
  assert.equal(uploader.calls[0].version, 1);
  assert.equal(repository.state[0].activeVersion, 1);
  assert.equal(repository.state[0].versions[0].version, 1);
  assert.equal(repository.state[0].versions[0].cloudinaryPublicId, 'uploaded-1');
  assert.equal(result.activeVersion, 1);
});

test('createAssetUpload translates duplicate key races to 409', async () => {
  const duplicate = new Error('duplicate');
  duplicate.code = 11000;
  const repository = makeRepository([], { createError: duplicate });
  await assert.rejects(
    createAssetUpload({ category: 'general', key: 'hero' }, { repository, uploader: makeUploader() }),
    (error) => error.statusCode === 409
  );
});

test('replaceAssetUpload computes next version from max versions and uses CAS update', async () => {
  const existing = asset({ activeVersion: 1, versions: [version(1), version(3)] });
  const repository = makeRepository([existing]);
  const uploader = makeUploader();

  const result = await replaceAssetUpload({ category: 'general', key: 'hero', label: 'New Hero' }, { repository, uploader });
  const updateCall = repository.calls.find((call) => call.method === 'updateOne');

  assert.equal(uploader.calls[0].version, 4);
  assert.deepEqual(updateCall.filter, { _id: 'asset-1', updatedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(updateCall.update.$push.versions.version, 4);
  assert.equal(updateCall.update.$set.activeVersion, 4);
  assert.equal(result.activeVersion, 4);
});

test('replaceAssetUpload uploads before DB mutation and failed DB write leaves original unchanged', async () => {
  const events = [];
  const existing = asset({ activeVersion: 1, versions: [version(1)] });
  const repository = makeRepository([existing], { updateError: new Error('write failed') });
  const originalUpdate = repository.updateOne;
  repository.updateOne = async (...args) => {
    events.push('update');
    return originalUpdate.apply(repository, args);
  };
  const uploader = makeUploader(events);

  await assert.rejects(replaceAssetUpload({ category: 'general', key: 'hero' }, { repository, uploader }), /write failed/);

  assert.deepEqual(events, ['upload', 'update']);
  assert.deepEqual(repository.state[0], existing);
});

test('replaceAssetUpload CAS conflict returns 409 with orphan public id', async () => {
  const repository = makeRepository([asset()], { matchedCount: 0 });
  await assert.rejects(
    replaceAssetUpload({ category: 'general', key: 'hero' }, { repository, uploader: makeUploader() }),
    (error) => error.statusCode === 409 && error.orphanPublicId === 'uploaded-2'
  );
});

test('replaceAssetUpload translates duplicate key write races to 409', async () => {
  const duplicate = new Error('duplicate');
  duplicate.code = 11000;
  const repository = makeRepository([asset()], { updateError: duplicate });
  await assert.rejects(
    replaceAssetUpload({ category: 'general', key: 'hero' }, { repository, uploader: makeUploader() }),
    (error) => error.statusCode === 409
  );
});

test('rollbackAssetVersion changes only activeVersion', async () => {
  const repository = makeRepository([asset({ activeVersion: 2, versions: [version(1), version(2)] })]);
  await rollbackAssetVersion({ category: 'general', key: 'hero', version: 1 }, { repository });
  const updateCall = repository.calls.find((call) => call.method === 'updateOne');

  assert.deepEqual(updateCall.update, { $set: { activeVersion: 1 } });
  assert.equal(repository.state[0].activeVersion, 1);
  assert.equal(repository.state[0].versions.length, 2);
});

test('rollbackAssetVersion to a missing version returns 400', async () => {
  const repository = makeRepository([asset({ versions: [version(1)] })]);
  await assert.rejects(
    rollbackAssetVersion({ category: 'general', key: 'hero', version: 99 }, { repository }),
    (error) => error.statusCode === 400
  );
});

test('archiveAsset changes only status and does not call uploader or delete resources', async () => {
  const repository = makeRepository([asset()]);
  await archiveAsset({ category: 'general', key: 'hero' }, { repository });
  const updateCall = repository.calls.find((call) => call.method === 'updateOne');

  assert.deepEqual(updateCall.update, { $set: { status: 'archived' } });
  assert.equal(repository.state[0].status, 'archived');
  assert.equal(repository.state[0].versions.length, 1);
});

test('listAssets supports filters, pagination, search, and required summary fields', async () => {
  const repository = makeRepository([
    asset({ _id: '1', key: 'alpha', label: 'Alpha Hero', status: 'active', updatedAt: '2026-01-02T00:00:00.000Z' }),
    asset({ _id: '2', key: 'beta', label: 'Beta Hero', status: 'active', updatedAt: '2026-01-03T00:00:00.000Z' }),
    asset({ _id: '3', key: 'gamma', label: 'Gamma', status: 'archived', updatedAt: '2026-01-04T00:00:00.000Z' }),
  ]);

  const result = await listAssets({ category: 'general', status: 'active', search: 'hero', page: 2, limit: 1 }, { repository });
  const findCall = repository.calls.find((call) => call.method === 'find');

  assert.deepEqual(findCall.sort, { updatedAt: -1, _id: 1 });
  assert.deepEqual(result.data.map((item) => item.key), ['alpha']);
  assert.deepEqual(result.pagination, { page: 2, limit: 1, total: 2, pages: 2 });
  assert.equal(result.data[0].sourcePath, '/local/hero.png');
  assert.equal(result.data[0].versionCount, 1);
  assert.equal(result.data[0].active.secureUrl, 'https://cdn.example.com/v1.png');
});

test('listAssets defaults to page 1, limit 24, and caps limit at 100', async () => {
  const repository = makeRepository([asset()]);

  await listAssets({}, { repository });
  await listAssets({ limit: 500 }, { repository });

  const findCalls = repository.calls.filter((call) => call.method === 'find');
  assert.equal(findCalls[0].skip, 0);
  assert.equal(findCalls[0].limit, 24);
  assert.equal(findCalls[1].limit, 100);
});

test('getAssetDetail returns version history as plain objects', async () => {
  const repository = makeRepository([asset({ versions: [version(2), version(1)], activeVersion: 2 })]);
  const detail = await getAssetDetail({ category: 'general', key: 'hero' }, { repository });

  assert.deepEqual(detail.versions.map((item) => item.version), [1, 2]);
  assert.equal(detail.versions[0].cloudinaryPublicId, 'pid-v1');
  assert.equal(detail.versions[1].uploadedBy, 'user-2');
});

test('getPublicAssetMap includes only active records with active secure URL and sorts by category/key', async () => {
  const repository = makeRepository([
    asset({ _id: '2', category: 'general', key: 'zeta', updatedAt: '2026-01-02T00:00:00.000Z' }),
    asset({ _id: '1', category: 'cardTheme', key: 'ng', updatedAt: '2026-01-03T00:00:00.000Z' }),
    asset({ _id: '3', category: 'general', key: 'archived', status: 'archived' }),
    asset({ _id: '4', category: 'general', key: 'missing-url', versions: [version(1, { secureUrl: '' })] }),
  ]);

  const result = await getPublicAssetMap({}, { repository });

  assert.deepEqual(Object.keys(result.data), ['cardTheme', 'general']);
  assert.deepEqual(Object.keys(result.data.cardTheme), ['ng']);
  assert.deepEqual(Object.keys(result.data.general), ['zeta']);
  assert.equal(result.updatedAt, '2026-01-03T00:00:00.000Z');
});

test('getPublicAssetMap does not expose sourcePath, publicId, version, or uploadedBy', async () => {
  const repository = makeRepository([asset()]);
  const result = await getPublicAssetMap({}, { repository });
  const publicEntry = result.data.general.hero;

  assert.equal(publicEntry.url, 'https://cdn.example.com/v1.png');
  assert.equal('sourcePath' in publicEntry, false);
  assert.equal('publicId' in publicEntry, false);
  assert.equal('cloudinaryPublicId' in publicEntry, false);
  assert.equal('version' in publicEntry, false);
  assert.equal('uploadedBy' in publicEntry, false);
});

test('getPublicAssetMap executes Mongoose-style find queries', async () => {
  const calls = [];
  const docs = [asset()];
  const query = {
    sort(sort) {
      calls.push(['sort', sort]);
      return this;
    },
    skip(skip) {
      calls.push(['skip', skip]);
      return this;
    },
    limit(limit) {
      calls.push(['limit', limit]);
      return this;
    },
    lean() {
      calls.push(['lean']);
      return this;
    },
    exec() {
      calls.push(['exec']);
      return Promise.resolve(docs.map(clone));
    },
  };
  const repository = {
    find(criteria, projection, options) {
      calls.push(['find', criteria, projection, options]);
      return query;
    },
  };

  const result = await getPublicAssetMap({}, { repository });

  assert.equal(result.data.general.hero.url, 'https://cdn.example.com/v1.png');
  assert.deepEqual(calls, [
    ['find', { status: 'active' }, undefined, undefined],
    ['sort', { category: 1, key: 1 }],
    ['skip', 0],
    ['limit', Number.MAX_SAFE_INTEGER],
    ['lean'],
    ['exec'],
  ]);
});
