import { hasSearchText, normalizeSearchText, toSearchRegex, toFoldedSearchRegex } from './searchText.js';

export function buildAdminPlayerSearchQuery({ q, season, position } = {}) {
  const filter = { source: 'fifaaddict-vn', overall: { $gt: 0 } };

  const normalizedQ = normalizeSearchText(q);
  if (normalizedQ.length === 1) {
    filter._id = null;
  } else if (hasSearchText(normalizedQ)) {
    const foldedRegex = toFoldedSearchRegex(normalizedQ);
    const rawRegex = toSearchRegex(normalizedQ);
    filter.$or = [
      { searchKey: { $regex: foldedRegex, $options: 'i' } },
      { seasonName: { $regex: rawRegex, $options: 'i' } },
    ];
  }

  if (season) filter.seasonCode = String(season);
  if (position) filter.bestPosition = position;

  return filter;
}

export function toLinkedPlayerResult(player) {
  const id = String(player._id);

  return {
    _id: id,
    entityId: id,
    sourceUid: String(player.sourceUid || ''),
    name: player.displayNameVi || player.displayNameEn,
    position: player.bestPosition || player.positions?.[0]?.position || '',
    overall: player.overall,
    seasonName: player.seasonName,
    seasonId: player.seasonCode,
    imageUrl: player.imageUrl,
  };
}
