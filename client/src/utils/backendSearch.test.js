import { describe, expect, it } from 'vitest';
import {
  BACKEND_SEARCH_DEBOUNCE_MS,
  BACKEND_SEARCH_MAX_LENGTH,
  canRunBackendSearch,
  normalizeBackendSearch,
} from './backendSearch';

describe('backend search policy', () => {
  it('uses the approved debounce and length constants', () => {
    expect(BACKEND_SEARCH_DEBOUNCE_MS).toBe(400);
    expect(BACKEND_SEARCH_MAX_LENGTH).toBe(50);
  });

  it('trims whitespace and caps search text to 50 characters', () => {
    expect(normalizeBackendSearch(`  ${'a'.repeat(60)}  `)).toBe('a'.repeat(50));
  });

  it('allows empty and two-character searches but blocks one-character searches', () => {
    expect(canRunBackendSearch('')).toBe(true);
    expect(canRunBackendSearch(' a ')).toBe(false);
    expect(canRunBackendSearch(' ab ')).toBe(true);
  });
});
