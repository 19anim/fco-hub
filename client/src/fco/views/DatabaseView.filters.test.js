import { expect, it } from 'vitest';
import { shouldClearCareerClubForLeagueChange, shouldLoadClubsForLeague } from './DatabaseView.filters.js';
import { canRunBackendSearch, normalizeBackendSearch } from '../../utils/backendSearch.js';

it('preserves career club from the initial URL league filter', () => {
  expect(shouldClearCareerClubForLeagueChange(undefined, 'England Premier League')).toBe(false);
});

it('clears career club when the user changes league after initial load', () => {
  expect(shouldClearCareerClubForLeagueChange('England Premier League', 'Spain Primera Division')).toBe(true);
});

it('does not load clubs before a league is selected', () => {
  expect(shouldLoadClubsForLeague('')).toBe(false);
});

it('loads clubs after a league is selected', () => {
  expect(shouldLoadClubsForLeague('Spain Primera Division')).toBe(true);
});

it('database backend search policy blocks one-character queries', () => {
  expect(canRunBackendSearch('m')).toBe(false);
  expect(canRunBackendSearch('me')).toBe(true);
  expect(canRunBackendSearch('')).toBe(true);
});

it('database backend search policy caps query text to 50 characters', () => {
  expect(normalizeBackendSearch('x'.repeat(60))).toBe('x'.repeat(50));
});
