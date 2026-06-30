export const BACKEND_SEARCH_DEBOUNCE_MS = 400;
export const BACKEND_SEARCH_MAX_LENGTH = 50;

export function normalizeBackendSearch(value = '') {
  return String(value).trim().slice(0, BACKEND_SEARCH_MAX_LENGTH);
}

export function canRunBackendSearch(value = '') {
  return normalizeBackendSearch(value).length !== 1;
}
