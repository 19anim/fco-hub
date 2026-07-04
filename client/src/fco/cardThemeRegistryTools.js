function normalizeSeasonCode(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeThemeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^card-theme-/, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeLocalPath(value, themeId) {
  const path = String(value || '').trim();
  return path || `/fco/card-themes/card-theme-${themeId}.png`;
}

function normalizeTitle(value) {
  return String(value || '').trim();
}

function extractSeasonClassId(value = '') {
  return String(value).match(/(?:^|\s)y([a-z0-9_-]+)(?:\s|$)/i)?.[1]?.toUpperCase() || '';
}

function normalizeSeasonRecord(record = {}) {
  const seasonCode = normalizeSeasonCode(record.seasonCode || record.season || record.value);
  const className = String(record.className || '').trim();
  return {
    seasonCode,
    title: normalizeTitle(record.title || record.name || record.label),
    className,
    classId: extractSeasonClassId(className),
  };
}

function getRecordTitle(record = {}) {
  return normalizeTitle(record.title || record.name || record.label);
}

function formatSeasonTitle(title) {
  return title ? ` — ${title}` : '';
}

function formatAssetLine(item) {
  return `- ${item.seasonCode} / ${item.themeId}${formatSeasonTitle(item.title)} — \`${item.localPath || item.backgroundImage}\``;
}

export function buildLocalCardThemeEntries(records = []) {
  const entries = {};
  const unresolved = [];
  const themeUsage = new Map();

  for (const record of records) {
    const seasonCode = normalizeSeasonCode(record?.seasonCode || record?.season || record?.value);
    if (!seasonCode) continue;

    const themeId = normalizeThemeId(record?.themeId || record?.className);
    const reason = String(record?.reason || '').trim();
    if (!themeId || reason) {
      unresolved.push({ seasonCode, reason: reason || 'missing rendered theme class' });
      continue;
    }

    const localPath = normalizeLocalPath(record?.localPath, themeId);
    entries[seasonCode] = {
      themeId,
      className: `card-theme-${themeId}`,
      backgroundImage: localPath,
    };

    const existing = themeUsage.get(themeId) || { themeId, seasons: [], localPath };
    existing.seasons.push(seasonCode);
    themeUsage.set(themeId, existing);
  }

  const sharedThemes = [...themeUsage.values()]
    .filter((theme) => theme.seasons.length > 1)
    .map((theme) => ({ ...theme, seasons: theme.seasons.sort() }))
    .sort((a, b) => a.themeId.localeCompare(b.themeId));

  unresolved.sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));

  return { entries, unresolved, sharedThemes };
}

export function reconcileCardThemeCoverage({
  fifaAddictSeasons = [],
  records = [],
  appSeasons = [],
  entries = {},
  sharedThemes = [],
  unresolved = [],
} = {}) {
  const fifaSeasonsByCode = new Map(
    fifaAddictSeasons
      .map(normalizeSeasonRecord)
      .filter((season) => season.seasonCode)
      .map((season) => [season.seasonCode, season]),
  );
  const appSeasonsByCode = new Map(
    appSeasons
      .map(normalizeSeasonRecord)
      .filter((season) => season.seasonCode)
      .map((season) => [season.seasonCode, season]),
  );
  const recordsByCode = new Map(
    records
      .map((record) => ({ ...record, seasonCode: normalizeSeasonCode(record?.seasonCode || record?.season || record?.value) }))
      .filter((record) => record.seasonCode)
      .map((record) => [record.seasonCode, record]),
  );
  const fifaSeasonsByClassId = new Map(
    [...fifaSeasonsByCode.values()]
      .filter((season) => season.classId)
      .map((season) => [season.classId, season]),
  );

  const cloned = Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([seasonCode, theme]) => {
      const record = recordsByCode.get(seasonCode) || {};
      const fifaSeason = fifaSeasonsByCode.get(seasonCode) || {};
      return {
        seasonCode,
        title: getRecordTitle(record) || fifaSeason.title || '',
        themeId: theme.themeId,
        localPath: theme.backgroundImage,
      };
    });
  const clonedByCode = new Map(cloned.map((item) => [item.seasonCode, item]));

  const appMappedSeasons = [...appSeasonsByCode.values()]
    .map((appSeason) => {
      const direct = clonedByCode.get(appSeason.seasonCode);
      if (direct) return direct;

      const fifaSeason = fifaSeasonsByClassId.get(appSeason.classId);
      const classMatched = fifaSeason ? clonedByCode.get(fifaSeason.seasonCode) : null;
      if (!classMatched) return null;

      return {
        ...classMatched,
        seasonCode: appSeason.seasonCode,
        title: appSeason.title || classMatched.title,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));
  const appMappedCodes = new Set(appMappedSeasons.map((item) => item.seasonCode));

  const appMissingFromFifaAddict = [...appSeasonsByCode.values()]
    .filter((season) => !appMappedCodes.has(season.seasonCode) && !fifaSeasonsByCode.has(season.seasonCode) && !fifaSeasonsByClassId.has(season.classId))
    .map((season) => ({
      seasonCode: season.seasonCode,
      title: season.title,
      reason: 'not found in FIFAAddict season options',
    }))
    .sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));

  const matchedFifaCodes = new Set(appMappedSeasons.map((item) => {
    const direct = clonedByCode.get(item.seasonCode);
    if (direct) return direct.seasonCode;
    const appSeason = appSeasonsByCode.get(item.seasonCode);
    return fifaSeasonsByClassId.get(appSeason?.classId)?.seasonCode || item.seasonCode;
  }));
  const fifaAddictOnlySeasons = cloned
    .filter((item) => !matchedFifaCodes.has(item.seasonCode))
    .map((item) => ({
      seasonCode: item.seasonCode,
      title: item.title,
      themeId: item.themeId,
      localPath: item.localPath,
    }));

  const uniqueDownloadedThemes = new Set(cloned.map((item) => item.themeId)).size;
  const normalizedUnresolved = unresolved
    .map((item) => ({
      seasonCode: normalizeSeasonCode(item.seasonCode || item.season || item.value),
      reason: String(item.reason || 'missing rendered theme class').trim(),
    }))
    .filter((item) => item.seasonCode)
    .sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));

  return {
    summary: {
      fifaAddictSeasons: fifaSeasonsByCode.size,
      downloadedSeasonMappings: cloned.length,
      uniqueDownloadedThemes,
      appSeasons: appSeasonsByCode.size,
      appMappedSeasons: appMappedSeasons.length,
      appMissingFromFifaAddict: appMissingFromFifaAddict.length,
      fifaAddictOnlySeasons: fifaAddictOnlySeasons.length,
      unresolvedSeasons: normalizedUnresolved.length,
    },
    cloned,
    sharedThemes,
    appMappedSeasons,
    appMissingFromFifaAddict,
    fifaAddictOnlySeasons,
    unresolved: normalizedUnresolved,
  };
}

export function formatLocalCardThemeEntries(entries = {}) {
  return Object.entries(entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([seasonCode, theme]) => [
      `  '${seasonCode}': {`,
      `    themeId: '${theme.themeId}',`,
      `    className: '${theme.className}',`,
      `    backgroundImage: '${theme.backgroundImage}',`,
      '  },',
    ].join('\n'))
    .join('\n');
}

export function formatCollectionCoverage(input = {}) {
  const coverage = input.summary ? input : reconcileCardThemeCoverage(input);
  const summary = coverage.summary || {};
  const clonedLines = (coverage.cloned || []).map(formatAssetLine);
  const sharedLines = (coverage.sharedThemes || []).map((theme) => `- ${theme.themeId} — shared by ${theme.seasons.join(', ')} — \`${theme.localPath}\``);
  const appMappedLines = (coverage.appMappedSeasons || []).map(formatAssetLine);
  const appMissingLines = (coverage.appMissingFromFifaAddict || []).map((item) => `- ${item.seasonCode}${formatSeasonTitle(item.title)} — ${item.reason}`);
  const fifaOnlyLines = (coverage.fifaAddictOnlySeasons || []).map(formatAssetLine);
  const unresolvedLines = (coverage.unresolved || []).map((item) => `- ${item.seasonCode} — ${item.reason}`);

  return [
    '# FIFAAddict card background collection coverage',
    '',
    '## Summary',
    '',
    `- FIFAAddict squadmaker seasons discovered: ${summary.fifaAddictSeasons || 0}`,
    `- FIFAAddict season mappings with local assets: ${summary.downloadedSeasonMappings || 0}`,
    `- Unique downloaded theme PNGs: ${summary.uniqueDownloadedThemes || 0}`,
    `- App seasons considered: ${summary.appSeasons || 0}`,
    `- App seasons mapped to local assets: ${summary.appMappedSeasons || 0}`,
    `- App seasons not found in FIFAAddict query: ${summary.appMissingFromFifaAddict || 0}`,
    `- FIFAAddict seasons not matched to app seasons: ${summary.fifaAddictOnlySeasons || 0}`,
    `- Unresolved FIFAAddict seasons: ${summary.unresolvedSeasons || 0}`,
    '',
    '## FIFAAddict local assets',
    '',
    clonedLines.length ? clonedLines.join('\n') : '- None',
    '',
    '## Shared downloaded themes',
    '',
    sharedLines.length ? sharedLines.join('\n') : '- None',
    '',
    '## App seasons mapped to local assets',
    '',
    appMappedLines.length ? appMappedLines.join('\n') : '- None',
    '',
    '## App seasons not found in FIFAAddict query',
    '',
    appMissingLines.length ? appMissingLines.join('\n') : '- None',
    '',
    '## FIFAAddict seasons not matched to app seasons',
    '',
    fifaOnlyLines.length ? fifaOnlyLines.join('\n') : '- None',
    '',
    '## Unresolved FIFAAddict seasons',
    '',
    unresolvedLines.length ? unresolvedLines.join('\n') : '- None',
    '',
  ].join('\n');
}
