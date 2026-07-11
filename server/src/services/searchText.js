export const SEARCH_TEXT_MAX_LENGTH = 50;

export function normalizeSearchText(value = '') {
  return String(value).trim().slice(0, SEARCH_TEXT_MAX_LENGTH);
}

export function hasSearchText(value = '') {
  return normalizeSearchText(value).length >= 2;
}

export function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toSearchRegex(value = '') {
  return escapeRegex(normalizeSearchText(value));
}

export function foldDiacritics(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[Đđ]/g, (c) => (c === 'Đ' ? 'D' : 'd'));
}

export function buildSearchKey(...parts) {
  return foldDiacritics(parts.filter(Boolean).join(' ')).toLowerCase().trim();
}

export function toFoldedSearchRegex(value = '') {
  return escapeRegex(foldDiacritics(normalizeSearchText(value)).toLowerCase());
}
