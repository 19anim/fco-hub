import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTeamColorPayload,
  hashTeamColorPayload,
  mapSlotsToPlayers,
  buildCatalogUpsertFromResponseItem,
  buildObservationFromResponseItem,
  iterateTeamColorResponseItems,
  persistTeamColorObservations,
} from './teamColorEvaluation.js';

test('validateTeamColorPayload rejects payloads without players', () => {
  const result = validateTeamColorPayload({ players: [], selection: {} });
  assert.equal(result.valid, false);
  assert.match(result.error, /players/i);
});

test('validateTeamColorPayload rejects a player missing slot_id or uid', () => {
  const result = validateTeamColorPayload({
    players: [{ slot_id: 'player-1', year: '844' }],
    selection: {},
  });
  assert.equal(result.valid, false);
});

test('validateTeamColorPayload accepts a well-formed payload', () => {
  const result = validateTeamColorPayload({
    players: [{ slot_id: 'player-1', uid: 'abc', year: '844', reinforceLevel: 8, bonusLevel: 0, previewRoles: ['ST'], role: 'ST' }],
    selection: { group_one_tcid: '0', squad_level: 1 },
  });
  assert.equal(result.valid, true);
});

test('hashTeamColorPayload is stable across key order', () => {
  const a = hashTeamColorPayload({ players: [{ slot_id: 'p1', uid: 'x' }], selection: { squad_level: 1 } });
  const b = hashTeamColorPayload({ selection: { squad_level: 1 }, players: [{ uid: 'x', slot_id: 'p1' }] });
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test('hashTeamColorPayload differs when players differ', () => {
  const a = hashTeamColorPayload({ players: [{ slot_id: 'p1', uid: 'x' }], selection: {} });
  const b = hashTeamColorPayload({ players: [{ slot_id: 'p1', uid: 'y' }], selection: {} });
  assert.notEqual(a, b);
});

test('mapSlotsToPlayers maps slot ids back to payload player identity', () => {
  const payloadPlayers = [
    { slot_id: 'player-1', uid: 'kjvnqjvpb', uic: 'qnlxrb' },
    { slot_id: 'player-2', uid: 'dydmdwqzl', uic: 'gljbaa' },
  ];
  const result = mapSlotsToPlayers(['player-1', 'player-2', 'player-missing'], payloadPlayers);
  assert.deepEqual(result, [
    { slotId: 'player-1', uid: 'kjvnqjvpb', uic: 'qnlxrb' },
    { slotId: 'player-2', uid: 'dydmdwqzl', uic: 'gljbaa' },
  ]);
});

test('buildCatalogUpsertFromResponseItem builds club category with observed players by uic', () => {
  const item = {
    tcid: 'tcRX2CB4608558',
    name_vn: 'Manchester United',
    name_en: 'Manchester United',
    name_th: 'Manchester United',
    name_kr: '맨체스터 유나이티드',
    name_cn: '曼联',
    image: '',
    ref_id: '11',
    ref_type: 'team',
    type: 2,
    level: 4,
    required: 11,
    matched_slots: ['player-1', 'player-2'],
    qualified_slots: ['player-1', 'player-2'],
    rewards: { ovr: 4, 'Long Shots': 3 },
  };
  const payloadPlayers = [
    { slot_id: 'player-1', uid: 'kjvnqjvpb', uic: 'qnlxrb' },
    { slot_id: 'player-2', uid: 'dydmdwqzl', uic: 'gljbaa' },
  ];
  const result = buildCatalogUpsertFromResponseItem(item, 'club', payloadPlayers);
  assert.equal(result.tcid, 'tcRX2CB4608558');
  assert.equal(result.category, 'club');
  assert.equal(result.refType, 'team');
  assert.equal(result.refId, '11');
  assert.equal(result.names.vn, 'Manchester United');
  assert.deepEqual(result.levels, [{ level: 4, required: 11, rewards: { ovr: 4, 'Long Shots': 3 } }]);
  assert.deepEqual(result.observedPlayerUics.sort(), ['gljbaa', 'qnlxrb']);
});

test('buildCatalogUpsertFromResponseItem stores no observed players for grade category', () => {
  const item = {
    tcid: 'tc7PT19E81DE15F',
    name_vn: 'Team color vàng',
    ref_id: '',
    ref_type: 'grade',
    type: 5,
    level: 2,
    required: 8,
    matched_slots: ['player-1'],
    qualified_slots: ['player-1'],
    rewards: { ovr: 4 },
  };
  const result = buildCatalogUpsertFromResponseItem(item, 'grade', [{ slot_id: 'player-1', uid: 'a', uic: 'b' }]);
  assert.deepEqual(result.observedPlayerUics, []);
});

test('buildObservationFromResponseItem maps matched and qualified slots to payload players', () => {
  const item = {
    tcid: 'tcUVNCEB904315F',
    matched_slots: ['player-7'],
    qualified_slots: ['player-7', 'player-9'],
  };
  const payloadPlayers = [
    { slot_id: 'player-7', uid: 'vzgdqlyw', uic: 'yxlwm' },
    { slot_id: 'player-9', uid: 'zzqqpoay', uic: 'ednazn' },
  ];
  const observation = buildObservationFromResponseItem(item, 'relation', 'hash123', payloadPlayers);
  assert.equal(observation.payloadHash, 'hash123');
  assert.equal(observation.tcid, 'tcUVNCEB904315F');
  assert.equal(observation.category, 'relation');
  assert.deepEqual(observation.matchedPlayers, [{ slotId: 'player-7', uid: 'vzgdqlyw', uic: 'yxlwm' }]);
  assert.equal(observation.qualifiedPlayers.length, 2);
});

test('iterateTeamColorResponseItems flattens active groups across club, grade, relation', () => {
  const response = {
    groups: {
      club: { active: [{ tcid: 'a' }], candidates: [{ tcid: 'ignored' }] },
      grade: { active: [{ tcid: 'b' }], candidates: [] },
      relation: { active: [], candidates: [] },
    },
  };
  const result = iterateTeamColorResponseItems(response);
  assert.deepEqual(result, [
    { item: { tcid: 'a' }, category: 'club' },
    { item: { tcid: 'b' }, category: 'grade' },
  ]);
});

function createFakeCatalogModel() {
  const docs = new Map();
  return {
    docs,
    findOne(filter) {
      const key = filter.tcid;
      return { lean: async () => docs.get(key) || null };
    },
    async findOneAndUpdate(filter, update) {
      const key = filter.tcid;
      const existing = docs.get(key) || { tcid: key, observedPlayers: [], observationCount: 0 };
      const merged = {
        ...existing,
        ...update.$set,
        observationCount: existing.observationCount + 1,
      };
      docs.set(key, merged);
      return merged;
    },
  };
}

function createFakeObservationModel() {
  const created = [];
  return { created, async create(doc) { created.push(doc); return doc; } };
}

test('persistTeamColorObservations upserts catalog entries and creates observations for active groups only', async () => {
  const fifaAddictResponse = {
    groups: {
      club: {
        active: [{
          tcid: 'tc1', name_vn: 'MU', ref_id: '11', ref_type: 'team', type: 2, level: 4, required: 11,
          matched_slots: ['player-1'], qualified_slots: ['player-1'], rewards: { ovr: 4 },
        }],
        candidates: [{ tcid: 'ignored-candidate' }],
      },
      grade: { active: [], candidates: [] },
      relation: { active: [], candidates: [] },
    },
  };
  const payload = { players: [{ slot_id: 'player-1', uid: 'kjvnqjvpb', uic: 'qnlxrb' }] };
  const catalogModel = createFakeCatalogModel();
  const observationModel = createFakeObservationModel();

  const result = await persistTeamColorObservations(fifaAddictResponse, payload, 'hash1', {
    catalogModel,
    observationModel,
  });

  assert.equal(result.catalogUpserts, 1);
  assert.equal(result.observationsCreated, 1);
  assert.equal(catalogModel.docs.get('tc1').observationCount, 1);
  assert.equal(observationModel.created[0].tcid, 'tc1');
  assert.equal(observationModel.created[0].payloadHash, 'hash1');
});
