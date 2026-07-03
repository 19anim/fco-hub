import { POSITIONS_META } from './constants.js';
import { getOvrForSlotPosition } from './positionOvr.js';
import { getPlayerCardKey } from './upgradeHelpers.js';

export const DEFAULT_SALARY_CAP = 300;
export const MAX_SALARY_CAP = 9999;

const GROUP_LABELS = { GK: 'GK', DEF: 'DF', MID: 'MF', FWD: 'FW' };

export function getSquadSalaryTotal(starters) {
  return (starters || []).reduce((sum, player) => {
    const salary = Number(player?.salary);
    return sum + (Number.isFinite(salary) ? salary : 0);
  }, 0);
}

export function getLineAverages(slots, bySlotId, perPlayerBonuses) {
  const buckets = { GK: [], DEF: [], MID: [], FWD: [] };
  const all = [];

  (slots || []).forEach((slot) => {
    const player = bySlotId?.[slot.id];
    if (!player) return;
    const group = POSITIONS_META[String(slot.pos || '').toUpperCase()]?.group;
    const baseOvr = getOvrForSlotPosition(player, slot.pos).ovr;
    const bonus = perPlayerBonuses?.get(getPlayerCardKey(player))?.totalBonus || 0;
    const ovr = baseOvr + bonus;
    if (!Number.isFinite(ovr)) return;
    all.push(ovr);
    if (group && buckets[group]) buckets[group].push(ovr);
  });

  function avg(values) {
    if (!values.length) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  return {
    GK: avg(buckets.GK),
    DEF: avg(buckets.DEF),
    MID: avg(buckets.MID),
    FWD: avg(buckets.FWD),
    overall: avg(all),
  };
}

export { GROUP_LABELS };
