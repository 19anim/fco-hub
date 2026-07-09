import test from 'node:test';
import assert from 'node:assert/strict';
import { countDiscovered, createMigrationReport, finishMigrationReport, redactReport, safeErrorMessage, toJsonReport } from './report.js';

test('redacts sensitive keys recursively in report objects and JSON output', () => {
  const input = {
    safe: 'visible',
    apiKey: 'hidden',
    nested: {
      api_secret: 'hidden',
      Authorization: 'hidden',
      values: [
        { signature: 'hidden', sourcePath: '/upgrade.png' },
        { cloudinary_url: 'hidden' },
      ],
    },
  };

  assert.deepEqual(redactReport(input), {
    safe: 'visible',
    apiKey: '[REDACTED]',
    nested: {
      api_secret: '[REDACTED]',
      Authorization: '[REDACTED]',
      values: [
        { signature: '[REDACTED]', sourcePath: '/upgrade.png' },
        { cloudinary_url: '[REDACTED]' },
      ],
    },
  });

  const json = toJsonReport(input);
  assert.equal(json.includes('hidden'), false);
  assert.equal(json.includes('[REDACTED]'), true);
});

test('creates and finishes the required report envelope', () => {
  const report = createMigrationReport({ mode: 'dry-run', startedAt: '2026-07-07T00:00:00.000Z' });
  report.failures.push({ sourcePath: '/x.png', api_key: 'secret' });

  const finished = finishMigrationReport(report, '2026-07-07T00:01:00.000Z');

  assert.equal(finished.mode, 'dry-run');
  assert.equal(finished.startedAt, '2026-07-07T00:00:00.000Z');
  assert.equal(finished.finishedAt, '2026-07-07T00:01:00.000Z');
  assert.deepEqual(finished.planned, { uploads: [], skips: [], replacements: [] });
  assert.deepEqual(finished.counts, { uploaded: 0, skipped: 0, replaced: 0, failed: 0 });
  assert.deepEqual(finished.changed, { recordIds: [], activeVersions: [] });
  assert.equal(finished.failures[0].api_key, '[REDACTED]');
});

test('counts discovered, category totals, and unresolved entries', () => {
  const report = createMigrationReport({ mode: 'dry-run' });

  countDiscovered(report, [
    { sourcePath: '/upgrade.png', category: 'upgradeBase', key: 'default' },
    { sourcePath: '/unknown.png', status: 'unresolved', reason: 'No classification rule matched' },
  ]);

  assert.equal(report.discovered, 2);
  assert.equal(report.classified, 1);
  assert.deepEqual(report.byCategory, { upgradeBase: 1 });
  assert.deepEqual(report.unresolved, [
    { sourcePath: '/unknown.png', reason: 'No classification rule matched' },
  ]);
});

test('safeErrorMessage strips URL-shaped secrets', () => {
  assert.equal(
    safeErrorMessage(new Error('failed https://api_key:secret@example.test/path?signature=abc')),
    'failed [REDACTED_URL]'
  );
});
