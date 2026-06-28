import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClubCareerBackfillGroups,
  buildClubCareerBackfillQuery,
  buildClubCareerFanoutOperations,
  resolveClubCareerBackfillCap,
  extractClubCareer,
  getClubCareerPlayerKey,
  getClubCareerSource,
  getFifaAddictLeagueSlug,
  hasCompatibleClubCareerIdentity,
} from './fifaAddictSource.js';

test('reads clubcareer from payload.db when payload.pre exists without clubcareer', () => {
  const clubCareer = getClubCareerSource({
    pre: { uid: 'ronzbvdrb', current_ovr: 126 },
    db: {
      clubcareer: [
        { team_name: 'Manchester United', team_id: '11', season: '2021-2022' },
        { team_name: 'Real Madrid', team_id: '243', season: '2009-2018' },
      ],
    },
  });

  assert.deepEqual(clubCareer, [
    { team_name: 'Manchester United', team_id: '11', season: '2021-2022' },
    { team_name: 'Real Madrid', team_id: '243', season: '2009-2018' },
  ]);
});

test('normalizes clubcareer object map from payload.db when payload.pre only has boolean marker', () => {
  const clubCareer = extractClubCareer(getClubCareerSource({
    pre: { clubcareer: true },
    db: {
      clubcareer: {
        1: {
          year: '2025',
          loan: false,
          teamname: 'Manchester United',
          teamlink: 'teamcolor=manchester-united',
          teamcolor: true,
        },
        2: {
          year: '2019 - 2025',
          loan: false,
          teamname: 'Brentford',
          teamlink: 'league=england-premier-league&team=brentford',
          teamcolor: false,
        },
        3: {
          year: '2018 - 2019',
          loan: false,
          teamname: 'ESTAC Troyes',
          teamlink: 'league=france-ligue-2&team=estac-troyes',
          teamcolor: false,
        },
        4: {
          year: '2016 - 2018',
          loan: false,
          teamname: 'ESTAC Troyes II',
          teamlink: false,
          teamcolor: false,
        },
      },
    },
  }));

  assert.deepEqual(clubCareer, [
    { team: 'Manchester United', teamId: '', season: '2025' },
    { team: 'Brentford', teamId: '', season: '2019 - 2025' },
    { team: 'ESTAC Troyes', teamId: '', season: '2018 - 2019' },
    { team: 'ESTAC Troyes II', teamId: '', season: '2016 - 2018' },
  ]);
});

test('clubCareer backfill query targets only records missing career by default', () => {
  assert.deepEqual(buildClubCareerBackfillQuery(), {
    source: 'fifaaddict-vn',
    sourceUid: { $exists: true, $ne: '' },
    $or: [
      { clubCareer: { $exists: false } },
      { clubCareer: { $size: 0 } },
    ],
  });
});

test('clubCareer backfill query can target every FIFAAddict record', () => {
  assert.deepEqual(buildClubCareerBackfillQuery({ onlyMissing: false }), {
    source: 'fifaaddict-vn',
    sourceUid: { $exists: true, $ne: '' },
  });
});

test('clubCareer backfill cap treats limit 0 as all matching records', () => {
  assert.equal(resolveClubCareerBackfillCap({ limit: 0, total: 15267 }), 15267);
  assert.equal(resolveClubCareerBackfillCap({ limit: 500, total: 15267 }), 500);
  assert.equal(resolveClubCareerBackfillCap({ limit: 20000, total: 15267 }), 15267);
});

test('clubCareer player key prefers English name and normalizes casing/space', () => {
  assert.equal(
    getClubCareerPlayerKey({ displayNameEn: '  Cristiano Ronaldo ', displayNameVi: 'Cristiano Ronaldo dos Santos Aveiro' }),
    'cristiano ronaldo'
  );
  assert.equal(
    getClubCareerPlayerKey({ displayNameEn: '', displayNameVi: '  Nguyễn   Văn A  ' }),
    'nguyễn văn a'
  );
  assert.equal(getClubCareerPlayerKey({ displayNameEn: '', displayNameVi: '', fullNameVi: '' }), '');
});

test('clubCareer identity guard allows matching optional metadata', () => {
  const reference = {
    displayNameEn: 'Cristiano Ronaldo',
    nation: 'Portugal',
    birthDateText: '1985-02-05',
  };

  assert.equal(
    hasCompatibleClubCareerIdentity(reference, {
      displayNameEn: ' Cristiano Ronaldo ',
      nation: 'Portugal',
      birthDateText: '1985-02-05',
    }),
    true
  );
  assert.equal(
    hasCompatibleClubCareerIdentity(reference, {
      displayNameEn: 'Cristiano Ronaldo',
      nation: '',
      birthDateText: '',
    }),
    true
  );
  assert.equal(
    hasCompatibleClubCareerIdentity(reference, {
      displayNameEn: 'Cristiano Ronaldo',
      nation: 'Brazil',
      birthDateText: '1985-02-05',
    }),
    false
  );
  assert.equal(
    hasCompatibleClubCareerIdentity(reference, {
      displayNameEn: 'Cristiano Ronaldo',
      nation: 'Portugal',
      birthDateText: '1999-01-01',
    }),
    false
  );
});

test('clubCareer backfill groups records by normalized player key and skips empty names', () => {
  const groups = buildClubCareerBackfillGroups([
    { _id: '1', displayNameEn: 'A. Adli', displayNameVi: 'A. Adli' },
    { _id: '2', displayNameEn: ' a.  adli ', displayNameVi: 'A. Adli' },
    { _id: '3', displayNameEn: '', displayNameVi: 'A Lan' },
    { _id: '4', displayNameEn: '', displayNameVi: '' },
  ]);

  assert.deepEqual(
    groups.map((group) => ({ key: group.key, ids: group.records.map((record) => record._id) })),
    [
      { key: 'a. adli', ids: ['1', '2'] },
      { key: 'a lan', ids: ['3'] },
    ]
  );
});

test('clubCareer fanout operations update compatible same-name records only', () => {
  const career = [{ team: 'Manchester United', teamId: '', season: '2003 - 2009' }];
  const reference = {
    _id: '1',
    displayNameEn: 'Cristiano Ronaldo',
    nation: 'Portugal',
    birthDateText: '1985-02-05',
  };

  const operations = buildClubCareerFanoutOperations(reference, [
    reference,
    {
      _id: '2',
      displayNameEn: 'Cristiano Ronaldo',
      nation: 'Portugal',
      birthDateText: '',
    },
    {
      _id: '3',
      displayNameEn: 'Cristiano Ronaldo',
      nation: 'Brazil',
      birthDateText: '1985-02-05',
    },
  ], career);

  assert.deepEqual(operations, [
    {
      updateOne: {
        filter: { _id: '1' },
        update: { $set: { clubCareer: career } },
      },
    },
    {
      updateOne: {
        filter: { _id: '2' },
        update: { $set: { clubCareer: career } },
      },
    },
  ]);
});

test('clubCareer fanout operations skip empty career payloads', () => {
  assert.deepEqual(
    buildClubCareerFanoutOperations(
      { _id: '1', displayNameEn: 'A Lan' },
      [{ _id: '1', displayNameEn: 'A Lan' }],
      []
    ),
    []
  );
});

test('maps LaLiga display name to FIFAAddict league slug', () => {
  assert.equal(getFifaAddictLeagueSlug('Spain Primera Division'), 'spain-la-liga');
  assert.equal(getFifaAddictLeagueSlug('LaLiga'), 'spain-la-liga');
});
