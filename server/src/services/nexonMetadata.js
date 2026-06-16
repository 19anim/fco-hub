import axios from 'axios';
import Player from '../models/Player.js';

const NEXON_STATIC_BASE = 'https://open.api.nexon.com/static/fconline/meta';
const DEFAULT_IMPORT_LIMIT = 5000;

function slugify(value) {
  return value
    .toString()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function deriveSeasonId(spid) {
  return Math.floor(Number(spid) / 1000000);
}

function derivePid(spid) {
  return Number(spid) % 1000000;
}

async function fetchJson(path) {
  const response = await axios.get(`${NEXON_STATIC_BASE}/${path}`, {
    responseType: 'json',
    timeout: 30000,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'fco-hub/1.0',
    },
  });
  return response.data;
}

export async function syncNexonPlayers({ limit = DEFAULT_IMPORT_LIMIT } = {}) {
  const [spids, seasons] = await Promise.all([
    fetchJson('spid.json'),
    fetchJson('seasonid.json'),
  ]);

  const seasonById = new Map(seasons.map((season) => [Number(season.seasonId), season]));
  const rows = spids.slice(0, Number(limit) || DEFAULT_IMPORT_LIMIT);
  const now = new Date();

  const operations = rows.map((player) => {
    const spid = Number(player.id);
    const seasonId = deriveSeasonId(spid);
    const pid = derivePid(spid);
    const season = seasonById.get(seasonId);
    const seasonName = season?.className ?? `Season ${seasonId}`;
    const slug = `${slugify(player.name)}-${spid}`;

    return {
      updateOne: {
        filter: { spid },
        update: {
          $set: {
            spid,
            pid,
            name: player.name,
            searchName: player.name,
            slug,
            seasonId,
            seasonName,
            seasonImg: season?.seasonImg ?? '',
            cardType: seasonName,
            dataSource: 'nexon-meta',
            syncedAt: now,
            isActive: true,
          },
          $setOnInsert: {
            position: '',
            imageUrl: '',
            marketPrice: null,
            overall: null,
          },
        },
        upsert: true,
      },
    };
  });

  if (operations.length > 0) {
    await Player.bulkWrite(operations, { ordered: false });
  }

  return {
    requested: rows.length,
    totalAvailable: spids.length,
    seasons: seasons.length,
    syncedAt: now,
  };
}

export async function getNexonMetadata() {
  const [seasons, positions] = await Promise.all([
    fetchJson('seasonid.json'),
    fetchJson('spposition.json'),
  ]);

  return {
    seasons: seasons.map((season) => ({
      seasonId: Number(season.seasonId),
      seasonName: season.className,
      seasonImg: season.seasonImg,
    })),
    positions: positions.map((position) => ({
      id: Number(position.spposition),
      desc: position.desc,
    })),
  };
}
