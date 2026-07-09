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

  it('leaves OVR and main stats unchanged but adds the grade-0 correction to detailed stats at default grade/level/bonus', () => {
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

    expect(result.ovr).toBe(100);
    expect(result.pace).toBe(90);
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

    expect(result.ovr).toBe(114);
    expect(result.pace).toBe(104);
    expect(result.shooting).toBe(94);
    expect(result.positionRatings).toEqual([
      { label: 'ST', value: 115, recommended: true },
      { label: 'CF', value: 113, recommended: false },
    ]);
    expect(result.detailed).toEqual({
      acceleration: 108,
      finishing: 99,
    });
  });

  it('bumps skillMoves by grade tier and caps at 6', () => {
    expect(getDetailBonusModel({ grade: 4, level: 1, teamColorBonus: 0 }).skillMovesBonus).toBe(0);
    expect(getDetailBonusModel({ grade: 5, level: 1, teamColorBonus: 0 }).skillMovesBonus).toBe(1);
    expect(getDetailBonusModel({ grade: 7, level: 1, teamColorBonus: 0 }).skillMovesBonus).toBe(1);
    expect(getDetailBonusModel({ grade: 8, level: 1, teamColorBonus: 0 }).skillMovesBonus).toBe(2);
    expect(getDetailBonusModel({ grade: 13, level: 1, teamColorBonus: 0 }).skillMovesBonus).toBe(2);

    const lowGrade = applyDetailBonuses(
      { skillMoves: 4 },
      getDetailBonusModel({ grade: 4, level: 1, teamColorBonus: 0 })
    );
    expect(lowGrade.skillMoves).toBe(4);

    const midGrade = applyDetailBonuses(
      { skillMoves: 4 },
      getDetailBonusModel({ grade: 5, level: 1, teamColorBonus: 0 })
    );
    expect(midGrade.skillMoves).toBe(5);

    const highGradeCapped = applyDetailBonuses(
      { skillMoves: 5 },
      getDetailBonusModel({ grade: 8, level: 1, teamColorBonus: 0 })
    );
    expect(highGradeCapped.skillMoves).toBe(6);

    const highGradeLowBase = applyDetailBonuses(
      { skillMoves: 2 },
      getDetailBonusModel({ grade: 8, level: 1, teamColorBonus: 0 })
    );
    expect(highGradeLowBase.skillMoves).toBe(4);
  });
});
