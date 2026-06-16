import axios from 'axios';
import MatchSample from '../models/MatchSample.js';
import PlayerUsageAggregate from '../models/PlayerUsageAggregate.js';

const NEXON_API_BASE = 'https://open.api.nexon.com/fconline/v1';

const POSITION_MAP = {
  0: 'GK',
  1: 'SW',
  2: 'RWB',
  3: 'RB',
  4: 'RCB',
  5: 'CB',
  6: 'LCB',
  7: 'LB',
  8: 'LWB',
  9: 'RDM',
  10: 'CDM',
  11: 'LDM',
  12: 'RM',
  13: 'RCM',
  14: 'CM',
  15: 'LCM',
  16: 'LM',
  17: 'RAM',
  18: 'CAM',
  19: 'LAM',
  20: 'RF',
  21: 'CF',
  22: 'LF',
  23: 'RW',
  24: 'RS',
  25: 'ST',
  26: 'LS',
  27: 'LW',
  28: 'SUB',
};

function getApiKey() {
  return process.env.NEXON_API_KEY;
}

function assertApiKey() {
  if (!getApiKey()) {
    const error = new Error('Missing NEXON_API_KEY. Add it to server/.env to enable match usage sync.');
    error.code = 'MISSING_NEXON_API_KEY';
    throw error;
  }
}

async function nexonGet(path, params = {}) {
  assertApiKey();
  const response = await axios.get(`${NEXON_API_BASE}${path}`, {
    params,
    timeout: 30000,
    headers: {
      'x-nxopen-api-key': getApiKey(),
      Accept: 'application/json',
    },
  });
  return response.data;
}

function normalizeResult(value = '') {
  const lower = value.toString().toLowerCase();
  if (lower.includes('win') || value.includes('승')) return 'win';
  if (lower.includes('draw') || value.includes('무')) return 'draw';
  if (lower.includes('lose') || lower.includes('loss') || value.includes('패')) return 'loss';
  return lower || 'unknown';
}

function extractLineup(matchInfo) {
  return {
    ouid: matchInfo.ouid || '',
    nickname: matchInfo.nickname || '',
    result: normalizeResult(matchInfo.matchDetail?.matchResult),
    formation: matchInfo.matchDetail?.formation || '',
    players: (matchInfo.player || []).map((player) => ({
      spid: Number(player.spId || player.spid),
      spPosition: Number(player.spPosition),
      position: POSITION_MAP[Number(player.spPosition)] || '',
      grade: Number(player.spGrade || 0),
    })).filter((player) => player.spid),
  };
}

export async function lookupOuid(nickname) {
  return nexonGet('/id', { nickname });
}

export async function getUserMatches({ ouid, matchtype = 50, offset = 0, limit = 20 }) {
  return nexonGet('/user/match', { ouid, matchtype, offset, limit });
}

export async function getMatchDetail(matchid) {
  return nexonGet('/match-detail', { matchid });
}

export async function syncMatchUsage({ nickname, ouid, matchtype = 50, limit = 20 } = {}) {
  assertApiKey();
  let targetOuid = ouid;
  let targetNickname = nickname || '';

  if (!targetOuid && nickname) {
    const lookup = await lookupOuid(nickname);
    targetOuid = lookup.ouid;
    targetNickname = lookup.nickname || nickname;
  }

  if (!targetOuid) {
    const error = new Error('Provide nickname or ouid to sync match usage.');
    error.code = 'MISSING_TARGET_USER';
    throw error;
  }

  const matchIds = await getUserMatches({ ouid: targetOuid, matchtype, offset: 0, limit });
  let sampled = 0;
  let skipped = 0;

  for (const matchId of matchIds) {
    const exists = await MatchSample.exists({ matchId });
    if (exists) {
      skipped += 1;
      continue;
    }

    const detail = await getMatchDetail(matchId);
    const lineups = (detail.matchInfo || []).map(extractLineup);
    await MatchSample.create({
      matchId,
      matchType: Number(matchtype),
      sampledFromOuid: targetOuid,
      sampledFromNickname: targetNickname,
      matchDate: detail.matchDate ? new Date(detail.matchDate) : undefined,
      lineups,
      raw: detail,
      sampledAt: new Date(),
    });
    sampled += 1;
  }

  await rebuildUsageAggregates({ matchtype });

  return { targetOuid, targetNickname, requested: matchIds.length, sampled, skipped };
}

export async function rebuildUsageAggregates({ matchtype = 50 } = {}) {
  const samples = await MatchSample.find({ matchType: Number(matchtype) }).lean();
  const bucket = new Map();

  for (const sample of samples) {
    for (const lineup of sample.lineups || []) {
      for (const player of lineup.players || []) {
        const current = bucket.get(player.spid) || {
          spid: player.spid,
          usageCount: 0,
          matchCount: 0,
          winCount: 0,
          drawCount: 0,
          lossCount: 0,
          positions: new Map(),
          formations: new Map(),
          lastSeenAt: sample.matchDate || sample.sampledAt,
        };

        current.usageCount += 1;
        current.matchCount += 1;
        if (lineup.result === 'win') current.winCount += 1;
        if (lineup.result === 'draw') current.drawCount += 1;
        if (lineup.result === 'loss') current.lossCount += 1;
        if (player.position) current.positions.set(player.position, (current.positions.get(player.position) || 0) + 1);
        if (lineup.formation) current.formations.set(lineup.formation, (current.formations.get(lineup.formation) || 0) + 1);
        if (sample.matchDate && (!current.lastSeenAt || sample.matchDate > current.lastSeenAt)) {
          current.lastSeenAt = sample.matchDate;
        }

        bucket.set(player.spid, current);
      }
    }
  }

  const writes = Array.from(bucket.values()).map((item) => ({
    updateOne: {
      filter: { spid: item.spid, matchType: Number(matchtype), period: 'all', rankBucket: 'all' },
      update: {
        $set: {
          spid: item.spid,
          matchType: Number(matchtype),
          period: 'all',
          rankBucket: 'all',
          usageCount: item.usageCount,
          matchCount: item.matchCount,
          winCount: item.winCount,
          drawCount: item.drawCount,
          lossCount: item.lossCount,
          winRate: item.matchCount ? item.winCount / item.matchCount : 0,
          positions: Array.from(item.positions.entries()).map(([position, count]) => ({ position, count })),
          formations: Array.from(item.formations.entries()).map(([formation, count]) => ({ formation, count })),
          trendScore: item.usageCount,
          lastSeenAt: item.lastSeenAt,
          source: 'nexon-match',
        },
      },
      upsert: true,
    },
  }));

  if (writes.length > 0) {
    await PlayerUsageAggregate.bulkWrite(writes, { ordered: false });
  }

  return { aggregates: writes.length, samples: samples.length };
}

export async function getUsageDashboard({ matchtype = 50, limit = 20 } = {}) {
  const [topPlayers, sampleCount] = await Promise.all([
    PlayerUsageAggregate.find({ matchType: Number(matchtype) })
      .sort({ usageCount: -1, winRate: -1 })
      .limit(Number(limit))
      .lean(),
    MatchSample.countDocuments({ matchType: Number(matchtype) }),
  ]);

  return {
    apiKeyConfigured: Boolean(getApiKey()),
    matchType: Number(matchtype),
    sampleCount,
    topPlayers,
  };
}
