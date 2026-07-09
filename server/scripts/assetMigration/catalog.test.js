import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverAssetCatalog } from './catalog.js';

async function withTempPublicTree(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'asset-catalog-'));
  const publicRoot = path.join(root, 'client', 'public');
  await mkdir(publicRoot, { recursive: true });

  try {
    await fn(publicRoot, root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function touch(publicRoot, sourcePath) {
  const relativePath = sourcePath.replace(/^\//, '').split('/').join(path.sep);
  const absolutePath = path.join(publicRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, 'asset');
  return absolutePath;
}

test('discovers only included runtime assets with supported extensions', async () => {
  await withTempPublicTree(async (publicRoot) => {
    await touch(publicRoot, '/fco/card-themes/card-theme-865.PNG');
    await touch(publicRoot, '/fco/card-themes/card-theme-ng.svg');
    await touch(publicRoot, '/upgrade-badges/grade_0.png');
    await touch(publicRoot, '/upgrade-badges/grade_13.WEBP');
    await touch(publicRoot, '/upgrade-effects/shatter_sprite.webp');
    await touch(publicRoot, '/fco/teamcolor-icons/strip/club.png');
    await touch(publicRoot, '/fco/teamcolor-icons/strip/grade.png');
    await touch(publicRoot, '/fco/teamcolor-icons/strip/relation.png');
    await touch(publicRoot, '/upgrade-happy.png');
    await touch(publicRoot, '/upgrade-sad.png');
    await touch(publicRoot, '/upgrade.png');
    await touch(publicRoot, '/fifaaddict-season-sprite.png');
    await touch(publicRoot, '/fc_online_badges_css_sprite.png');
    await touch(publicRoot, '/icons.svg');
    await touch(publicRoot, '/favicon.svg');

    await touch(publicRoot, '/fco/card-themes/card-theme-999.txt');
    await touch(publicRoot, '/fco/teamcolor-icons/source/club.png');
    await touch(publicRoot, '/demo/card-theme-865.png');
    await touch(publicRoot, '/screenshots/card-theme-865.png');
    await touch(publicRoot, '/dist/upgrade.png');
    await touch(publicRoot, '/build/upgrade.png');
    await touch(publicRoot, '/node_modules/upgrade.png');
    await touch(publicRoot, '/.cache/upgrade.png');
    await touch(publicRoot, '/caches/upgrade.png');
    await touch(publicRoot, '/.claude/worktrees/agent/client/public/upgrade.png');
    await touch(publicRoot, '/.playwright-mcp/upgrade.png');

    const records = await discoverAssetCatalog({ publicRoot });

    assert.deepEqual(records.map((record) => record.sourcePath), [
      '/favicon.svg',
      '/fc_online_badges_css_sprite.png',
      '/fco/card-themes/card-theme-865.PNG',
      '/fco/card-themes/card-theme-ng.svg',
      '/fco/teamcolor-icons/strip/club.png',
      '/fco/teamcolor-icons/strip/grade.png',
      '/fco/teamcolor-icons/strip/relation.png',
      '/fifaaddict-season-sprite.png',
      '/icons.svg',
      '/upgrade-badges/grade_0.png',
      '/upgrade-badges/grade_13.WEBP',
      '/upgrade-effects/shatter_sprite.webp',
      '/upgrade-happy.png',
      '/upgrade-sad.png',
      '/upgrade.png',
    ]);

    for (const record of records) {
      assert.equal(path.isAbsolute(record.absolutePath), true);
      assert.equal(record.absolutePath.startsWith(publicRoot), true);
      assert.equal(record.sourcePath.includes('\\'), false);
      assert.equal(typeof record.category, 'string');
      assert.equal(typeof record.key, 'string');
      assert.equal(typeof record.label, 'string');
    }
  });
});

test('includes unresolved files from runtime folders for reporting', async () => {
  await withTempPublicTree(async (publicRoot) => {
    await touch(publicRoot, '/upgrade-effects/unknown-effect.png');

    const records = await discoverAssetCatalog({ publicRoot });

    assert.deepEqual(records, [{
      absolutePath: path.join(publicRoot, 'upgrade-effects', 'unknown-effect.png'),
      sourcePath: '/upgrade-effects/unknown-effect.png',
      status: 'unresolved',
      reason: 'No classification rule matched',
    }]);
  });
});

test('does not traverse outside the supplied client/public directory', async () => {
  await withTempPublicTree(async (publicRoot, root) => {
    await touch(publicRoot, '/upgrade.png');

    const outsidePublic = path.join(root, 'client', 'upgrade-happy.png');
    await mkdir(path.dirname(outsidePublic), { recursive: true });
    await writeFile(outsidePublic, 'outside');

    const records = await discoverAssetCatalog({ publicRoot });

    assert.deepEqual(records.map((record) => record.sourcePath), ['/upgrade.png']);
  });
});
