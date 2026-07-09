import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMigrationArgs, runMigration } from './migrateCloudinaryAssets.js';

const RECORDS = Object.freeze([
  {
    absolutePath: '/tmp/upgrade.png',
    sourcePath: '/upgrade.png',
    category: 'upgradeBase',
    key: 'default',
    label: 'Upgrade base image',
  },
  {
    absolutePath: '/tmp/card-theme-865.png',
    sourcePath: '/fco/card-themes/card-theme-865.png',
    category: 'cardTheme',
    key: '865',
    label: 'Card theme 865',
  },
]);

function createRepository(existing = []) {
  const calls = [];
  return {
    calls,
    find(criteria) {
      calls.push({ method: 'find', criteria });
      return {
        lean() {
          calls.push({ method: 'lean' });
          return existing;
        },
      };
    },
    create() {
      calls.push({ method: 'create' });
      throw new Error('create should not be called');
    },
    updateOne() {
      calls.push({ method: 'updateOne' });
      throw new Error('updateOne should not be called');
    },
  };
}

function createDeps({ existing = [], env = {}, discover = async () => [...RECORDS] } = {}) {
  const calls = [];
  const repository = createRepository(existing);
  return {
    env,
    repository,
    calls,
    deps: {
      discover,
      repository,
      connect: async (uri) => calls.push({ method: 'connect', uri }),
      disconnect: async () => calls.push({ method: 'disconnect' }),
      configureCloudinary: () => calls.push({ method: 'configureCloudinary' }),
      cloudinarySdk: { uploader: { upload: () => calls.push({ method: 'cloudinaryUpload' }) } },
      uploader: async () => {
        calls.push({ method: 'uploader' });
        throw new Error('uploader should not be called');
      },
      service: {
        createAssetUpload: async () => {
          calls.push({ method: 'createAssetUpload' });
          throw new Error('createAssetUpload should not be called');
        },
        replaceAssetUpload: async () => {
          calls.push({ method: 'replaceAssetUpload' });
          throw new Error('replaceAssetUpload should not be called');
        },
      },
      logger: { error: (message) => calls.push({ method: 'logError', message }) },
    },
  };
}

function methods(calls) {
  return calls.map((call) => call.method);
}

test('parseMigrationArgs accepts only required mode combinations', () => {
  assert.deepEqual(parseMigrationArgs(['--dry-run']), { mode: 'dry-run', replace: false, reportPath: null });
  assert.deepEqual(parseMigrationArgs(['--upload', '--replace', '--report', 'out.json']), { mode: 'upload', replace: true, reportPath: 'out.json' });

  assert.throws(() => parseMigrationArgs([]), /Choose exactly one mode/);
  assert.throws(() => parseMigrationArgs(['--dry-run', '--upload']), /Choose exactly one mode/);
  assert.throws(() => parseMigrationArgs(['--dry-run', '--replace']), /--replace requires --upload/);
  assert.throws(() => parseMigrationArgs(['--dry-run', '--wat']), /Unknown flag/);
  assert.throws(() => parseMigrationArgs(['--dry-run', '--report']), /--report requires a path/);
});

test('dry-run without MongoDB never configures Cloudinary, uploads, or mutates records', async () => {
  const { deps, calls, repository, env } = createDeps();

  const report = await runMigration({ parsedArgs: parseMigrationArgs(['--dry-run']), env }, deps);

  assert.equal(report.mode, 'dry-run');
  assert.equal(report.existingStatus, 'not-checked');
  assert.equal(report.discovered, 2);
  assert.equal(report.classified, 2);
  assert.deepEqual(report.byCategory, { upgradeBase: 1, cardTheme: 1 });
  assert.equal(report.planned.uploads.length, 2);
  assert.equal(report.planned.skips.length, 0);
  assert.equal(report.planned.replacements.length, 0);
  assert.deepEqual(methods(calls), []);
  assert.deepEqual(repository.calls, []);
});

test('dry-run reports unresolved discovered files without planning writes', async () => {
  const { deps, env } = createDeps({
    discover: async () => [
      ...RECORDS,
      { absolutePath: '/tmp/unknown.png', sourcePath: '/unknown.png', status: 'unresolved', reason: 'No classification rule matched' },
    ],
  });

  const report = await runMigration({ parsedArgs: parseMigrationArgs(['--dry-run']), env }, deps);

  assert.equal(report.discovered, 3);
  assert.equal(report.classified, 2);
  assert.deepEqual(report.unresolved, [
    { sourcePath: '/unknown.png', reason: 'No classification rule matched' },
  ]);
  assert.equal(report.planned.uploads.length, 2);
});

test('dry-run with MongoDB checks existing records using read-only repository methods', async () => {
  const existing = [{
    _id: 'asset-1',
    category: 'upgradeBase',
    key: 'default',
    activeVersion: 2,
    versions: [{ version: 2, secureUrl: 'https://cdn.example/upgrade.png' }],
  }];
  const { deps, calls, repository } = createDeps({ existing, env: { MONGODB_URI: 'mongodb://localhost/fco' } });

  const report = await runMigration({ parsedArgs: parseMigrationArgs(['--dry-run']), env: { MONGODB_URI: 'mongodb://localhost/fco' } }, deps);

  assert.equal(report.existingStatus, 'checked');
  assert.deepEqual(methods(calls), ['connect', 'disconnect']);
  assert.deepEqual(repository.calls.map((call) => call.method), ['find', 'lean']);
  assert.equal(report.planned.uploads.length, 1);
  assert.equal(report.planned.skips.length, 1);
  assert.equal(report.counts.skipped, 1);
  assert.deepEqual(report.mappings, [{
    sourcePath: '/upgrade.png',
    category: 'upgradeBase',
    key: 'default',
    secureUrl: 'https://cdn.example/upgrade.png',
  }]);
});

test('upload requires MongoDB and Cloudinary config before discovering files', async () => {
  let discovered = false;
  const { deps } = createDeps({ discover: async () => { discovered = true; return []; } });

  await assert.rejects(
    () => runMigration({ parsedArgs: parseMigrationArgs(['--upload']), env: {} }, deps),
    /Upload requires MONGODB_URI or MONGO_URI/
  );
  assert.equal(discovered, false);
});

test('upload skips existing records unless replace is requested', async () => {
  const existing = [{
    _id: 'asset-1',
    category: 'upgradeBase',
    key: 'default',
    activeVersion: 1,
    versions: [{ version: 1, secureUrl: 'https://cdn.example/existing.png' }],
  }];
  const { deps, calls } = createDeps({ existing, env: { MONGODB_URI: 'mongodb://localhost/fco', CLOUDINARY_URL: 'cloudinary://key:secret@cloud' } });
  deps.service.createAssetUpload = async (input) => {
    calls.push({ method: 'createAssetUpload', input });
    return {
      _id: 'asset-2',
      category: input.category,
      key: input.key,
      activeVersion: 1,
      versions: [{ version: 1, secureUrl: 'https://cdn.example/new.png' }],
    };
  };

  const report = await runMigration({ parsedArgs: parseMigrationArgs(['--upload']), env: { MONGODB_URI: 'mongodb://localhost/fco', CLOUDINARY_URL: 'cloudinary://key:secret@cloud' } }, deps);

  assert.equal(methods(calls).includes('configureCloudinary'), true);
  assert.equal(methods(calls).filter((method) => method === 'createAssetUpload').length, 1);
  assert.equal(methods(calls).includes('replaceAssetUpload'), false);
  assert.equal(report.counts.uploaded, 1);
  assert.equal(report.counts.skipped, 1);
  assert.equal(report.changed.recordIds[0], 'asset-2');
});

test('upload replace continues after per-file errors and logs safe failures only', async () => {
  const existing = RECORDS.map((record, index) => ({
    _id: `asset-${index + 1}`,
    category: record.category,
    key: record.key,
    activeVersion: 1,
    versions: [{ version: 1, secureUrl: `https://cdn.example/${index}.png` }],
  }));
  const { deps, calls } = createDeps({ existing, env: { MONGODB_URI: 'mongodb://localhost/fco', CLOUDINARY_URL: 'cloudinary://key:secret@cloud' } });
  deps.service.replaceAssetUpload = async (input) => {
    calls.push({ method: 'replaceAssetUpload', input });
    if (input.sourcePath === '/upgrade.png') {
      throw new Error('boom https://api.example/upload?api_key=secret&signature=abc');
    }
    return {
      _id: 'asset-2',
      category: input.category,
      key: input.key,
      activeVersion: 2,
      versions: [{ version: 2, secureUrl: 'https://cdn.example/replaced.png' }],
    };
  };

  const report = await runMigration({ parsedArgs: parseMigrationArgs(['--upload', '--replace']), env: { MONGODB_URI: 'mongodb://localhost/fco', CLOUDINARY_URL: 'cloudinary://key:secret@cloud' } }, deps);

  assert.equal(methods(calls).filter((method) => method === 'replaceAssetUpload').length, 2);
  assert.equal(report.counts.replaced, 1);
  assert.equal(report.counts.failed, 1);
  assert.deepEqual(report.failures, [{ sourcePath: '/upgrade.png', message: 'boom [REDACTED_URL]' }]);
  const log = calls.find((call) => call.method === 'logError')?.message ?? '';
  assert.equal(log.includes('/upgrade.png'), true);
  assert.equal(log.includes('api_key=secret'), false);
  assert.deepEqual(report.changed.activeVersions, [{ id: 'asset-2', activeVersion: 2 }]);
});
