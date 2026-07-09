import { getOvrIncreaseForLevel } from '../upgradeHelpers.js';

const OVR_STAT_KEY = 'ovr';
const DETAILED_STAT_BASE_CORRECTION = 3;
const GRADE_STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];

function clampInteger(value, min, max) {
  const number = Math.trunc(Number(value) || min);
  return Math.min(max, Math.max(min, number));
}

function getOvrBonusForGrade(grade) {
  return getOvrIncreaseForLevel(grade);
}

function getStatBonusForGrade(grade) {
  return getOvrIncreaseForLevel(grade);
}

const MAX_SKILL_MOVES = 6;

export function getSkillMovesBonusForGrade(grade) {
  const safeGrade = Math.trunc(Number(grade) || 0);
  if (safeGrade >= 8) return 2;
  if (safeGrade >= 5) return 1;
  return 0;
}

function addBonus(value, bonus) {
  if (value == null) return value;
  const number = Number(value);
  return Number.isFinite(number) ? number + bonus : value;
}

export function getDetailBonusModel({ grade, level = 1, teamColorBonus = 0 }) {
  const gradeOvrBonus = getOvrBonusForGrade(grade);
  const gradeStatBonus = getStatBonusForGrade(grade);
  const levelStatBonus = clampInteger(level, 1, 5) - 1;
  const bonusStatBonus = clampInteger(teamColorBonus, 0, 10);
  const flatBonus = levelStatBonus + bonusStatBonus;
  const skillMovesBonus = getSkillMovesBonusForGrade(grade);

  return {
    gradeOvrBonus,
    gradeStatBonus,
    levelStatBonus,
    bonusStatBonus,
    flatBonus,
    statBonus: gradeStatBonus + flatBonus,
    ovrBonus: gradeOvrBonus + flatBonus,
    skillMovesBonus,
  };
}

export function applyDetailBonuses(player, bonuses) {
  if (!player) return player;

  const ovrBonus = bonuses?.ovrBonus || 0;
  const statBonus = bonuses?.statBonus || 0;
  const detailedStatBonus = statBonus + DETAILED_STAT_BASE_CORRECTION;
  const detailed = player.detailed
    ? Object.fromEntries(Object.entries(player.detailed).map(([group, value]) => [
        group,
        Array.isArray(value)
          ? value.map((stat) => ({ ...stat, value: addBonus(stat.value, detailedStatBonus) }))
          : typeof value === 'object' && value !== null
            ? Object.fromEntries(Object.entries(value).map(([key, statValue]) => [key, addBonus(statValue, detailedStatBonus)]))
            : addBonus(value, detailedStatBonus),
      ]))
    : player.detailed;

  const skillMovesBonus = bonuses?.skillMovesBonus || 0;
  const skillMoves = player.skillMoves != null
    ? Math.min(MAX_SKILL_MOVES, Number(player.skillMoves) + skillMovesBonus)
    : player.skillMoves;

  return {
    ...player,
    [OVR_STAT_KEY]: addBonus(player[OVR_STAT_KEY], ovrBonus),
    ...Object.fromEntries(GRADE_STAT_KEYS.map((key) => [key, addBonus(player[key], statBonus)])),
    positionRatings: player.positionRatings?.map((rating) => ({ ...rating, value: addBonus(rating.value, ovrBonus) })) || [],
    detailed,
    skillMoves,
    boost: bonuses?.statBonus || 0,
    ovrBoost: ovrBonus,
  };
}
