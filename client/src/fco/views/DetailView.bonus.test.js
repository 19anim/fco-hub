import { describe, expect, it } from 'vitest';
import { applyDetailBonuses, getDetailBonusModel } from './detailBonus.js';

describe('detail bonus math', () => {
  it('uses the same grade formula for component stats and OVR', () => {
    const bonuses = getDetailBonusModel({ grade: 8, level: 1, teamColorBonus: 0 });

    expect(bonuses.gradeOvrBonus).toBe(15);
    expect(bonuses.gradeStatBonus).toBe(15);
    expect(bonuses.statBonus).toBe(15);
    expect(bonuses.flatBonus).toBe(0);
    expect(bonuses.ovrBonus).toBe(15);
  });

  it('adds level as level minus one and bonus as flat points', () => {
    const bonuses = getDetailBonusModel({ grade: 1, level: 5, teamColorBonus: 10 });

    expect(bonuses.gradeStatBonus).toBe(0);
    expect(bonuses.levelStatBonus).toBe(4);
    expect(bonuses.bonusStatBonus).toBe(10);
    expect(bonuses.flatBonus).toBe(14);
    expect(bonuses.statBonus).toBe(14);
    expect(bonuses.ovrBonus).toBe(14);
  });

  it('applies the base +3 correction to OVR, main stats, and detailed component stats', () => {
    const player = {
      ovr: 100,
      pace: 90,
      detailed: {
        pace: [{ label: 'Tăng tốc', value: 91 }],
        gk: { diving: 70 },
      },
    };

    const result = applyDetailBonuses(
      player,
      getDetailBonusModel({ grade: 1, level: 1, teamColorBonus: 0 })
    );

    expect(result.ovr).toBe(103);
    expect(result.pace).toBe(93);
    expect(result.detailed).toEqual({
      pace: [{ label: 'Tăng tốc', value: 94 }],
      gk: { diving: 73 },
    });
  });

  it('applies combined bonuses to player stats, positions, and detailed stats', () => {
    const player = {
      ovr: 100,
      pace: 90,
      shooting: 80,
      passing: 70,
      dribbling: 60,
      defending: 50,
      physical: 40,
      positionRatings: [
        { label: 'ST', value: 101, recommended: true },
        { label: 'CF', value: 99, recommended: false },
      ],
      detailed: {
        acceleration: 91,
        finishing: 82,
      },
    };

    const result = applyDetailBonuses(
      player,
      getDetailBonusModel({ grade: 1, level: 5, teamColorBonus: 10 })
    );

    expect(result.ovr).toBe(117);
    expect(result.pace).toBe(107);
    expect(result.shooting).toBe(97);
    expect(result.positionRatings).toEqual([
      { label: 'ST', value: 118, recommended: true },
      { label: 'CF', value: 116, recommended: false },
    ]);
    expect(result.detailed).toEqual({
      acceleration: 108,
      finishing: 99,
    });
  });
});
