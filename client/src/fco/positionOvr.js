import { resolvePositionCode } from './constants.js';

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getRatingPosition(rating) {
  return rating?.position || rating?.pos || rating?.label || rating?.name;
}

function getRatingValue(rating) {
  return toFiniteNumber(rating?.overall ?? rating?.ovr ?? rating?.value ?? rating?.rating);
}

function expandPositionLabel(pos) {
  const upperPos = String(pos || '').toUpperCase();
  const match = upperPos.match(/^L\/R(.+)$/);
  if (match) return [`L${match[1]}`, `R${match[1]}`];
  return [upperPos];
}

function ratingMatchesDirectPosition(ratingPos, directPos) {
  return expandPositionLabel(ratingPos).includes(directPos);
}

function ratingMatchesBasePosition(ratingPos, targetPos) {
  return expandPositionLabel(ratingPos).some((pos) => resolvePositionCode(pos) === targetPos);
}

export function getOvrForSlotPosition(player, slotPos) {
  const fallbackOvr = toFiniteNumber(player?.ovr) ?? 0;
  const targetPos = resolvePositionCode(slotPos);
  const directPos = String(slotPos || '').toUpperCase();

  const ratings = [
    ...(Array.isArray(player?.positions) ? player.positions : []),
    ...(Array.isArray(player?.positionRatings) ? player.positionRatings : []),
  ];

  for (const rating of ratings) {
    if (typeof rating === 'string') continue;
    const ratingPos = getRatingPosition(rating);
    if (!ratingMatchesDirectPosition(ratingPos, directPos)) continue;

    const value = getRatingValue(rating);
    if (value != null) return { ovr: value, ovrIsFallback: false };
  }

  for (const rating of ratings) {
    if (typeof rating === 'string') continue;
    const ratingPos = getRatingPosition(rating);
    if (!ratingMatchesBasePosition(ratingPos, targetPos)) continue;

    const value = getRatingValue(rating);
    if (value != null) return { ovr: value, ovrIsFallback: false };
  }

  return { ovr: fallbackOvr, ovrIsFallback: true };
}
