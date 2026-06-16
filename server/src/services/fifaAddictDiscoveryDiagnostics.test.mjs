import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDiscoveryName,
  groupUniqueNexonPlayers,
  buildSearchVariants,
  classifyDiscoveryStop,
} from './fifaAddictDiscoveryDiagnostics.js';

test('normalizeDiscoveryName trims and collapses whitespace', () => {
  assert.equal(normalizeDiscoveryName('  Cristiano   Ronaldo  '), 'Cristiano Ronaldo');
});

test('groupUniqueNexonPlayers groups by pid and keeps names/spids/seasons', () => {
  const rows = [
    { pid: 123, spid: 801000123, seasonId: 801, name: 'A', searchName: 'A' },
    { pid: 123, spid: 802000123, seasonId: 802, name: 'A Alt', searchName: 'A' },
    { pid: 0, spid: 999000777, seasonId: 999, name: 'No PID', searchName: '' },
  ];

  const groups = groupUniqueNexonPlayers(rows);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], {
    key: 'pid:123',
    pid: 123,
    names: ['A', 'A Alt'],
    spids: [801000123, 802000123],
    seasonIds: [801, 802],
  });
  assert.equal(groups[1].key, 'name:no pid');
});

test('buildSearchVariants returns deduped name variants', () => {
  const variants = buildSearchVariants({ names: ['Ronaldo Luís Nazário de Lima', 'Ronaldo'] }, 4);
  assert.deepEqual(variants, ['Ronaldo Luís Nazário de Lima', 'Lima', 'Ronaldo']);
});

test('classifyDiscoveryStop reports queue exhausted before cap reached', () => {
  assert.equal(classifyDiscoveryStop({ queueLength: 0, processed: 1566, maxVisits: 30000 }), 'queue-exhausted');
});

test('classifyDiscoveryStop reports max visits reached when queue remains', () => {
  assert.equal(classifyDiscoveryStop({ queueLength: 10, processed: 30000, maxVisits: 30000 }), 'max-visits-reached');
});
