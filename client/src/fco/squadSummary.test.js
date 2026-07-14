import { describe, expect, it } from 'vitest';
import { getLineAverages, getSlotDisplayOvr } from './squadSummary.js';

const PLAYER = { spid: 1, name: 'Kane', season: '866', ovr: 126, upgradeLevel: 5 };

describe('getLineAverages', () => {
  it('uses live slot OVR bonuses when provided', () => {
    const perPlayerBonuses = new Map([[String(PLAYER.spid), { totalBonus: 3 }]]);
    const liveOvrBonusBySlot = new Map([['st', 4]]);

    const result = getLineAverages(
      [{ id: 'st', pos: 'ST' }],
      { st: PLAYER },
      perPlayerBonuses,
      liveOvrBonusBySlot
    );

    expect(result.FWD).toBe(136);
    expect(result.overall).toBe(136);
  });

  it('matches the Kane +5 case when live grade team color adds one OVR', () => {
    const kane = { spid: 2, name: 'Kane', season: '866', ovr: 123, upgradeLevel: 5 };
    const localBonusesWithoutBronze = new Map([[String(kane.spid), { totalBonus: 0 }]]);
    const liveOvrBonusBySlot = new Map([['st', 1]]);

    expect(getSlotDisplayOvr({ id: 'st', pos: 'ST' }, kane, localBonusesWithoutBronze, liveOvrBonusBySlot)).toBe(130);
  });
});
