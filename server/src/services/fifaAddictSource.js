import axios from 'axios';
import * as cheerio from 'cheerio';
import Player from '../models/Player.js';
import PlayerAlias from '../models/PlayerAlias.js';
import PlayerEnrichment from '../models/PlayerEnrichment.js';
import FifaAddictSeason from '../models/FifaAddictSeason.js';
import SyncRun from '../models/SyncRun.js';
import { getNexonMetadata } from './nexonMetadata.js';
import {
  buildSearchVariants,
  classifyDiscoveryStop,
  groupUniqueNexonPlayers,
} from './fifaAddictDiscoveryDiagnostics.js';

const BASE_URL = 'https://vn.fifaaddict.com';
const IMAGE_BASE_URL = 'https://s1.fifaaddict.com/fo4/players';
const DEFAULT_LIMIT = Number(process.env.FIFAADDICT_SYNC_LIMIT_PER_RUN || 30);
const DEFAULT_DELAY_MS = Number(process.env.FIFAADDICT_CRAWL_DELAY_MS || 600);
const DEFAULT_NAMES_PER_RUN = Number(process.env.FIFAADDICT_NAMES_PER_RUN || 300);
const DEFAULT_API_DELAY_MS = Number(process.env.FIFAADDICT_API_DELAY_MS || 600);

let seasonMetaById = null;
async function getSeasonMetaById() {
  if (seasonMetaById) return seasonMetaById;
  try {
    const meta = await getNexonMetadata();
    seasonMetaById = new Map((meta.seasons || []).map((season) => [String(season.seasonId), season]));
  } catch {
    seasonMetaById = new Map();
  }
  return seasonMetaById;
}

function isWeakSeasonLabel(value) {
  const label = normalizeText(value || '');
  return !label || /^\d+$/.test(label);
}

async function applySeasonMeta(payload) {
  const seasonCode = String(payload.seasonCode || '');
  if (!seasonCode) return payload;
  const seasonMap = await getSeasonMetaById();
  const season = seasonMap.get(seasonCode);
  if (!season) return payload;

  const seasonName = isWeakSeasonLabel(payload.seasonName) && season.seasonName
    ? season.seasonName
    : payload.seasonName || season.seasonName || '';

  return {
    ...payload,
    seasonName,
    seasonImg: payload.seasonImg || season.seasonImg || '',
    cardType: payload.cardType || seasonName || '',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

const FIFAADDICT_LEAGUE_SLUGS = new Map([
  ['England Premier League', 'england-premier-league'],
  ['England Championship', 'england-championship'],
  ['Spain Primera Division', 'spain-la-liga'],
  ['LaLiga', 'spain-la-liga'],
  ['France Ligue 1', 'france-ligue-1'],
  ['France Ligue 2', 'france-ligue-2'],
  ['Germany Bundesliga', 'germany-bundesliga'],
  ['Germany 2. Bundesliga', 'germany-2-bundesliga'],
  ['Italy Serie A', 'italy-serie-a'],
  ['Italy Serie B', 'italy-serie-b'],
  ['Netherlands Eredivisie', 'netherlands-eredivisie'],
  ['Portugal Primeira Liga', 'portugal-primeira-liga'],
  ['United States Major League Soccer', 'united-states-major-league-soccer'],
  ['Korea Republic K League 1', 'korea-republic-k-league-1'],
  ['China PR Super League', 'china-pr-super-league'],
  ['National Team', 'national-team'],
  ['Rest of World', 'rest-of-world'],
]);

function slugifyFifaAddictLeague(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getFifaAddictLeagueSlug(league) {
  const normalized = normalizeText(league);
  return FIFAADDICT_LEAGUE_SLUGS.get(normalized) || slugifyFifaAddictLeague(normalized);
}

function toNumber(value) {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function absoluteUrl(value) {
  if (!value) return '';
  if (String(value).startsWith('//')) return `https:${value}`;
  if (String(value).startsWith('http')) return value;
  return `${BASE_URL}${value}`;
}

const KEY_STAT_LABELS = [
  'Tăng tốc',
  'Khéo léo',
  'Thăng bằng',
  'Bình tĩnh',
  'Rê bóng',
  'Dứt điểm',
  'Tốc độ',
  'Lực sút',
  'Sút xa',
  'Chuyền ngắn',
  'Tầm nhìn',
  'Tạt bóng',
  'Chuyền dài',
  'Đánh đầu',
  'Sức mạnh',
  'Thể lực',
];

const DETAILED_STAT_LABELS = [
  'Tăng tốc', 'Tốc độ', 'Dứt điểm', 'Lực sút', 'Sút xa', 'Chọn vị trí', 'Vô-lê', 'Penalty',
  'Chuyền ngắn', 'Tầm nhìn', 'Tạt bóng', 'Chuyền dài', 'Đá phạt', 'Sút xoáy',
  'Rê bóng', 'Giữ bóng', 'Khéo léo', 'Thăng bằng', 'Phản ứng', 'Bình tĩnh',
  'Cắt bóng', 'Đánh đầu', 'Kèm người', 'Lấy bóng', 'Xoạc bóng',
  'Sức mạnh', 'Thể lực', 'Quyết đoán', 'Nhảy',
  'TM đổ người', 'TM bắt bóng', 'TM phát bóng', 'TM phản xạ', 'TM chọn vị trí'
];

const GROUP_STAT_MAP = [
  { key: 'pace', labels: ['Tốc độ', 'Tăng tốc'] },
  { key: 'shooting', labels: ['Dứt điểm', 'Lực sút', 'Sút xa', 'Vô-lê', 'Penalty'] },
  { key: 'passing', labels: ['Chuyền ngắn', 'Tầm nhìn', 'Tạt bóng', 'Chuyền dài', 'Đá phạt', 'Sút xoáy'] },
  { key: 'dribbling', labels: ['Rê bóng', 'Giữ bóng', 'Khéo léo', 'Thăng bằng', 'Phản ứng', 'Bình tĩnh'] },
  { key: 'defending', labels: ['Kèm người', 'Lấy bóng', 'Cắt bóng', 'Xoạc bóng'] },
  { key: 'physical', labels: ['Đánh đầu', 'Sức mạnh', 'Thể lực', 'Quyết đoán', 'Nhảy'] },
];

function parsePrice(value = '') {
  const text = normalizeText(value);
  if (!text || text === '0') return { price: null, priceText: text || '' };
  const numeric = toNumber(text);
  if (numeric === null) return { price: null, priceText: text };
  if (text.includes('T')) return { price: numeric * 1000000000000, priceText: text };
  if (text.includes('B')) return { price: numeric * 1000000000, priceText: text };
  if (text.includes('M')) return { price: numeric * 1000000, priceText: text };
  return { price: numeric, priceText: text };
}

function uniqueStats(stats) {
  const byLabel = new Map();
  for (const stat of stats) {
    if (!stat?.labelVi || stat.value === null || stat.value === undefined) continue;
    byLabel.set(stat.labelVi, {
      key: stat.key || stat.labelVi.toLowerCase().replace(/\s+/g, '_'),
      labelVi: stat.labelVi,
      value: Number(stat.value),
    });
  }
  return [...byLabel.values()];
}

function parseStatsFromText(text, labels) {
  const normalized = normalizeText(text);
  const stats = [];
  for (const label of labels) {
    const match = normalized.match(new RegExp(`${escapeRegExp(label)}\\s*(\\d{1,3})`, 'i'));
    if (match) {
      stats.push({ key: label.toLowerCase().replace(/\s+/g, '_'), labelVi: label, value: Number(match[1]) });
    }
  }
  return uniqueStats(stats);
}

function deriveGroupStats(stats) {
  const byLabel = new Map(stats.map((stat) => [stat.labelVi, stat.value]));
  const result = {};
  for (const group of GROUP_STAT_MAP) {
    const values = group.labels.map((label) => byLabel.get(label)).filter((value) => Number.isFinite(value));
    if (values.length) result[group.key] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  return result;
}

function buildDataQuality(payload, extraWarnings = []) {
  const warnings = [...extraWarnings];
  if (!payload.imageUrl) warnings.push('missing-image');
  if (!payload.rawDescription) warnings.push('missing-description');
  if (!payload.keyStats?.length && !payload.detailedStats?.length) warnings.push('missing-stats');
  if (!payload.hiddenTraits?.length) warnings.push('missing-traits');

  const checks = [
    Boolean(payload.rawDescription),
    Boolean(payload.imageUrl),
    Boolean(payload.keyStats?.length || payload.detailedStats?.length),
    Boolean(payload.hiddenTraits?.length),
  ];

  return {
    hasDetail: checks[0],
    hasImage: checks[1],
    hasStats: checks[2],
    hasTraits: checks[3],
    score: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    warnings: [...new Set(warnings)],
  };
}

function parseTraits($) {
  const traitsDescription = [];
  $('.traitswrap .list').each((_, el) => {
    const name = normalizeText($(el).find('a').first().text());
    const description = normalizeText($(el).find('p').first().text());
    if (name) traitsDescription.push({ name, description });
  });

  return {
    hiddenTraits: traitsDescription.map((trait) => trait.name),
    traitsDescription,
  };
}

function parseStatsFromHtml($) {
  const stats = [];
  $('.attrwrap .attr').each((_, el) => {
    const label = normalizeText($(el).find('.name .textattr').text() || $(el).find('.name').text());
    const valueText = $(el).find('.value .textattr').text() || $(el).find('.value').text();
    const value = toNumber(valueText);
    if (label && value !== null && value > 0) {
      stats.push({
        key: label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        labelVi: label,
        value: value
      });
    }
  });
  return stats;
}

function parseMetaDescription(html) {
  const $ = cheerio.load(html);
  const description = normalizeText(
    $('meta[name="description"]').attr('content') || $('.fometa-desc').first().text() || ''
  );

  const detailedStats = parseStatsFromHtml($);
  const keyStats = parseStatsFromText(description, KEY_STAT_LABELS);

  // Merge stats, priority to detailed ones
  const allStats = uniqueStats([...detailedStats, ...keyStats]);
  const groupStats = deriveGroupStats(allStats);
  const traits = parseTraits($);

  const heightMatch = description.match(/chiều cao\s+(\d+)\s*cm/i);
  const weightMatch = description.match(/cân nặng\s+(\d+)\s*kg/i);
  const ageMatch = description.match(/,\s*(\d+)\s*tuổi/i);
  const ovrMatch = description.match(/OVR\s+(\d+)/i);
  const weakFootMatch = description.match(/chân không thuận\s+(\d+)/i);
  const skillMatch = description.match(/kỹ thuật\s+([★]+)/i);
  const positionMatch = description.match(/vị trí\s+([A-Z/]+)\s+cho/i);
  const clubMatch = description.match(/câu lạc bộ\s+(.+?)\s+thuộc giải/i);
  const leagueMatch = description.match(/thuộc giải\s+(.+?)\./i);
  const nationMatch = description.match(/người\s+(.+?)\s+hiện đang/i);
  const fullNameMatch = description.match(/^(.+?)\s+\(mùa giải/i);
  const seasonNameMatch = description.match(/\(mùa giải\s+(.+?),\s+sinh ngày/i);

  return {
    rawDescription: description,
    fullNameVi: normalizeText(fullNameMatch?.[1] || ''),
    seasonName: normalizeText(seasonNameMatch?.[1] || ''),
    overall: ovrMatch ? Number(ovrMatch[1]) : null,
    heightCm: heightMatch ? Number(heightMatch[1]) : null,
    weightKg: weightMatch ? Number(weightMatch[1]) : null,
    age: ageMatch ? Number(ageMatch[1]) : null,
    weakFoot: weakFootMatch ? Number(weakFootMatch[1]) : null,
    skillMoves: skillMatch ? skillMatch[1].length : null,
    bestPosition: positionMatch?.[1] || '',
    club: normalizeText(clubMatch?.[1] || ''),
    league: normalizeText(leagueMatch?.[1] || ''),
    nation: normalizeText(nationMatch?.[1] || ''),
    keyStats,
    detailedStats,
    hiddenTraits: traits.hiddenTraits,
    traitsDescription: traits.traitsDescription,
    ...groupStats,
  };
}

function parseRows(html, limit) {
  const $ = cheerio.load(html);
  const rows = [];

  $('tbody tr').each((_, row) => {
    if (rows.length >= limit) return false;

    const $row = $(row);
    const link = $row.find('a.player-name').first();
    const href = link.attr('href');
    const name = normalizeText(link.text());
    if (!href || !name) return;

    const sourceUid = href.replace('/fo4db/pid', '').replace(/^.*pid/, '');
    const imageUrl = absoluteUrl($row.find('img.thumb').attr('src') || '');
    const seasonImg = absoluteUrl(link.find('img[class*="badgedss"], img').first().attr('src') || '');
    const seasonClass = link.find('img[class*="badgedss"]').attr('class') || '';
    const seasonCode = seasonClass.match(/(?:^|\s)y(\d+)/)?.[1] || '';
    const priceText = normalizeText($row.find('td.pricekrhide').first().text() || $row.find('.pricekr').first().text());
    const { price } = parsePrice(priceText);
    const salary = toNumber($row.find('td.fp').first().text());
    const overall = toNumber($row.find('td.ovr').first().text());
    const stamina = toNumber($row.find('td.stamina').first().text());
    const positions = [];

    $row.find('.poswrap .pos').each((__, posEl) => {
      const position = normalizeText($(posEl).find('b').text());
      const posOverall = toNumber($(posEl).find('i').text());
      if (position) positions.push({ position, overall: posOverall });
    });

    const bestPosition = normalizeText($row.find('.pos_rec .posstyle').text()) || positions[0]?.position || '';
    const teamNames = [];
    $row.find('.crestswrap img').each((__, img) => {
      const title = normalizeText($(img).attr('title') || '');
      if (title) teamNames.push(title.replace(/\s*FO4 Team\s*$/i, ''));
    });

    const stats = stamina ? [{ key: 'stamina', labelVi: 'Thể lực', value: stamina }] : [];
    rows.push({
      sourceUid,
      sourceUrl: `${BASE_URL}${href}`,
      displayNameVi: name,
      displayNameEn: name,
      seasonCode,
      seasonName: '',
      seasonImg,
      imageUrl,
      positions,
      bestPosition,
      overall,
      salary,
      fp: salary,
      price,
      priceText,
      stats,
      keyStats: stats,
      club: teamNames[0] || '',
      nation: teamNames[1] || '',
      raw: { href, teamNames },
    });
  });

  return rows;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// ── X-ARAIWA token handshake (anti-bot bypass) ──────────────────────────────
// The site issues a token AND a session cookie via /api2?rq=araiwa. Both must
// be replayed on the protected /api2?fo4pid=... endpoint.
let araiwaToken = null;
let araiwaCookie = '';
let araiwaTokenAt = 0;

function randomKey() {
  let s = '';
  const chars = 'abcdef0123456789';
  for (let i = 0; i < 32; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function extractCookies(setCookieHeader) {
  if (!setCookieHeader) return '';
  const arr = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return arr.map((c) => String(c).split(';')[0]).join('; ');
}

const SQUADMAKER_BASE_URL = 'https://fifaaddict.com/fco-squadmaker';

let squadmakerToken = null;
let squadmakerCookie = '';
let squadmakerTokenAt = 0;

export async function getSquadmakerRequestToken(axiosClient = axios, force = false) {
  const useCache = axiosClient === axios;
  if (useCache && !force && squadmakerToken && Date.now() - squadmakerTokenAt < 20 * 60 * 1000) {
    return { token: squadmakerToken, cookie: squadmakerCookie };
  }

  const resp = await axiosClient.get(`${SQUADMAKER_BASE_URL}/api_bootstrap.php`, {
    params: { lang: 'vn', v: '20260605-1' },
    timeout: 30000,
    headers: { 'User-Agent': UA, Referer: `${SQUADMAKER_BASE_URL}/` },
  });

  const match = String(resp.data || '').match(/requestToken"\s*:\s*"([a-z0-9]+)"/i);
  const token = match ? match[1] : '';
  const cookie = extractCookies(resp.headers?.['set-cookie']);

  if (useCache && token) {
    squadmakerToken = token;
    squadmakerCookie = cookie;
    squadmakerTokenAt = Date.now();
  }

  return { token, cookie };
}

export async function fetchFifaAddictUicByName(name, { limit = 10, seasonCode = '', axiosClient = axios } = {}) {
  const query = normalizeText(name);
  if (!query) return [];

  const { token, cookie } = await getSquadmakerRequestToken(axiosClient);
  if (!token) return [];

  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const cleanSeasonCode = String(seasonCode || '').trim();
  if (cleanSeasonCode) {
    params.set('season_ids', cleanSeasonCode);
    params.set('servers', 'vn');
  }
  const resp = await axiosClient.post(`${SQUADMAKER_BASE_URL}/api_search.php`, params.toString(), {
    timeout: 30000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Squadmaker-Token': token,
      Referer: `${SQUADMAKER_BASE_URL}/`,
      'User-Agent': UA,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  const results = Array.isArray(resp.data?.results) ? resp.data.results : [];
  return results
    .map((row) => ({ uid: String(row?.uid || ''), uic: String(row?.uic || '') }))
    .filter((row) => row.uid && row.uic);
}

async function getAraiwaToken(force = false) {
  if (!force && araiwaToken && Date.now() - araiwaTokenAt < 4 * 60 * 1000) {
    return araiwaToken;
  }
  const key = randomKey();
  const resp = await axios.get(`${BASE_URL}/api2?rq=araiwa&t=${key}`, {
    timeout: 30000,
    withCredentials: true,
    headers: {
      'Cache-Control': 'no-store',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${BASE_URL}/fo4db`,
      'User-Agent': UA,
    },
  });
  const token = typeof resp.data === 'string' ? resp.data.trim() : '';
  if (token && token.length >= 10) {
    araiwaToken = token;
    araiwaCookie = extractCookies(resp.headers['set-cookie']);
    araiwaTokenAt = Date.now();
  }
  return araiwaToken;
}

async function fetchProtectedApi2(params, referer = `${BASE_URL}/fo4db`, retry = 0) {
  const token = await getAraiwaToken(retry > 0);
  if (!token) throw new Error('Could not obtain X-ARAIWA token');

  try {
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-ARAIWA': token,
      Referer: referer,
      'User-Agent': UA,
    };
    if (araiwaCookie) headers.Cookie = araiwaCookie;

    const resp = await axios.get(`${BASE_URL}/api2`, {
      params,
      timeout: 30000,
      withCredentials: true,
      headers,
    });
    return resp.data;
  } catch (error) {
    const status = error.response?.status;
    if ((status === 401 || status === 403) && retry < 2) {
      await sleep(2000);
      return fetchProtectedApi2(params, referer, retry + 1);
    }
    throw error;
  }
}

function parseFifaAddictTeamInfo(data) {
  if (!data || typeof data !== 'object') return [];
  return Object.values(data)
    .map((team) => normalizeText(team?.text || team?.name || ''))
    .filter((team) => team && team !== '▾ Đội');
}

export async function fetchFifaAddictTeamsByLeague(league) {
  const slug = getFifaAddictLeagueSlug(league);
  if (!slug) return [];
  const data = await fetchProtectedApi2({ q: 'fo4info', league: slug, locale: 'vn' });
  return [...new Set(parseFifaAddictTeamInfo(data))];
}

// Fetch player detail JSON via the protected fo4pid endpoint
async function fetchPlayerJson(sourceUid, retry = 0) {
  const token = await getAraiwaToken(retry > 0);
  if (!token) throw new Error('Could not obtain X-ARAIWA token');

  try {
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-ARAIWA': token,
      Referer: `${BASE_URL}/fo4db/pid${sourceUid}`,
      'User-Agent': UA,
    };
    if (araiwaCookie) headers.Cookie = araiwaCookie;

    const resp = await axios.get(`${BASE_URL}/api2?fo4pid=pid${sourceUid}&locale=vn`, {
      timeout: 30000,
      withCredentials: true,
      headers,
    });
    if (!resp.data || typeof resp.data !== 'object') {
      throw new Error('Empty JSON response (token/cookie may be stale)');
    }
    return resp.data;
  } catch (error) {
    const status = error.response?.status;
    if ((status === 401 || status === 403 || error.message.includes('stale')) && retry < 2) {
      await sleep(2000);
      return fetchPlayerJson(sourceUid, retry + 1);
    }
    throw error;
  }
}

async function fetchHtml(url) {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        Referer: 'https://vn.fifaaddict.com/',
        'User-Agent': UA,
      },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 429) {
      await sleep(5000);
    }
    throw error;
  }
}

// Fetch one page (100 rows) of the protected fo4db list API.
// Optional year param to filter by season.
async function fetchListPage(page, year = '', retry = 0) {
  const token = await getAraiwaToken(retry > 0);
  if (!token) throw new Error('Could not obtain X-ARAIWA token');
  try {
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-ARAIWA': token,
      Referer: `${BASE_URL}/fo4db`,
      'User-Agent': UA,
    };
    if (araiwaCookie) headers.Cookie = araiwaCookie;

    // Try without year filter first, then with year if specified
    const url = year
      ? `${BASE_URL}/api2?q=fo4db&page=${page}&year=${year}&order=ovr&locale=vn`
      : `${BASE_URL}/api2?q=fo4db&page=${page}&order=ovr&locale=vn`;
    const resp = await axios.get(url, {
      timeout: 30000,
      withCredentials: true,
      headers,
    });
    const rows = resp.data?.db;
    if (!Array.isArray(rows)) throw new Error('No db array in list response');
    return rows;
  } catch (error) {
    const status = error.response?.status;
    if ((status === 401 || status === 403) && retry < 3) {
      await sleep(2500);
      return fetchListPage(page, retry + 1);
    }
    throw error;
  }
}

// Fetch one page of the protected fo4db list API for a given season `class`,
// optionally continuing from a previous page via `spos=ovr_0-{pos1val}`.
// This is the new, more reliable pagination strategy: instead of `page=N`
// (which can repeat/skip data), each round asks for "OVR below the last seen
// player's top position rating", so the next round always starts right after
// where the previous one ended.
async function fetchSeasonPage(seasonValue, spos = null, retry = 0) {
  const token = await getAraiwaToken(retry > 0);
  if (!token) throw new Error('Could not obtain X-ARAIWA token');
  try {
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-ARAIWA': token,
      Referer: `${BASE_URL}/fo4db`,
      'User-Agent': UA,
    };
    if (araiwaCookie) headers.Cookie = araiwaCookie;

    const url = spos !== null && spos !== undefined
      ? `${BASE_URL}/api2?q=fo4db&sv=vn&class=${seasonValue}&spos=ovr_0-${spos}&locale=vn`
      : `${BASE_URL}/api2?q=fo4db&sv=vn&class=${seasonValue}&locale=vn`;
    const resp = await axios.get(url, {
      timeout: 30000,
      withCredentials: true,
      headers,
    });
    const rows = resp.data?.db;
    if (!Array.isArray(rows)) throw new Error('No db array in season list response');
    return rows;
  } catch (error) {
    const status = error.response?.status;
    if ((status === 401 || status === 403) && retry < 3) {
      await sleep(2500);
      return fetchSeasonPage(seasonValue, spos, retry + 1);
    }
    throw error;
  }
}

// FIFAAddict stores each attribute as a direct property on the player db object,
// keyed by these canonical names (the "ovr" attribute order from their JS bundle).
const ATTR_DEFS = [
  { key: 'sprintspeed', labelVi: 'Tốc độ' },
  { key: 'acceleration', labelVi: 'Tăng tốc' },
  { key: 'finishing', labelVi: 'Dứt điểm' },
  { key: 'shotpower', labelVi: 'Lực sút' },
  { key: 'longshots', labelVi: 'Sút xa' },
  { key: 'positioning', labelVi: 'Chọn vị trí' },
  { key: 'volleys', labelVi: 'Vô-lê' },
  { key: 'penalties', labelVi: 'Penalty' },
  { key: 'shortpassing', labelVi: 'Chuyền ngắn' },
  { key: 'vision', labelVi: 'Tầm nhìn' },
  { key: 'crossing', labelVi: 'Tạt bóng' },
  { key: 'longpassing', labelVi: 'Chuyền dài' },
  { key: 'freekickaccuracy', labelVi: 'Đá phạt' },
  { key: 'curve', labelVi: 'Sút xoáy' },
  { key: 'dribbling', labelVi: 'Rê bóng' },
  { key: 'ballcontrol', labelVi: 'Giữ bóng' },
  { key: 'agility', labelVi: 'Khéo léo' },
  { key: 'balance', labelVi: 'Thăng bằng' },
  { key: 'reactions', labelVi: 'Phản ứng' },
  { key: 'marking', labelVi: 'Kèm người' },
  { key: 'standingtackle', labelVi: 'Lấy bóng' },
  { key: 'interceptions', labelVi: 'Cắt bóng' },
  { key: 'headingaccuracy', labelVi: 'Đánh đầu' },
  { key: 'slidingtackle', labelVi: 'Xoạc bóng' },
  { key: 'strength', labelVi: 'Sức mạnh' },
  { key: 'stamina', labelVi: 'Thể lực' },
  { key: 'aggression', labelVi: 'Quyết đoán' },
  { key: 'jumping', labelVi: 'Nhảy' },
  { key: 'composure', labelVi: 'Bình tĩnh' },
  { key: 'gkdiving', labelVi: 'TM đổ người' },
  { key: 'gkhandling', labelVi: 'TM bắt bóng' },
  { key: 'gkkicking', labelVi: 'TM phát bóng' },
  { key: 'gkreflexes', labelVi: 'TM phản xạ' },
  { key: 'gkpositioning', labelVi: 'TM chọn vị trí' },
];

// Top-level `attr` object: { sprintspeed: { name, value }, ... } (all 34 attrs)
function extractDetailedStatsFromJson(attr, boost = 0) {
  if (!attr || typeof attr !== 'object') return [];
  return ATTR_DEFS
    .map(({ key, labelVi }) => {
      const node = attr[key];
      const baseValue = node && typeof node === 'object' ? Number(node.value) : Number(node);
      const value = (Number(baseValue) || 0) + boost;
      return { key, labelVi: (node && node.name) || labelVi, value };
    })
    .filter((s) => s.value > 0);
}

function extractTraitsFromJson(payload) {
  // payload.traits is keyed by slug → { id, name, desc }
  const traits = payload.traits || {};
  const traitsDescription = Object.entries(traits)
    .filter(([, t]) => t && t.name)
    .map(([slug, t]) => {
      const id = t.id ? String(t.id) : '';
      return {
        name: normalizeText(t.name),
        description: normalizeText(t.desc || ''),
        id,
        slug,
        iconUrl: id ? `https://s1.fifaaddict.com/fo4/traits/trait_icon_${id}.png` : '',
      };
    });
  return {
    hiddenTraits: traitsDescription.map((t) => t.name),
    traitsDescription,
  };
}

// Parse OVR cho từng vị trí từ db.postlist (object keyed 1..N).
function extractPositionRatings(postlist, boost = 0) {
  if (!postlist || typeof postlist !== 'object') return [];
  const ratingBoost = Math.max(0, Number(boost) || 0);
  return Object.values(postlist)
    .filter((p) => p && p.name && p.name !== 'ovr')
    .map((p) => ({
      code: String(p.text || p.name || '').toUpperCase(),
      label: String(p.text || p.name || ''),
      value: (Number(p.value) || 0) + ratingBoost,
      recommended: Boolean(p.rec_direction),
    }))
    .filter((p) => p.value > 0);
}

export function getDetailDb(payload) {
  return { ...(payload?.db || {}), ...(payload?.pre || {}) };
}

function isClubCareerCollection(value) {
  return Array.isArray(value) || (value && typeof value === 'object');
}

export function getClubCareerSource(payload) {
  const preCareer = payload?.pre?.clubcareer;
  const dbCareer = payload?.db?.clubcareer;
  if (isClubCareerCollection(preCareer)) return preCareer;
  if (isClubCareerCollection(dbCareer)) return dbCareer;
  return [];
}

export function extractClubCareer(clubcareer) {
  const entries = Array.isArray(clubcareer)
    ? clubcareer
    : clubcareer && typeof clubcareer === 'object'
      ? Object.values(clubcareer)
      : [];

  return entries
    .map((c) => ({
      team: normalizeText(c.team_name || c.team || c.name || c.teamname || ''),
      teamId: String(c.team_id || c.teamId || ''),
      season: normalizeText(c.season || c.year || ''),
    }))
    .filter((c) => c.team);
}

async function fetchApi(params) {
  const response = await axios.get(`${BASE_URL}/api2`, {
    params,
    timeout: 30000,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${BASE_URL}/fo4db`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    },
  });
  return response.data || null;
}

function apiRowToEnrichment(row) {
  const positions = [];
  for (const index of [1, 2, 3, 4]) {
    const position = normalizeText(String(row[`pos${index}`] || ''));
    if (!position) continue;
    const overall = toNumber(row[`pos${index}val`]);
    positions.push({ position, overall });
  }

  const { price, priceText } = parsePrice(String(row.pricekr ?? ''));
  const salary = toNumber(row.attrA);
  const overall = toNumber(row.attrB);
  const stamina = toNumber(row.attrC);
  const stats = stamina !== null ? [{ key: 'stamina', labelVi: 'Thể lực', value: stamina }] : [];
  const payload = {
    sourceUid: String(row.uid),
    sourceUrl: `${BASE_URL}/fo4db/pid${row.uid}`,
    displayNameVi: normalizeText(row.name || ''),
    displayNameEn: normalizeText(row.name || ''),
    seasonCode: String(row.year ?? ''),
    seasonName: normalizeText(row.year_short || ''),
    seasonImg: absoluteUrl(row.year_icon || row.seasonImg || ''),
    imageUrl: `${IMAGE_BASE_URL}/${row.uid}.png`,
    positions,
    bestPosition: normalizeText(row.pos || '') || positions[0]?.position || '',
    ovrByPosition: Object.fromEntries(
      positions.filter((item) => item.position).map((item) => [item.position, item.overall])
    ),
    overall,
    salary,
    fp: salary,
    price,
    priceText,
    stats,
    keyStats: stats,
    skillMoves: toNumber(row.skill_level),
    club: normalizeText(row.team_name || ''),
    raw: row,
    syncedAt: new Date(),
  };
  payload.dataQuality = buildDataQuality(payload);
  return payload;
}

function detailPayloadToEnrichment(payload, sourceUid) {
  const db = getDetailDb(payload);
  const row = {
    ...db,
    uid: db.uid || sourceUid,
    year: db.year,
    year_short: db.year_short || db.class || '',
    attrA: db.salary || db.attrA,
    attrB: db.current_ovr || db.attrB,
    attrC: db.stamina || db.attrC,
    pricekr: db.pricekr,
  };

  const enrichment = apiRowToEnrichment(row);
  const boost = Number(db.all_statchange || db.update_statchange || 0);
  const detailedStats = extractDetailedStatsFromJson(payload.attr, boost);
  const traits = extractTraitsFromJson(payload);
  const meta = payload.meta || {};

  const detailUpdate = {
    ...enrichment,
    detailedStats,
    keyStats: detailedStats.length ? detailedStats.slice(0, 16) : enrichment.keyStats,
    hiddenTraits: traits.hiddenTraits,
    traitsDescription: traits.traitsDescription,
    positionRatings: extractPositionRatings(db.postlist, boost),
    clubCareer: extractClubCareer(getClubCareerSource(payload)),
    rawDescription: normalizeText(meta.desc || db.desc || ''),
    lastDetailSyncedAt: new Date(),
    syncedAt: new Date(),
    parseWarnings: detailedStats.length ? [] : ['missing-detail-stats'],
  };

  const ag = db.attrgroup;
  if (ag && Array.isArray(ag.data) && ag.data.length >= 6) {
    [detailUpdate.pace, detailUpdate.shooting, detailUpdate.passing, detailUpdate.dribbling, detailUpdate.defending, detailUpdate.physical] =
      ag.data.map((n) => Number(n) || null);
  } else if (detailedStats.length) {
    Object.assign(detailUpdate, deriveGroupStats(detailedStats));
  }

  if (db.height) detailUpdate.heightCm = Number(db.height);
  if (db.weight) detailUpdate.weightKg = Number(db.weight);
  if (db.age) detailUpdate.age = Number(db.age);
  if (db.foot_weak) detailUpdate.weakFoot = Number(db.foot_weak);
  if (db.skill_level) detailUpdate.skillMoves = Number(db.skill_level);
  if (db.foot_pref) detailUpdate.preferredFoot = db.foot_pref;
  if (db.workrate_att) detailUpdate.workRateAttack = String(db.workrate_att);
  if (db.workrate_def) detailUpdate.workRateDefense = String(db.workrate_def);
  if (db.reputation) detailUpdate.reputation = db.reputation;
  if (db.birthdate) detailUpdate.birthDateText = db.birthdate;
  if (db.league_name) detailUpdate.league = db.league_name;
  if (db.nation_name) detailUpdate.nation = db.nation_name;
  if (db.team_name) detailUpdate.club = db.team_name;

  detailUpdate.dataQuality = buildDataQuality(detailUpdate, detailUpdate.parseWarnings);
  return detailUpdate;
}

function extractRelatedUids(payload) {
  const relate = payload.dbrelate || payload.db?.dbrelate || payload.pre?.dbrelate || [];
  if (!Array.isArray(relate)) return [];
  return [...new Set(relate.map((row) => String(row.uid || '')).filter(Boolean))];
}

export async function searchFifaAddictCards(name) {
  try {
    const data = await fetchApi({ q: 'fo4db', playername: name, sv: 'vn', locale: 'vn' });
    if (!data || !Array.isArray(data.db)) return [];
    return data.db.filter((row) => row && row.uid && row.name).map(apiRowToEnrichment);
  } catch (error) {
    if (error.response?.status === 401) return [];
    throw error;
  }
}

async function upsertEnrichmentRow(payload) {
  const withSeasonMeta = await applySeasonMeta(payload);
  const merged = {
    ...withSeasonMeta,
    dataQuality: withSeasonMeta.dataQuality || buildDataQuality(withSeasonMeta),
  };
  return PlayerEnrichment.findOneAndUpdate(
    { source: 'fifaaddict-vn', sourceUid: merged.sourceUid },
    { $set: merged },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertAlias({ enrichment, player, confidence, reason }) {
  return PlayerAlias.findOneAndUpdate(
    { source: 'fifaaddict-vn', sourceUid: enrichment.sourceUid, spid: player.spid },
    {
      $set: {
        playerId: player._id,
        spid: player.spid,
        pid: player.pid,
        confidence,
        reason,
        status: 'matched',
        enrichmentId: enrichment._id,
        source: 'fifaaddict-vn',
        sourceUid: enrichment.sourceUid,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function enrichCardsForName(name, players) {
  const cards = await searchFifaAddictCards(name);
  let upserted = 0;
  let matched = 0;

  const playersBySeason = new Map();
  for (const player of players) {
    if (!playersBySeason.has(player.seasonId)) playersBySeason.set(player.seasonId, []);
    playersBySeason.get(player.seasonId).push(player);
  }

  for (const card of cards) {
    const enrichment = await upsertEnrichmentRow(card);
    upserted += 1;

    const seasonPlayers = playersBySeason.get(Number(card.seasonCode)) || [];
    for (const player of seasonPlayers) {
      await upsertAlias({
        enrichment,
        player,
        confidence: seasonPlayers.length === 1 ? 0.9 : 0.7,
        reason: 'api-name-search-and-season',
      });
      matched += 1;
    }
  }

  return { cards: cards.length, upserted, matched };
}

let bulkSyncRunning = false;

export function isBulkSyncRunning() {
  return bulkSyncRunning;
}

export async function syncFifaAddictAll({
  limit = DEFAULT_NAMES_PER_RUN,
  delayMs = DEFAULT_API_DELAY_MS,
  onlyMissing = true,
} = {}) {
  if (bulkSyncRunning) {
    throw new Error('A FIFAAddict bulk sync is already running.');
  }

  const matchedSpids = onlyMissing
    ? new Set((await PlayerAlias.find({ source: 'fifaaddict-vn', status: 'matched' }).distinct('spid')))
    : new Set();

  const allPlayers = await Player.find({ isActive: true })
    .select('spid pid name searchName seasonId')
    .lean();

  const playersByName = new Map();
  for (const player of allPlayers) {
    const key = normalizeText(player.name || '').toLowerCase();
    if (!key) continue;
    if (!playersByName.has(key)) playersByName.set(key, []);
    playersByName.get(key).push(player);
  }

  const pendingNames = [...playersByName.entries()]
    .filter(([, players]) => players.some((player) => !matchedSpids.has(player.spid)))
    .map(([name]) => name)
    .slice(0, Number(limit) || DEFAULT_NAMES_PER_RUN);

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: pendingNames.length,
    message: `Bulk sync: ${pendingNames.length} names queued (${playersByName.size} total names)`,
  });

  bulkSyncRunning = true;

  const job = (async () => {
    let processed = 0;
    let failed = 0;
    let totalCards = 0;
    let totalMatched = 0;
    const errors = [];

    try {
      for (const name of pendingNames) {
        try {
          const result = await enrichCardsForName(name, playersByName.get(name));
          totalCards += result.upserted;
          totalMatched += result.matched;
          processed += 1;
        } catch (error) {
          failed += 1;
          if (errors.length < 20) errors.push(`${name}: ${error.message}`);
        }

        if (processed % 10 === 0) {
          await SyncRun.findByIdAndUpdate(run._id, {
            $set: {
              processed,
              failed,
              message: `Bulk sync: ${processed}/${pendingNames.length} names, ${totalCards} cards, ${totalMatched} matches`,
            },
          }).catch(() => {});
        }

        if (delayMs > 0) await sleep(delayMs);
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: failed === pendingNames.length && pendingNames.length > 0 ? 'failed' : 'success',
          finishedAt: new Date(),
          processed,
          updated: totalCards,
          failed,
          errors,
          message: `Bulk sync done: ${processed}/${pendingNames.length} names, ${totalCards} cards, ${totalMatched} matches`,
        },
      });
    } catch (error) {
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: error.message, errors: [error.message] },
      }).catch(() => {});
    } finally {
      bulkSyncRunning = false;
    }
  })();

  job.catch(() => {});

  return {
    runId: run._id,
    queuedNames: pendingNames.length,
    totalNames: playersByName.size,
    note: 'Bulk sync runs in the background. Poll /api/enrichment/status for progress.',
  };
}

export async function debugFetchPlayerJson(sourceUid) {
  return fetchPlayerJson(sourceUid);
}

export async function ensureEnrichmentDetail(enrichmentDoc, { force = false } = {}) {
  if (!enrichmentDoc?.sourceUid) return enrichmentDoc;

  // Already has valid stats AND has traits data?
  const hasValidStats = (enrichmentDoc.detailedStats || []).some((s) => s.value > 0);
  const hasTraits = Array.isArray(enrichmentDoc.hiddenTraits) && enrichmentDoc.hiddenTraits.length > 0;
  if (hasValidStats && hasTraits && !force) return enrichmentDoc;

  // Fetch via protected JSON API (real stats live here, HTML only has zeros)
  const payload = await fetchPlayerJson(enrichmentDoc.sourceUid);
  const db = getDetailDb(payload);
  if (!db || typeof db !== 'object') throw new Error('No player db in JSON response');

  // Extract boost (usually 3) to match displayed stats on website
  const boost = Number(db.all_statchange || db.update_statchange || 0);

  // The 34 attributes live in the top-level `attr` object, not in `pre`.
  const detailedStats = extractDetailedStatsFromJson(payload.attr, boost);
  if (!detailedStats.length) throw new Error('No non-zero stats parsed from JSON');

  const traits = extractTraitsFromJson(payload);
  const meta = payload.meta || {};

  const update = {
    detailedStats,
    keyStats: detailedStats.slice(0, 16),
    hiddenTraits: traits.hiddenTraits,
    traitsDescription: traits.traitsDescription,
    positionRatings: extractPositionRatings(db.postlist, boost),
    clubCareer: extractClubCareer(getClubCareerSource(payload)),
    rawDescription: normalizeText(meta.desc || db.desc || ''),
    parseWarnings: [],
    lastDetailSyncedAt: new Date(),
    syncedAt: new Date(),
  };

  // Group stats: prefer FIFAAddict's pre-computed attrgroup, else derive
  const ag = db.attrgroup;
  if (ag && Array.isArray(ag.data) && ag.data.length >= 6) {
    [update.pace, update.shooting, update.passing, update.dribbling, update.defending, update.physical] =
      ag.data.map((n) => Number(n) || null);
  } else {
    const groupStats = deriveGroupStats(detailedStats);
    for (const [k, v] of Object.entries(groupStats)) update[k] = v;
  }

  // Profile fields from db
  if (db.height) update.heightCm = Number(db.height);
  if (db.weight) update.weightKg = Number(db.weight);
  if (db.age) update.age = Number(db.age);
  if (db.foot_weak) update.weakFoot = Number(db.foot_weak);
  if (db.skill_level && !enrichmentDoc.skillMoves) update.skillMoves = Number(db.skill_level);
  if (db.foot_pref) update.preferredFoot = db.foot_pref;
  if (db.workrate_att) update.workRateAttack = String(db.workrate_att);
  if (db.workrate_def) update.workRateDefense = String(db.workrate_def);
  if (db.reputation) update.reputation = db.reputation;
  if (db.birthdate) update.birthDateText = db.birthdate;
  if (db.season_full && !enrichmentDoc.seasonName) update.seasonName = db.season_full;
  if (db.league_name && !enrichmentDoc.league) update.league = db.league_name;
  if (db.nation_name && !enrichmentDoc.nation) update.nation = db.nation_name;
  if (db.team_name && !enrichmentDoc.club) update.club = db.team_name;

  update.dataQuality = buildDataQuality({ ...enrichmentDoc, ...update }, []);

  return PlayerEnrichment.findByIdAndUpdate(enrichmentDoc._id, { $set: update }, { new: true });
}

// ── Full discovery: page through the list API, upsert every player ──────────
let discoverRunning = false;
export function isDiscoverRunning() { return discoverRunning; }

export async function discoverAllPlayers({ delayMs = DEFAULT_API_DELAY_MS, maxPages = 5 } = {}) {
  if (discoverRunning) throw new Error('Discovery already running.');
  discoverRunning = true;

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    message: 'Discovery: đang chuẩn bị quét toàn bộ các mùa giải…',
  });

  (async () => {
    try {
      const meta = await getNexonMetadata();
      const seasons = meta.seasons || [];
      const seenUids = new Set();
      let totalProcessed = 0;
      let totalUpserted = 0;
      let totalFailed = 0;

      for (let sIdx = 0; sIdx < seasons.length; sIdx++) {
        const season = seasons[sIdx];
        const year = String(season.seasonId || '');
        let consecutiveEmptyPages = 0;
        let consecutiveDuplicatePages = 0;
        let newInSeason = 0;

        for (let page = 1; page <= maxPages; page++) {
          await SyncRun.findByIdAndUpdate(run._id, {
            $set: {
              message: `Discovery: Đang quét ${season.seasonName} (Mùa ${sIdx+1}/${seasons.length}), trang ${page}... (${newInSeason} mới trong mùa này)`,
              processed: seenUids.size,
              requested: 12000 // Ước tính tổng số cầu thủ
            }
          }).catch(() => {});

          let rows;
          try {
            rows = await fetchListPage(page, year);
            console.log(`[Discovery] Season ${season.seasonName} page ${page}: fetched ${rows.length} rows`);
          } catch (err) {
            console.error(`[Discovery ERROR] Page ${page} year ${year}: ${err.message} (status: ${err.response?.status})`);
            totalFailed += 1;
            // Refresh token nếu bị 401/403
            if (err.response?.status === 401 || err.response?.status === 403) {
              console.log('[Discovery] Token expired, refreshing...');
              await getAraiwaToken(true);
            }
            await sleep(delayMs * 5); // Nghỉ lâu hơn nếu bị lỗi
            continue;
          }

          if (!rows || !rows.length) {
            consecutiveEmptyPages++;
            console.log(`[Discovery] Season ${season.seasonName} page ${page}: EMPTY (${consecutiveEmptyPages}/3)`);
            if (consecutiveEmptyPages >= 3) {
              console.log(`[Discovery] Season ${season.seasonName}: 3 consecutive empty pages, moving to next season`);
              break; // 3 trang liên tiếp trống → hết mùa này
            }
            continue;
          }

          consecutiveEmptyPages = 0; // Reset counter khi có data
          let newInPage = 0;
          let duplicatesInPage = 0;
          let skippedInPage = 0;

          for (const row of rows) {
            const uid = String(row.uid || '');
            if (!uid) continue;

            // Check if this exact card (UID + season) already exists in DB
            const enrichment = apiRowToEnrichment(row);
            const exists = await PlayerEnrichment.findOne({
              source: 'fifaaddict-vn',
              sourceUid: uid,
              seasonCode: enrichment.seasonCode
            }).lean();

            if (!exists) {
              // Track globally to update progress
              if (!seenUids.has(uid)) {
                seenUids.add(uid);
              }
              newInPage++;
              newInSeason++;
              try {
                await upsertEnrichmentRow(enrichment);
                totalUpserted += 1;
              } catch (err) {
                console.error(`[Discovery] Failed to upsert ${uid}: ${err.message}`);
                totalFailed += 1;
              }
            } else {
              skippedInPage++;
            }
          }

          console.log(`[Discovery] Season ${season.seasonName} page ${page}: ${newInPage} new, ${skippedInPage} already in DB, total unique: ${seenUids.size}`);
          totalProcessed = seenUids.size;

          // Track consecutive duplicate pages (API bug: same data on every page)
          if (newInPage === 0 && skippedInPage > 0) {
            consecutiveDuplicatePages++;
            console.log(`[Discovery] Season ${season.seasonName}: ${consecutiveDuplicatePages} consecutive duplicate pages`);
            if (consecutiveDuplicatePages >= 3) {
              console.log(`[Discovery] Season ${season.seasonName}: API returning duplicate data, moving to next season`);
              break;
            }
          } else {
            consecutiveDuplicatePages = 0; // Reset khi có data mới
          }

          if (delayMs > 0) await sleep(delayMs);

          // Chỉ dừng nếu API trả về ít hơn 50 rows (gần hết data)
          if (rows.length < 50) {
            console.log(`[Discovery] Season ${season.seasonName} page ${page}: only ${rows.length} rows, likely end of season`);
            break;
          }
        }

        console.log(`[Discovery] Season ${season.seasonName} complete: ${newInSeason} new players found`);
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: 'success',
          finishedAt: new Date(),
          processed: seenUids.size,
          updated: totalUpserted,
          failed: totalFailed,
          message: `✓ Discovery hoàn tất: Đã quét ${seasons.length} mùa, tìm thấy ${seenUids.size} cầu thủ.`,
        }
      });
    } catch (error) {
      console.error('Discovery error:', error);
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: `Lỗi Discovery: ${error.message}` }
      }).catch(() => {});
    } finally {
      discoverRunning = false;
    }
  })().catch(() => { discoverRunning = false; });

  return { runId: run._id, message: 'Discovery quét toàn bộ các mùa đang chạy nền. Theo dõi /api/enrichment/status.' };
}

// ── Đồng bộ toàn bộ (1 nút): quét danh sách → lấy 34 chỉ số chi tiết ──────────
let syncFullRunning = false;
export function isSyncFullRunning() { return syncFullRunning; }

export async function syncFullPipeline({ delayMs = DEFAULT_API_DELAY_MS, detailDelayMs = DEFAULT_DELAY_MS } = {}) {
  if (syncFullRunning || discoverRunning || bulkDetailRunning) {
    throw new Error('Một tác vụ đồng bộ đang chạy. Theo dõi /api/enrichment/status.');
  }
  syncFullRunning = true;

  // Chạy nền: discover trước, đợi xong, rồi bulk-detail.
  (async () => {
    try {
      await discoverAllPlayers({ delayMs });
      // Đợi discovery thật sự hoàn tất
      while (discoverRunning) await sleep(2000);
      await bulkScrapeDetails({ delayMs: detailDelayMs });
    } catch (err) {
      // lỗi đã được ghi vào SyncRun bởi từng bước
    } finally {
      syncFullRunning = false;
    }
  })().catch(() => { syncFullRunning = false; });

  return { message: 'Đồng bộ toàn bộ đang chạy nền: quét danh sách rồi lấy chi tiết. Theo dõi /api/enrichment/status.' };
}

export async function enrichSinglePlayer(player) {
  if (!player?.name) return null;
  const result = await enrichCardsForName(normalizeText(player.name).toLowerCase(), [player]);
  if (!result.matched) return null;

  const alias = await PlayerAlias.findOne({ spid: player.spid, status: 'matched' })
    .sort({ confidence: -1 })
    .populate('enrichmentId')
    .lean();
  return alias?.enrichmentId || null;
}

async function findAliasCandidate(enrichment) {
  const nameRegex = new RegExp(`^${escapeRegExp(enrichment.displayNameVi)}$`, 'i');
  const query = {
    $or: [
      { name: nameRegex },
      { searchName: nameRegex },
    ],
  };

  if (enrichment.seasonCode) {
    query.seasonId = Number(enrichment.seasonCode);
  }

  const player = await Player.findOne(query).lean();
  if (!player) return null;

  return {
    playerId: player._id,
    spid: player.spid,
    pid: player.pid,
    confidence: enrichment.seasonCode ? 0.9 : 0.65,
    reason: enrichment.seasonCode ? 'exact-name-and-season' : 'exact-name',
    status: enrichment.seasonCode ? 'matched' : 'candidate',
  };
}

async function upsertEnrichment(row) {
  const detailHtml = await fetchHtml(row.sourceUrl);
  const detail = parseMetaDescription(detailHtml);
  const mergedPositions = row.positions.length
    ? row.positions
    : detail.bestPosition
      ? [{ position: detail.bestPosition, overall: detail.overall }]
      : [];
  const ovrByPosition = Object.fromEntries(
    mergedPositions.filter((item) => item.position).map((item) => [item.position, item.overall])
  );
  const bestPosition = row.bestPosition || detail.bestPosition || mergedPositions[0]?.position || '';

  const payload = {
    ...row,
    ...detail,
    seasonName: detail.seasonName || row.seasonName,
    positions: mergedPositions,
    bestPosition,
    ovrByPosition,
    overall: row.overall ?? detail.overall,
    keyStats: detail.keyStats.length ? detail.keyStats : row.keyStats,
    detailedStats: detail.detailedStats,
    lastDetailSyncedAt: new Date(),
    syncedAt: new Date(),
    parseWarnings: detail.rawDescription ? [] : ['missing-meta-description'],
  };
  payload.dataQuality = buildDataQuality(payload, payload.parseWarnings);

  const enrichment = await PlayerEnrichment.findOneAndUpdate(
    { source: 'fifaaddict-vn', sourceUid: row.sourceUid },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const alias = await findAliasCandidate(payload);
  if (alias) {
    await PlayerAlias.findOneAndUpdate(
      { source: 'fifaaddict-vn', sourceUid: row.sourceUid, spid: alias.spid },
      {
        $set: {
          ...alias,
          enrichmentId: enrichment._id,
          source: 'fifaaddict-vn',
          sourceUid: row.sourceUid,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return enrichment;
}

export async function syncFifaAddict({ limit = DEFAULT_LIMIT, delayMs = DEFAULT_DELAY_MS } = {}) {
  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: Number(limit) || DEFAULT_LIMIT,
  });

  try {
    const html = await fetchHtml(`${BASE_URL}/`);
    const rows = parseRows(html, Number(limit) || DEFAULT_LIMIT);
    let processed = 0;
    let failed = 0;
    const errors = [];

    for (const row of rows) {
      try {
        await upsertEnrichment(row);
        processed += 1;
        if (delayMs > 0) await sleep(delayMs);
      } catch (error) {
        failed += 1;
        errors.push(`${row.displayNameVi}: ${error.message}`);
      }
    }

    await SyncRun.findByIdAndUpdate(run._id, {
      $set: {
        status: failed === rows.length ? 'failed' : 'success',
        finishedAt: new Date(),
        processed,
        updated: processed,
        failed,
        errors: errors.slice(0, 20),
        message: `Processed ${processed}/${rows.length} FIFAAddict rows`,
      },
    });

    return { requested: Number(limit) || DEFAULT_LIMIT, discovered: rows.length, processed, failed, errors };
  } catch (error) {
    await SyncRun.findByIdAndUpdate(run._id, {
      $set: {
        status: 'failed',
        finishedAt: new Date(),
        message: error.message,
        errors: [error.message],
      },
    });
    throw error;
  }
}

export async function resyncFifaAddictRecord({ enrichmentId, playerId, force = true } = {}) {
  let enrichment = null;
  if (enrichmentId) {
    enrichment = await PlayerEnrichment.findById(enrichmentId);
  } else if (playerId) {
    const player = await Player.findById(playerId).lean();
    if (!player) throw new Error('Player not found.');
    const alias = await PlayerAlias.findOne({ spid: player.spid, status: { $in: ['matched', 'candidate'] } })
      .sort({ confidence: -1 })
      .populate('enrichmentId');
    enrichment = alias?.enrichmentId || await enrichSinglePlayer(player);
  }

  if (!enrichment) throw new Error('Enrichment record not found.');
  return ensureEnrichmentDetail(enrichment, { force });
}

let bulkDetailRunning = false;
let clubCareerBackfillRunning = false;

export function isClubCareerBackfillRunning() {
  return clubCareerBackfillRunning;
}

export function buildClubCareerBackfillQuery({ onlyMissing = true } = {}) {
  const query = {
    source: 'fifaaddict-vn',
    sourceUid: { $exists: true, $ne: '' },
  };

  if (onlyMissing) {
    query.$or = [
      { clubCareer: { $exists: false } },
      { clubCareer: { $size: 0 } },
    ];
  }

  return query;
}

export function resolveClubCareerBackfillCap({ limit = 500, total = 0 } = {}) {
  const numericLimit = Number(limit);
  if (numericLimit === 0) return total;
  const safeLimit = numericLimit > 0 ? numericLimit : 500;
  return Math.min(safeLimit, total);
}

export function getClubCareerPlayerKey(doc = {}) {
  return normalizeText(doc.displayNameEn || doc.displayNameVi || doc.fullNameVi || '').toLowerCase();
}

function normalizedOptionalIdentityValue(value) {
  return normalizeText(value || '').toLowerCase();
}

function optionalIdentityMatches(left, right) {
  const normalizedLeft = normalizedOptionalIdentityValue(left);
  const normalizedRight = normalizedOptionalIdentityValue(right);
  return !normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight;
}

export function hasCompatibleClubCareerIdentity(reference = {}, candidate = {}) {
  const referenceKey = getClubCareerPlayerKey(reference);
  if (!referenceKey || referenceKey !== getClubCareerPlayerKey(candidate)) return false;

  return optionalIdentityMatches(reference.nation, candidate.nation)
    && optionalIdentityMatches(reference.birthDateText, candidate.birthDateText);
}

export function buildClubCareerBackfillGroups(records = []) {
  const groupsByKey = new Map();

  for (const record of records) {
    const key = getClubCareerPlayerKey(record);
    if (!key) continue;
    if (!groupsByKey.has(key)) groupsByKey.set(key, []);
    groupsByKey.get(key).push(record);
  }

  return [...groupsByKey.entries()].map(([key, recordsForKey]) => ({
    key,
    records: recordsForKey,
  }));
}

export function buildClubCareerFanoutOperations(reference, records = [], clubCareer = []) {
  if (!Array.isArray(clubCareer) || !clubCareer.length) return [];

  return records
    .filter((record) => hasCompatibleClubCareerIdentity(reference, record))
    .map((record) => ({
      updateOne: {
        filter: { _id: record._id },
        update: { $set: { clubCareer } },
      },
    }));
}

export function buildUicBackfillGroups(records = []) {
  return buildClubCareerBackfillGroups(records);
}

function hasCompatibleUicIdentity(reference = {}, candidate = {}) {
  const referenceKey = getClubCareerPlayerKey(reference);
  const referenceBirthDate = normalizedOptionalIdentityValue(reference.birthDateText);
  if (!referenceKey || !referenceBirthDate) return false;
  return referenceKey === getClubCareerPlayerKey(candidate)
    && referenceBirthDate === normalizedOptionalIdentityValue(candidate.birthDateText);
}

export function buildUicFanoutOperations(reference, records = [], uic = '') {
  const cleanUic = String(uic || '').trim();
  if (!cleanUic) return [];

  return records
    .filter((record) => hasCompatibleUicIdentity(reference, record))
    .map((record) => ({
      updateOne: {
        filter: { _id: record._id },
        update: { $set: { uic: cleanUic } },
      },
    }));
}

export function isBulkDetailRunning() {
  return bulkDetailRunning;
}

// Scrape detailedStats + group stats for all enrichments missing rawDescription
export async function bulkScrapeDetails({
  batchSize = 50,
  delayMs = DEFAULT_DELAY_MS,
  limit = 0, // 0 = no limit
} = {}) {
  if (bulkDetailRunning) throw new Error('Bulk detail scrape already running.');

  // Target records missing valid detailed stats OR missing hiddenTraits.
  const query = {
    source: 'fifaaddict-vn',
    sourceUid: { $exists: true, $ne: '' },
    $or: [
      { detailedStats: { $size: 0 } },
      { detailedStats: { $exists: false } },
      { 'detailedStats.value': { $not: { $gt: 0 } } },
      { hiddenTraits: { $size: 0 } },
      { hiddenTraits: { $exists: false } },
    ],
  };
  const total = await PlayerEnrichment.countDocuments(query);
  const cap = limit > 0 ? Math.min(limit, total) : total;

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: cap,
    message: `Bulk detail scrape: ${cap} records queued`,
  });

  bulkDetailRunning = true;

  const job = (async () => {
    let processed = 0;
    let failed = 0;
    let skip = 0;
    const errors = [];

    try {
      while (processed + failed < cap) {
        const batch = await PlayerEnrichment.find(query).skip(skip).limit(batchSize).lean();
        if (!batch.length) break;

        for (const doc of batch) {
          if (processed + failed >= cap) break;
          try {
            const updated = await ensureEnrichmentDetail(doc);
            const statCount = (updated?.detailedStats || []).filter(s => s.value > 0).length;
            console.log(`[OK] ${doc.displayNameVi} (${statCount} chỉ số) -> ${doc.sourceUrl}`);
            processed += 1;
          } catch (err) {
            failed += 1;
            console.error(`[FAIL] ${doc.displayNameVi} -> ${doc.sourceUrl} : ${err.message}`);
            if (errors.length < 50) errors.push(`${doc.displayNameVi}: ${err.message}`);
          }
          if (delayMs > 0) await sleep(delayMs);
        }

        skip += batchSize;

        await SyncRun.findByIdAndUpdate(run._id, {
          $set: {
            processed,
            failed,
            message: `Bulk detail scrape: ${processed + failed}/${cap} done (${processed} ok, ${failed} fail)`,
          },
        }).catch(() => {});
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: failed === cap && cap > 0 ? 'failed' : 'success',
          finishedAt: new Date(),
          processed,
          updated: processed,
          failed,
          errors,
          message: `Bulk detail scrape done: ${processed} scraped, ${failed} failed`,
        },
      });
    } catch (err) {
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: err.message, errors: [err.message] },
      }).catch(() => {});
    } finally {
      bulkDetailRunning = false;
    }
  })();

  job.catch(() => {});

  return { runId: run._id, queued: cap, total, message: 'Bulk detail scrape started in background.' };
}

let pidDiscoveryRunning = false;
let hybridDiscoveryRunning = false;

export function isPidDiscoveryRunning() {
  return pidDiscoveryRunning;
}

export function isHybridDiscoveryRunning() {
  return hybridDiscoveryRunning;
}

async function getExistingFifaAddictSeeds(limit = 1000) {
  const rows = await PlayerEnrichment.find({ source: 'fifaaddict-vn', sourceUid: { $exists: true, $ne: '' } })
    .select('sourceUid')
    .limit(limit)
    .lean();
  return rows.map((row) => String(row.sourceUid)).filter(Boolean);
}

async function getSearchSeedsFromNexonNames({ limit = 200, delayMs = DEFAULT_API_DELAY_MS } = {}) {
  const players = await Player.find({ isActive: true }).select('name searchName').limit(limit).lean();
  const uniqueNames = [...new Set(players.map((player) => normalizeText(player.searchName || player.name)).filter(Boolean))];
  const seeds = [];

  for (const name of uniqueNames) {
    try {
      const cards = await searchFifaAddictCards(name);
      for (const card of cards) {
        if (card.sourceUid) seeds.push(card.sourceUid);
      }
    } catch {
      // Search seed failures are non-fatal.
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  return [...new Set(seeds)];
}

let uicBackfillRunning = false;

export function isUicBackfillRunning() {
  return uicBackfillRunning;
}

export async function backfillFifaAddictUic({ limit = 0, delayMs = DEFAULT_API_DELAY_MS } = {}) {
  if (uicBackfillRunning) throw new Error('UIC backfill is already running.');

  const query = { source: 'fifaaddict-vn', uic: { $in: ['', null] } };
  const total = await PlayerEnrichment.countDocuments(query);
  const numericLimit = Number(limit) || 0;
  const cap = numericLimit > 0 ? Math.min(numericLimit, total) : total;
  const rows = cap > 0
    ? await PlayerEnrichment.find(query)
      .select('_id sourceUid displayNameVi displayNameEn birthDateText seasonCode')
      .limit(cap)
      .lean()
    : [];
  const groups = buildUicBackfillGroups(rows);

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: rows.length,
    message: `UIC backfill: ${rows.length}/${total} records queued`,
  });

  uicBackfillRunning = true;

  const job = (async () => {
    let processed = 0;
    let matched = 0;
    let skipped = 0;
    const errors = [];

    try {
      for (const group of groups) {
        const reference = group.records.find((record) => record.birthDateText) || group.records[0];
        const name = reference.displayNameVi || reference.displayNameEn;
        if (!name) {
          skipped += group.records.length;
          processed += group.records.length;
        } else {
          try {
            const candidates = await fetchFifaAddictUicByName(name, { limit: 20, seasonCode: reference.seasonCode });
            const found = candidates.find((candidate) => group.records.some((record) => candidate.uid === record.sourceUid));
            if (found) {
              const matchedRecord = group.records.find((record) => record.sourceUid === found.uid) || reference;
              const operations = buildUicFanoutOperations(matchedRecord, group.records, found.uic);
              if (operations.length) {
                await PlayerEnrichment.bulkWrite(operations, { ordered: false });
                matched += operations.length;
                skipped += group.records.length - operations.length;
              } else {
                skipped += group.records.length;
              }
            } else {
              skipped += group.records.length;
            }
            processed += group.records.length;
          } catch (error) {
            skipped += group.records.length;
            processed += group.records.length;
            if (errors.length < 50) errors.push(`${name}: ${error.message}`);
          }
        }

        await SyncRun.findByIdAndUpdate(run._id, {
          $set: {
            processed,
            updated: matched,
            failed: skipped,
            errors,
            message: `UIC backfill: ${processed}/${rows.length} records done (${matched} matched, ${skipped} skipped)`,
          },
        }).catch(() => {});

        if (delayMs > 0) await sleep(delayMs);
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: 'success',
          finishedAt: new Date(),
          processed,
          updated: matched,
          failed: skipped,
          errors,
          message: `UIC backfill done: ${matched} records updated, ${skipped} skipped`,
        },
      });
    } catch (error) {
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: error.message, errors: [error.message] },
      }).catch(() => {});
    } finally {
      uicBackfillRunning = false;
    }
  })();

  job.catch(() => {});

  return { runId: run._id, queued: rows.length, total, message: 'UIC backfill started in background.' };
}

export async function backfillClubCareer({
  batchSize = 50,
  delayMs = DEFAULT_DELAY_MS,
  limit = 500,
  onlyMissing = true,
} = {}) {
  if (clubCareerBackfillRunning) throw new Error('Club career backfill is already running.');

  const query = buildClubCareerBackfillQuery({ onlyMissing });
  const total = await PlayerEnrichment.countDocuments(query);
  const cap = resolveClubCareerBackfillCap({ limit, total });
  const snapshot = cap > 0
    ? await PlayerEnrichment.find(query)
      .select('sourceUid sourceUrl displayNameVi displayNameEn fullNameVi nation birthDateText club league clubCareer')
      .limit(cap)
      .lean()
    : [];
  const groups = buildClubCareerBackfillGroups(snapshot);

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: snapshot.length,
    message: `Club career backfill: ${groups.length} player groups queued (${snapshot.length}/${total} records)`,
  });

  clubCareerBackfillRunning = true;

  const job = (async () => {
    let processed = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    try {
      for (let offset = 0; offset < groups.length; offset += batchSize) {
        const batch = groups.slice(offset, offset + batchSize);
        if (!batch.length) break;

        for (const group of batch) {
          const doc = group.records[0];
          try {
            const refreshed = await ensureEnrichmentDetail(doc, { force: true });
            const clubCareer = refreshed?.clubCareer || [];
            const operations = buildClubCareerFanoutOperations(refreshed || doc, group.records, clubCareer);

            if (operations.length) {
              await PlayerEnrichment.bulkWrite(operations, { ordered: false });
              updated += operations.length;
            }

            processed += 1;
            console.log(`[OK] clubCareer ${group.key} fetched ${clubCareer.length}, applied ${operations.length}`);
          } catch (err) {
            failed += 1;
            console.error(`[FAIL] clubCareer ${group.key} -> ${doc.sourceUrl} : ${err.message}`);
            if (errors.length < 50) errors.push(`${group.key}: ${err.message}`);
          }
          if (delayMs > 0) await sleep(delayMs);
        }

        await SyncRun.findByIdAndUpdate(run._id, {
          $set: {
            processed,
            updated,
            failed,
            errors,
            message: `Club career backfill: ${processed + failed}/${groups.length} groups done (${updated} records updated, ${failed} failed)`,
          },
        }).catch(() => {});
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: failed === groups.length && groups.length > 0 ? 'failed' : 'success',
          finishedAt: new Date(),
          processed,
          updated,
          failed,
          errors,
          message: `Club career backfill done: ${updated} records updated, ${processed} groups processed, ${failed} failed`,
        },
      });
    } catch (err) {
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: err.message, errors: [err.message] },
      }).catch(() => {});
    } finally {
      clubCareerBackfillRunning = false;
    }
  })();

  job.catch(() => {});

  return { runId: run._id, queued: cap, total, message: 'Club career backfill started in background.' };
}

export async function discoverFifaAddictByPidGraph({
  initialUids = [],
  includeExistingSeeds = true,
  includeNexonSearchSeeds = false,
  nexonSearchLimit = 200,
  maxVisits = 5000,
  delayMs = DEFAULT_API_DELAY_MS,
} = {}) {
  if (pidDiscoveryRunning) throw new Error('PID discovery is already running.');
  pidDiscoveryRunning = true;

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: maxVisits,
    message: 'PID discovery: preparing seeds...',
  });

  const job = (async () => {
    const visited = new Set();
    const queued = new Set();
    const queue = [];
    let processed = 0;
    let upserted = 0;
    let failed = 0;
    const errors = [];

    const enqueue = (uid) => {
      const clean = String(uid || '').trim();
      if (!clean || visited.has(clean) || queued.has(clean)) return;
      queued.add(clean);
      queue.push(clean);
    };

    try {
      for (const uid of initialUids) enqueue(uid);
      if (includeExistingSeeds) {
        const existingSeeds = await getExistingFifaAddictSeeds(Math.min(maxVisits, 2000));
        for (const uid of existingSeeds) enqueue(uid);
      }
      if (includeNexonSearchSeeds) {
        const searchSeeds = await getSearchSeedsFromNexonNames({ limit: nexonSearchLimit, delayMs });
        for (const uid of searchSeeds) enqueue(uid);
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { message: `PID discovery: ${queue.length} seeds queued. Starting BFS...` },
      }).catch(() => {});

      while (queue.length && processed < maxVisits) {
        const uid = queue.shift();
        queued.delete(uid);
        if (visited.has(uid)) continue;
        visited.add(uid);

        try {
          const payload = await fetchPlayerJson(uid);
          const enrichment = detailPayloadToEnrichment(payload, uid);
          await upsertEnrichmentRow(enrichment);
          upserted += 1;

          for (const relatedUid of extractRelatedUids(payload)) enqueue(relatedUid);
          processed += 1;
        } catch (error) {
          failed += 1;
          processed += 1;
          if (errors.length < 50) errors.push(`${uid}: ${error.message}`);
        }

        if (processed % 10 === 0) {
          await SyncRun.findByIdAndUpdate(run._id, {
            $set: {
              processed,
              updated: upserted,
              failed,
              errors,
              message: `PID discovery: ${processed}/${maxVisits} visited, ${upserted} upserted, ${queue.length} queued`,
            },
          }).catch(() => {});
        }

        if (delayMs > 0) await sleep(delayMs);
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: failed === processed && processed > 0 ? 'failed' : 'success',
          finishedAt: new Date(),
          processed,
          updated: upserted,
          failed,
          errors,
          message: `PID discovery done: ${processed} visited, ${upserted} upserted, ${queue.length} remaining queued`,
        },
      });
    } catch (error) {
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: error.message, errors: [error.message] },
      }).catch(() => {});
    } finally {
      pidDiscoveryRunning = false;
    }
  })();

  job.catch(() => {});

  return { runId: run._id, message: 'PID discovery started in background. Poll /api/enrichment/status.' };
}

function addHybridSeed({ uid, source, seeds, queued, queue, meta = {} }) {
  const clean = String(uid || '').trim();
  if (!clean) return false;

  const existing = seeds.get(clean);
  if (existing) {
    existing.sources = [...new Set([...existing.sources, source])];
    existing.meta = { ...existing.meta, ...meta };
  } else {
    seeds.set(clean, { uid: clean, sources: [source], meta });
  }

  if (!queued.has(clean)) {
    queued.add(clean);
    queue.push(clean);
    return true;
  }

  return false;
}

export async function discoverFifaAddictHybridGraph({
  includeExistingSeeds = true,
  includeNexonSearchSeeds = true,
  nexonUniqueLimit = 1000,
  searchVariantLimit = 2,
  maxVisits = 10000,
  delayMs = DEFAULT_API_DELAY_MS,
} = {}) {
  if (hybridDiscoveryRunning) throw new Error('Hybrid discovery is already running.');
  hybridDiscoveryRunning = true;

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    requested: maxVisits,
    message: 'Hybrid discovery: preparing multi-source seeds...',
  });

  const job = (async () => {
    const visited = new Set();
    const queued = new Set();
    const queue = [];
    const seeds = new Map();
    let processed = 0;
    let upserted = 0;
    let failed = 0;
    let searchAttempts = 0;
    let searchHits = 0;
    let searchMisses = 0;
    let relatedFound = 0;
    const errors = [];

    try {
      if (includeExistingSeeds) {
        const existingSeeds = await getExistingFifaAddictSeeds(Math.min(maxVisits, 5000));
        for (const uid of existingSeeds) {
          addHybridSeed({ uid, source: 'existing-enrichment', seeds, queued, queue });
        }
      }

      if (includeNexonSearchSeeds) {
        const nexonPlayers = await Player.find({ isActive: true })
          .select('spid pid name searchName seasonId')
          .limit(Number(nexonUniqueLimit) || 1000)
          .lean();
        const uniquePlayers = groupUniqueNexonPlayers(nexonPlayers);

        await SyncRun.findByIdAndUpdate(run._id, {
          $set: {
            message: `Hybrid discovery: searching ${uniquePlayers.length} unique Nexon players...`,
            processed: 0,
            updated: 0,
          },
        }).catch(() => {});

        for (const group of uniquePlayers) {
          const variants = buildSearchVariants(group, searchVariantLimit);
          let groupHit = false;

          for (const name of variants) {
            try {
              searchAttempts += 1;
              const cards = await searchFifaAddictCards(name);
              if (cards.length) {
                groupHit = true;
                searchHits += 1;
              }
              for (const card of cards) {
                addHybridSeed({
                  uid: card.sourceUid,
                  source: 'nexon-name-search',
                  seeds,
                  queued,
                  queue,
                  meta: { nexonKey: group.key, name },
                });
              }
            } catch (error) {
              if (errors.length < 50) errors.push(`search ${name}: ${error.message}`);
            }
            if (delayMs > 0) await sleep(delayMs);
          }

          if (!groupHit) searchMisses += 1;

          if ((searchAttempts + searchMisses) % 25 === 0) {
            await SyncRun.findByIdAndUpdate(run._id, {
              $set: {
                message: `Hybrid discovery: ${seeds.size} seeds, ${searchAttempts} searches, ${searchMisses} misses`,
                processed,
                updated: upserted,
                failed,
                errors,
              },
            }).catch(() => {});
          }
        }
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          message: `Hybrid discovery: ${queue.length} seeds queued. Expanding FIFAAddict UID graph...`,
          processed,
          updated: upserted,
          failed,
          errors,
        },
      }).catch(() => {});

      while (queue.length && processed < maxVisits) {
        const uid = queue.shift();
        queued.delete(uid);
        if (visited.has(uid)) continue;
        visited.add(uid);

        try {
          const payload = await fetchPlayerJson(uid);
          const enrichment = detailPayloadToEnrichment(payload, uid);
          await upsertEnrichmentRow(enrichment);
          upserted += 1;

          const related = extractRelatedUids(payload);
          relatedFound += related.length;
          for (const relatedUid of related) {
            addHybridSeed({ uid: relatedUid, source: 'fifaaddict-dbrellate', seeds, queued, queue });
          }
        } catch (error) {
          failed += 1;
          if (errors.length < 50) errors.push(`${uid}: ${error.message}`);
        }

        processed += 1;

        if (processed % 10 === 0) {
          await SyncRun.findByIdAndUpdate(run._id, {
            $set: {
              processed,
              updated: upserted,
              failed,
              errors,
              message: `Hybrid discovery: ${processed}/${maxVisits} visited, ${upserted} upserted, ${queue.length} queued, ${seeds.size} seeds, ${relatedFound} related found`,
            },
          }).catch(() => {});
        }

        if (delayMs > 0) await sleep(delayMs);
      }

      const stopReason = classifyDiscoveryStop({ queueLength: queue.length, processed, maxVisits });
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: failed === processed && processed > 0 ? 'failed' : 'success',
          finishedAt: new Date(),
          processed,
          updated: upserted,
          failed,
          errors,
          message: `Hybrid discovery done (${stopReason}): ${processed} visited, ${upserted} upserted, ${queue.length} remaining queued, ${seeds.size} seeds, ${searchAttempts} searches, ${searchMisses} search misses`,
        },
      });
    } catch (error) {
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: error.message, errors: [error.message] },
      }).catch(() => {});
    } finally {
      hybridDiscoveryRunning = false;
    }
  })();

  job.catch(() => {});

  return { runId: run._id, message: 'Hybrid discovery started in background. Poll /api/enrichment/status.' };
}

export async function getFifaAddictStatus() {
  const [
    latestRun,
    totalEnriched,
    totalMatched,
    missingDetail,
    missingImage,
    lowConfidence,
    unmatched,
    recentWarnings,
  ] = await Promise.all([
    SyncRun.findOne({ source: 'fifaaddict-vn' }).sort({ createdAt: -1 }).lean(),
    PlayerEnrichment.countDocuments({ source: 'fifaaddict-vn' }),
    PlayerAlias.countDocuments({ source: 'fifaaddict-vn', status: 'matched' }),
    PlayerEnrichment.countDocuments({ source: 'fifaaddict-vn', rawDescription: { $in: ['', null] } }),
    PlayerEnrichment.countDocuments({ source: 'fifaaddict-vn', imageUrl: { $in: ['', null] } }),
    PlayerAlias.countDocuments({ source: 'fifaaddict-vn', confidence: { $lt: 0.8 }, status: { $ne: 'rejected' } }),
    PlayerEnrichment.countDocuments({
      source: 'fifaaddict-vn',
      _id: { $nin: await PlayerAlias.find({ source: 'fifaaddict-vn', status: 'matched' }).distinct('enrichmentId') },
    }),
    PlayerEnrichment.find({ source: 'fifaaddict-vn', parseWarnings: { $exists: true, $ne: [] } })
      .select('displayNameVi seasonName parseWarnings dataQuality sourceUrl syncedAt')
      .sort({ syncedAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return {
    latestRun,
    totalEnriched,
    totalMatched,
    bulkSyncRunning,
    bulkDetailRunning,
    discoverRunning,
    discoverV2Running,
    discoverBySeasonRunning,
    pidDiscoveryRunning,
    hybridDiscoveryRunning,
    quality: {
      missingDetail,
      missingImage,
      lowConfidence,
      unmatched,
      recentWarnings,
    },
  };
}


// ── Discovery v2: Fetch ALL players without season filter ──────────
let discoverV2Running = false;
export function isDiscoverV2Running() { return discoverV2Running; }

export async function discoverAllPlayersV2({ delayMs = DEFAULT_API_DELAY_MS, maxPages = 500 } = {}) {
  if (discoverV2Running || discoverRunning) throw new Error('A discovery job is already running.');
  discoverV2Running = true;

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    message: 'Discovery V2: Fetching ALL players without season filter...',
  });

  (async () => {
    try {
      console.log('[Discovery V2] Starting: fetch ALL players, API will filter by season internally');
      const seenKeys = new Set(); // Track unique sourceUid + seasonCode
      let totalProcessed = 0;
      let totalUpserted = 0;
      let totalFailed = 0;
      let consecutiveEmptyPages = 0;
      let consecutiveDuplicatePages = 0;

      for (let page = 1; page <= maxPages; page++) {
        await SyncRun.findByIdAndUpdate(run._id, {
          $set: {
            message: `Discovery V2: Trang ${page}... (${totalUpserted} players inserted, ${seenKeys.size} unique cards)`,
            processed: totalUpserted,
            requested: 15000
          }
        }).catch(() => {});

        let rows;
        try {
          rows = await fetchListPage(page, ''); // NO year filter
          console.log(`[Discovery V2] Page ${page}: fetched ${rows.length} rows`);
        } catch (err) {
          console.error(`[Discovery V2 ERROR] Page ${page}: ${err.message} (status: ${err.response?.status})`);
          totalFailed += 1;
          if (err.response?.status === 401 || err.response?.status === 403) {
            console.log('[Discovery V2] Token expired, refreshing...');
            await getAraiwaToken(true);
          }
          await sleep(delayMs * 5);
          continue;
        }

        if (!rows || !rows.length) {
          consecutiveEmptyPages++;
          console.log(`[Discovery V2] Page ${page}: EMPTY (${consecutiveEmptyPages}/3)`);
          if (consecutiveEmptyPages >= 3) {
            console.log(`[Discovery V2] 3 consecutive empty pages, ending discovery`);
            break;
          }
          continue;
        }

        consecutiveEmptyPages = 0;
        let newInPage = 0;
        let skippedInPage = 0;

        for (const row of rows) {
          const uid = String(row.uid || '');
          if (!uid) continue;

          const enrichment = apiRowToEnrichment(row);
          const key = `${uid}-${enrichment.seasonCode}`;
          
          if (seenKeys.has(key)) {
            skippedInPage++;
            continue;
          }

          // Check DB
          const exists = await PlayerEnrichment.findOne({
            source: 'fifaaddict-vn',
            sourceUid: uid,
            seasonCode: enrichment.seasonCode
          }).lean();

          if (!exists) {
            seenKeys.add(key);
            newInPage++;
            try {
              await upsertEnrichmentRow(enrichment);
              totalUpserted += 1;
            } catch (err) {
              console.error(`[Discovery V2] Failed to upsert ${uid} (season ${enrichment.seasonCode}): ${err.message}`);
              totalFailed += 1;
            }
          } else {
            seenKeys.add(key);
            skippedInPage++;
          }
        }

        console.log(`[Discovery V2] Page ${page}: ${newInPage} new, ${skippedInPage} skipped, total: ${totalUpserted}`);

        if (newInPage === 0 && skippedInPage > 0) {
          consecutiveDuplicatePages++;
          console.log(`[Discovery V2] ${consecutiveDuplicatePages} consecutive duplicate pages`);
          if (consecutiveDuplicatePages >= 10) {
            console.log(`[Discovery V2] API returning only duplicates, ending discovery`);
            break;
          }
        } else {
          consecutiveDuplicatePages = 0;
        }

        if (delayMs > 0) await sleep(delayMs);

        if (rows.length < 50) {
          console.log(`[Discovery V2] Page ${page}: only ${rows.length} rows, likely end`);
          break;
        }
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: 'success',
          finishedAt: new Date(),
          processed: totalUpserted,
          updated: totalUpserted,
          failed: totalFailed,
          message: `✓ Discovery V2 hoàn tất: ${totalUpserted} players mới, ${seenKeys.size} unique cards.`,
        }
      });
    } catch (error) {
      console.error('Discovery V2 error:', error);
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: `Lỗi Discovery V2: ${error.message}` }
      }).catch(() => {});
    } finally {
      discoverV2Running = false;
    }
  })().catch(() => { discoverV2Running = false; });

  return { runId: run._id, message: 'Discovery V2 đang chạy nền (no season filter). Theo dõi /api/enrichment/status.' };
}

// ── Discovery by season table: loop through FifaAddictSeason values, paginate
// each season via spos=ovr_0-{pos1val of last row} until no new UID appears ──
let discoverBySeasonRunning = false;
export function isDiscoverBySeasonRunning() { return discoverBySeasonRunning; }

export async function discoverAllPlayersBySeasonTable({ delayMs = DEFAULT_API_DELAY_MS, maxRoundsPerSeason = 50 } = {}) {
  if (discoverBySeasonRunning) throw new Error('Discovery by season đang chạy.');
  discoverBySeasonRunning = true;

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    message: 'Discovery by season: đang chuẩn bị quét theo bảng season…',
  });

  (async () => {
    try {
      const seasons = await FifaAddictSeason.find({ isActive: true }).lean();
      if (!seasons.length) {
        throw new Error('Bảng FifaAddictSeason rỗng. Hãy chạy scrape-seasons trước.');
      }

      let totalUpserted = 0;
      let totalFailed = 0;
      let totalSeenUids = 0;

      for (let sIdx = 0; sIdx < seasons.length; sIdx++) {
        const season = seasons[sIdx];
        const seenUidsThisSeason = new Set();
        let nextSpos = null;
        let round = 0;
        let newInSeason = 0;

        while (round < maxRoundsPerSeason) {
          round += 1;

          await SyncRun.findByIdAndUpdate(run._id, {
            $set: {
              message: `Discovery by season: ${season.value} (mùa ${sIdx + 1}/${seasons.length}), vòng ${round}... (${newInSeason} mới trong mùa này, ${totalUpserted} tổng)`,
              processed: totalUpserted,
            },
          }).catch(() => {});

          let rows;
          try {
            rows = await fetchSeasonPage(season.value, nextSpos);
          } catch (err) {
            console.error(`[Discovery by season] ${season.value} round ${round}: ${err.message} (status: ${err.response?.status})`);
            totalFailed += 1;
            if (err.response?.status === 401 || err.response?.status === 403) {
              await getAraiwaToken(true);
            }
            await sleep(delayMs * 5);
            break; // bỏ qua mùa này, không retry vô hạn
          }

          if (!rows.length) break;

          let newInRound = 0;
          for (const row of rows) {
            const uid = String(row.uid || '');
            if (!uid || seenUidsThisSeason.has(uid)) continue;
            seenUidsThisSeason.add(uid);
            newInRound += 1;
            newInSeason += 1;

            try {
              const enrichment = apiRowToEnrichment(row);
              await upsertEnrichmentRow(enrichment);
              totalUpserted += 1;
            } catch (err) {
              console.error(`[Discovery by season] Failed to upsert ${uid}: ${err.message}`);
              totalFailed += 1;
            }
          }

          if (newInRound === 0) break; // hết cầu thủ mùa này -> qua mùa tiếp

          const last = rows[rows.length - 1];
          nextSpos = last.pos1val;

          if (delayMs > 0) await sleep(delayMs);
        }

        totalSeenUids += seenUidsThisSeason.size;
        console.log(`[Discovery by season] ${season.value}: ${newInSeason} cầu thủ, tổng tích lũy ${totalSeenUids}`);
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: 'success',
          finishedAt: new Date(),
          processed: totalUpserted,
          updated: totalUpserted,
          failed: totalFailed,
          message: `✓ Discovery by season hoàn tất: ${seasons.length} mùa, ${totalUpserted} cầu thủ upserted.`,
        },
      });
    } catch (error) {
      console.error('Discovery by season error:', error);
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: { status: 'failed', finishedAt: new Date(), message: `Lỗi Discovery by season: ${error.message}` },
      }).catch(() => {});
    } finally {
      discoverBySeasonRunning = false;
    }
  })().catch(() => { discoverBySeasonRunning = false; });

  return { runId: run._id, message: 'Discovery by season đang chạy nền. Theo dõi /api/enrichment/status.' };
}
