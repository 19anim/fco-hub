import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnrichmentSearchQuery } from './player.controller.js';

test('careerClub filter targets club career teams only', () => {
  assert.deepEqual(
    buildEnrichmentSearchQuery('', '', { careerClub: 'Manchester United' }),
    {
      source: 'fifaaddict-vn',
      'clubCareer.team': { $regex: 'Manchester United', $options: 'i' },
    }
  );
});

test('careerClub filter does not constrain current league', () => {
  assert.deepEqual(
    buildEnrichmentSearchQuery('', '', { league: 'Spain La Liga', careerClub: 'Real Madrid' }),
    {
      source: 'fifaaddict-vn',
      'clubCareer.team': { $regex: 'Real Madrid', $options: 'i' },
    }
  );
});
