import {
  BASE_GAUGE_BY_LEVEL,
  FULL_GAUGE_SUCCESS_RATE_BY_LEVEL,
  MAX_FODDERS,
  MAX_GAUGE,
  MAX_UPGRADE_LEVEL,
  MIN_UPGRADE_LEVEL,
  UPGRADE_OUTCOMES_BY_LEVEL,
} from './upgradeConfig.js';

function round4(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeUpgradeLevel(level) {
  return clamp(Math.trunc(Number(level) || MIN_UPGRADE_LEVEL), MIN_UPGRADE_LEVEL, MAX_UPGRADE_LEVEL);
}

export function getOvrIncreaseForLevel(level) {
  const safeLevel = normalizeUpgradeLevel(level);
  let increase = 0;

  for (let step = MIN_UPGRADE_LEVEL; step < safeLevel; step += 1) {
    increase += UPGRADE_OUTCOMES_BY_LEVEL[step]?.ovrGain || 0;
  }

  return increase;
}

export function getOvrForLevel(baseOvr, level) {
  const safeBaseOvr = Number(baseOvr) || 0;
  return safeBaseOvr + getOvrIncreaseForLevel(level);
}

export function getDisplayedOvrForPlayer(player, fallbackLevel = MIN_UPGRADE_LEVEL) {
  if (!player) return 0;
  return getOvrForLevel(player.ovr, player.upgradeLevel ?? fallbackLevel);
}

export function withUpgradeLevel(player, level = MIN_UPGRADE_LEVEL) {
  return {
    ...player,
    upgradeLevel: normalizeUpgradeLevel(level),
  };
}

export function getSelectedMainUpgradeLevel(player, fallbackLevel = MIN_UPGRADE_LEVEL) {
  return normalizeUpgradeLevel(player?.upgradeLevel ?? fallbackLevel);
}

export function isUpgradeLevelSelectDisabled(animStatus) {
  return animStatus !== 'idle';
}

export function getPlayerCardKey(player) {
  if (!player) return '';
  return String(player.spid ?? player.id ?? `${player.name || ''}-${player.season || ''}-${player.ovr || ''}`);
}

export function getPlayerCardKeys(player) {
  if (!player) return [];

  return [
    player.spid != null ? `spid:${player.spid}` : '',
    player.id != null ? `id:${player.id}` : '',
    player.name && player.season && player.ovr != null
      ? `card:${String(player.name).trim().toLowerCase()}|${player.season}|${player.ovr}`
      : '',
  ].filter(Boolean);
}

export function isSamePlayerCard(a, b) {
  const aKeys = new Set(getPlayerCardKeys(a));
  return getPlayerCardKeys(b).some((key) => aKeys.has(key));
}

export function calculateUpgradeGauge({ targetOvr, currentLevel, fodderOvrs = [], eventGaugeBonus = 0 }) {
  const level = Math.trunc(Number(currentLevel));
  const target = Number(targetOvr);
  const baseGauge = BASE_GAUGE_BY_LEVEL[level];
  const fullGaugeSuccessRate = FULL_GAUGE_SUCCESS_RATE_BY_LEVEL[level] || 0;

  if (!Number.isFinite(target) || !baseGauge || !fullGaugeSuccessRate) {
    return {
      fodderGauges: [],
      materialGauge: 0,
      totalGauge: 0,
      gaugeRatio: 0,
      fullGaugeSuccessRate: 0,
      successRate: 0,
    };
  }

  const fodderGauges = fodderOvrs.slice(0, MAX_FODDERS).map((ovr) => {
    const fodderOvr = Number(ovr);
    if (!Number.isFinite(fodderOvr)) return 0;
    const delta = fodderOvr - target;
    return round4(Math.min(MAX_GAUGE, baseGauge * (4 / 3) ** delta));
  });

  const materialGaugeRaw = fodderGauges.reduce((sum, gauge) => sum + gauge, 0);
  const bonus = Math.max(0, Number(eventGaugeBonus) || 0);
  const totalGaugeRaw = Math.min(MAX_GAUGE, materialGaugeRaw + bonus);
  const gaugeRatioRaw = totalGaugeRaw / MAX_GAUGE;
  const successRateRaw = clamp(fullGaugeSuccessRate * gaugeRatioRaw, 0, 1);

  return {
    fodderGauges,
    materialGauge: round4(materialGaugeRaw),
    totalGauge: round4(totalGaugeRaw),
    gaugeRatio: round4(gaugeRatioRaw),
    fullGaugeSuccessRate: round4(fullGaugeSuccessRate),
    successRate: round4(successRateRaw),
  };
}

export function normalizeMaterialOvr(value) {
  if (value === '') return null;
  const materialOvr = Math.trunc(Number(value));
  if (!Number.isFinite(materialOvr) || materialOvr <= 0) return null;
  return materialOvr;
}

export function calculateEffectGaugeBonus(effectPercent) {
  const percent = Math.max(0, Number(effectPercent) || 0);
  return round4(MAX_GAUGE * (percent / 100));
}

export function pickQuickAddFodders({
  candidates = [],
  existingFodders = [],
  targetOvr,
  currentLevel,
  targetGauge,
}) {
  const picked = existingFodders.slice(0, MAX_FODDERS).map((player) => withUpgradeLevel(player, player.upgradeLevel));

  while (picked.length < MAX_FODDERS) {
    const currentGauge = calculateUpgradeGauge({
      targetOvr,
      currentLevel,
      fodderOvrs: picked.map((player) => getDisplayedOvrForPlayer(player)),
    });
    if (currentGauge.totalGauge >= targetGauge) break;

    const remainingGauge = Math.max(0, targetGauge - currentGauge.totalGauge);
    let best = null;

    for (const candidate of candidates) {
      const candidateKey = getPlayerCardKey(candidate);
      if (!candidate || !candidateKey) continue;

      for (let upgradeLevel = MIN_UPGRADE_LEVEL; upgradeLevel <= MAX_UPGRADE_LEVEL; upgradeLevel += 1) {
        const leveled = withUpgradeLevel(candidate, upgradeLevel);
        const addedGauge = calculateUpgradeGauge({
          targetOvr,
          currentLevel,
          fodderOvrs: [getDisplayedOvrForPlayer(leveled)],
        }).totalGauge;
        if (addedGauge <= 0) continue;

        const reachesTarget = addedGauge >= remainingGauge;
        const score = reachesTarget ? addedGauge - remainingGauge : remainingGauge - addedGauge;

        if (
          !best ||
          (reachesTarget && !best.reachesTarget) ||
          (reachesTarget === best.reachesTarget && score < best.score)
        ) {
          best = { player: leveled, addedGauge, reachesTarget, score };
        }
      }
    }

    if (!best) break;
    picked.push(best.player);
  }

  return picked;
}

export function rollUpgrade(successRate) {
  return Math.random() < clamp(Number(successRate) || 0, 0, 1);
}
