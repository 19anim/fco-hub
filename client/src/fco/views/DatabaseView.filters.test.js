import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldClearCareerClubForLeagueChange, shouldLoadClubsForLeague } from './DatabaseView.filters.js';
import { canRunBackendSearch, normalizeBackendSearch } from '../../utils/backendSearch.js';

test('preserves career club from the initial URL league filter', () => {
  assert.equal(shouldClearCareerClubForLeagueChange(undefined, 'England Premier League'), false);
});

test('clears career club when the user changes league after initial load', () => {
  assert.equal(shouldClearCareerClubForLeagueChange('England Premier League', 'Spain Primera Division'), true);
});

test('does not load clubs before a league is selected', () => {
  assert.equal(shouldLoadClubsForLeague(''), false);
});

test('loads clubs after a league is selected', () => {
  assert.equal(shouldLoadClubsForLeague('Spain Primera Division'), true);
});

test('database backend search policy blocks one-character queries', () => {
  assert.equal(canRunBackendSearch('m'), false);
  assert.equal(canRunBackendSearch('me'), true);
  assert.equal(canRunBackendSearch(''), true);
});

test('database backend search policy caps query text to 50 characters', () => {
  assert.equal(normalizeBackendSearch('x'.repeat(60)), 'x'.repeat(50));
});
