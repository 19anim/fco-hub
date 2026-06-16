export function normalizeDiscoveryName(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function nameKey(value = '') {
  return normalizeDiscoveryName(value).toLowerCase();
}

export function groupUniqueNexonPlayers(players = []) {
  const byKey = new Map();

  for (const player of players) {
    const pid = Number(player.pid) || 0;
    const primaryName = normalizeDiscoveryName(player.searchName || player.name);
    if (!pid && !primaryName) continue;

    const key = pid ? `pid:${pid}` : `name:${nameKey(primaryName)}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        pid: pid || null,
        names: [],
        spids: [],
        seasonIds: [],
      });
    }

    const group = byKey.get(key);
    for (const candidateName of [player.searchName, player.name]) {
      const clean = normalizeDiscoveryName(candidateName);
      if (clean && !group.names.includes(clean)) group.names.push(clean);
    }

    const spid = Number(player.spid) || 0;
    if (spid && !group.spids.includes(spid)) group.spids.push(spid);

    const seasonId = Number(player.seasonId) || 0;
    if (seasonId && !group.seasonIds.includes(seasonId)) group.seasonIds.push(seasonId);
  }

  return [...byKey.values()];
}

export function buildSearchVariants(group, maxVariants = 3) {
  const variants = [];
  for (const name of group.names || []) {
    const clean = normalizeDiscoveryName(name);
    if (clean && !variants.includes(clean)) variants.push(clean);

    const parts = clean.split(' ').filter(Boolean);
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    if (last && last.length >= 3 && !variants.includes(last)) variants.push(last);

    if (variants.length >= maxVariants) break;
  }
  return variants.slice(0, maxVariants);
}

export function classifyDiscoveryStop({ queueLength, processed, maxVisits }) {
  if (queueLength > 0 && processed >= maxVisits) return 'max-visits-reached';
  if (queueLength === 0) return 'queue-exhausted';
  return 'stopped';
}
