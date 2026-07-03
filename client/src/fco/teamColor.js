import { getOvrIncreaseForLevel, getPlayerCardKey, normalizeUpgradeLevel } from './upgradeHelpers.js';

// ── Team color đội ─────────────────────────────────────────────────────────────
export const CLUB_TIER_THRESHOLDS = Object.freeze([
  { min: 10, up: 3, full: true },
  { min: 8, up: 3, full: false },
  { min: 6, up: 2, full: false },
  { min: 3, up: 1, full: false },
]);

function getClubBuff(count) {
  return CLUB_TIER_THRESHOLDS.find((tier) => count >= tier.min) || null;
}

function addGroup(groups, playerKey, kind, kindLabel, name) {
  const value = String(name || '').trim();
  if (!value) return;

  const groupKey = `${kind}:${value.toLowerCase()}`;
  if (!groups.has(groupKey)) {
    groups.set(groupKey, { kind, kindLabel, name: value, players: [] });
  }

  const group = groups.get(groupKey);
  if (!group.players.includes(playerKey)) group.players.push(playerKey);
}

function getTeamColorEntries(player) {
  return Array.isArray(player?.teamColor) ? player.teamColor : [];
}

function getClubCareerEntries(player) {
  return Array.isArray(player?.clubCareer) ? player.clubCareer : [];
}

// ── Team color nâng cấp (theo upgradeLevel) ──────────────────────────────────────
export const UPGRADE_TIERS = Object.freeze([
  { key: 'bronze', label: 'Đồng', min: 3, max: 4, color: '#c58347', thresholds: [{ min: 5, up: 1 }] },
  { key: 'silver', label: 'Bạc', min: 5, max: 7, color: '#b9c2cc', thresholds: [{ min: 8, up: 3 }, { min: 5, up: 1 }] },
  { key: 'gold', label: 'Vàng', min: 8, max: 10, color: '#f0c14b', thresholds: [{ min: 8, up: 4 }, { min: 5, up: 3 }] },
  { key: 'platinum', label: 'Bạch kim', min: 11, max: 13, color: '#7fe0d0', thresholds: [{ min: 8, up: 5 }, { min: 5, up: 4 }] },
]);

function getUpgradeTierForLevel(level) {
  const lv = normalizeUpgradeLevel(level);
  return UPGRADE_TIERS.find((tier) => lv >= tier.min && lv <= tier.max) || null;
}

function getUpgradeBuff(tier, count) {
  if (!tier) return null;
  return tier.thresholds.find((threshold) => count >= threshold.min) || null;
}

// ── Grouping ──────────────────────────────────────────────────────────────────
export function computeClubTeamColors(starters) {
  const groups = new Map();

  starters.forEach((player) => {
    if (!player) return;
    const key = getPlayerCardKey(player);

    getTeamColorEntries(player).forEach((entry) => {
      addGroup(groups, key, 'teamColor', 'Team color', typeof entry === 'string' ? entry : entry.name || entry.team || entry.label || entry.title);
    });

    getClubCareerEntries(player).forEach((entry) => {
      addGroup(groups, key, 'club', 'CLB', entry.team || entry.name || entry.club);
    });

    addGroup(groups, key, 'club', 'CLB', player.club);
    addGroup(groups, key, 'nation', 'Quốc gia', player.nation);
  });

  const active = [...groups.values()]
    .filter((group) => group.players.length >= 3)
    .sort((a, b) => b.players.length - a.players.length || a.name.localeCompare(b.name))
    .map((group) => ({ ...group, count: group.players.length, buff: getClubBuff(group.players.length) }));

  const bonusByPlayer = new Map();
  const groupByPlayer = new Map();
  active.forEach((group) => {
    group.players.forEach((key) => {
      const current = groupByPlayer.get(key);
      if (current && (current.count > group.count || (current.count === group.count && (current.buff?.up || 0) >= (group.buff?.up || 0)))) return;
      bonusByPlayer.set(key, group.buff?.up || 0);
      groupByPlayer.set(key, group);
    });
  });

  return { groups: active, bonusByPlayer, groupByPlayer };
}

export function computeUpgradeTeamColors(starters) {
  const countByTierKey = new Map();

  starters.forEach((player) => {
    if (!player) return;
    const tier = getUpgradeTierForLevel(player.upgradeLevel);
    if (!tier) return;
    countByTierKey.set(tier.key, (countByTierKey.get(tier.key) || 0) + 1);
  });

  const active = UPGRADE_TIERS
    .map((tier) => {
      const count = countByTierKey.get(tier.key) || 0;
      const buff = getUpgradeBuff(tier, count);
      return { ...tier, count, buff };
    })
    .filter((tier) => tier.count > 0 && tier.buff);

  const bonusByPlayer = new Map();
  const tierByPlayer = new Map();
  starters.forEach((player) => {
    if (!player) return;
    const key = getPlayerCardKey(player);
    const tier = getUpgradeTierForLevel(player.upgradeLevel);
    if (!tier) return;
    const activeTier = active.find((t) => t.key === tier.key);
    if (!activeTier) return;
    bonusByPlayer.set(key, activeTier.buff.up);
    tierByPlayer.set(key, activeTier);
  });

  return { tiers: active, bonusByPlayer, tierByPlayer };
}

// ── Combine ───────────────────────────────────────────────────────────────────
export function computeSquadBonuses(starters) {
  const safeStarters = (starters || []).filter(Boolean);
  const club = computeClubTeamColors(safeStarters);
  const upgrade = computeUpgradeTeamColors(safeStarters);

  const perPlayer = new Map();
  safeStarters.forEach((player) => {
    const key = getPlayerCardKey(player);
    const clubBonus = club.bonusByPlayer.get(key) || 0;
    const upgradeBonus = upgrade.bonusByPlayer.get(key) || 0;
    perPlayer.set(key, {
      clubBonus,
      upgradeBonus,
      totalBonus: clubBonus + upgradeBonus,
      clubGroup: club.groupByPlayer.get(key) || null,
      upgradeTier: upgrade.tierByPlayer.get(key) || null,
    });
  });

  return { club, upgrade, perPlayer };
}

export function getPlayerSquadBonus(perPlayer, player) {
  if (!player) return { clubBonus: 0, upgradeBonus: 0, totalBonus: 0, clubGroup: null, upgradeTier: null };
  return perPlayer.get(getPlayerCardKey(player)) || { clubBonus: 0, upgradeBonus: 0, totalBonus: 0, clubGroup: null, upgradeTier: null };
}

export function applySquadBonus(player, bonus) {
  if (!player) return player;
  const upgradeBonus = getOvrIncreaseForLevel(player.upgradeLevel);
  const teamColorBonus = bonus?.totalBonus || 0;
  const total = upgradeBonus + teamColorBonus;
  if (!total) return player;

  const addBonus = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number + total : value;
  };

  return {
    ...player,
    ovr: addBonus(player.ovr),
    pace: addBonus(player.pace),
    shooting: addBonus(player.shooting),
    passing: addBonus(player.passing),
    dribbling: addBonus(player.dribbling),
    defending: addBonus(player.defending),
    physical: addBonus(player.physical),
  };
}
