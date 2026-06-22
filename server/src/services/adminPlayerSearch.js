export function buildAdminPlayerSearchQuery({ q, season, position } = {}) {
  const filter = { source: 'fifaaddict-vn', overall: { $gt: 0 } };

  if (q) {
    filter.$or = [
      { displayNameVi: { $regex: q, $options: 'i' } },
      { displayNameEn: { $regex: q, $options: 'i' } },
      { fullNameVi: { $regex: q, $options: 'i' } },
      { seasonName: { $regex: q, $options: 'i' } },
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
