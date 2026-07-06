import { describe, expect, it } from 'vitest';
import { buildTeamColorPayload, getTeamColorPayloadHash } from './teamColorLive.js';

const PLAYER_A = {
  spid: 1, name: 'Matheus Cunha', season: '844', ovr: 116, upgradeLevel: 8,
  primaryPos: 'CF', positions: ['CF', 'CAM'],
  _raw: { enrichment: { sourceUid: 'kjvnqjvpb', uic: 'qnlxrb' } },
};

describe('buildTeamColorPayload', () => {
  it('returns null when the squad has no filled slots', () => {
    expect(buildTeamColorPayload([{ id: 'gk', pos: 'GK' }], {}, {})).toBeNull();
  });

  it('builds one FIFAAddict-compatible player entry per filled slot', () => {
    const slots = [{ id: 'st', pos: 'ST' }];
    const bySlotId = { st: PLAYER_A };
    const payload = buildTeamColorPayload(slots, bySlotId, { squadLevel: 1 });
    expect(payload.players).toEqual([{
      slot_id: 'st',
      uid: 'kjvnqjvpb',
      uic: 'qnlxrb',
      year: '844',
      reinforceLevel: 8,
      bonusLevel: 0,
      previewRoles: ['CF', 'CAM'],
      role: 'ST',
    }]);
    expect(payload.selection).toEqual({ group_one_tcid: '0', squad_level: 1 });
  });

  it('omits uic when the player has none captured yet', () => {
    const noUicPlayer = { ...PLAYER_A, _raw: { enrichment: { sourceUid: 'kjvnqjvpb' } } };
    const payload = buildTeamColorPayload([{ id: 'st', pos: 'ST' }], { st: noUicPlayer }, {});
    expect(payload.players[0].uic).toBe('');
  });
});

describe('getTeamColorPayloadHash', () => {
  it('is stable for equivalent payloads', () => {
    const a = getTeamColorPayloadHash({ players: [{ slot_id: 'st', uid: 'x' }], selection: {} });
    const b = getTeamColorPayloadHash({ players: [{ slot_id: 'st', uid: 'x' }], selection: {} });
    expect(a).toBe(b);
  });

  it('differs when payload differs', () => {
    const a = getTeamColorPayloadHash({ players: [{ slot_id: 'st', uid: 'x' }], selection: {} });
    const b = getTeamColorPayloadHash({ players: [{ slot_id: 'st', uid: 'y' }], selection: {} });
    expect(a).not.toBe(b);
  });
});
