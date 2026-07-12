import axios from 'axios';
import { normalizePlayer } from './helpers.js';
import { registerSeasonSprites } from './seasonSprites.js';
import { API_BASE } from '../config/api.js';

const BASE = API_BASE;

export async function fetchPlayers(params = {}) {
  const {
    search, posGroups, seasons, ovr, salaryMax, priceMax,
    league, nation, club, preferredFoot, weakFoot, skillMoves,
    workRateAttack, workRateDefense, heightMin, heightMax,
    weightMin, weightMax, reputation, statFilter, statMin, statMax,
    traits, sort, page, pageSize,
  } = params;

  const q = {};
  if (search) q.search = search;
  if (posGroups?.length) q.position = posGroups.join(',');
  if (seasons?.length) q.seasonId = seasons.join(',');
  // Only send OVR range if user actually filtered (not defaults)
  if (ovr && (ovr[0] > 50 || ovr[1] < 150)) {
    q.minOverall = ovr[0];
    q.maxOverall = ovr[1];
  }
  // Only send salary/price if user explicitly set a max (not sentinel 999999)
  if (salaryMax != null && salaryMax < 999999) q.maxSalary = salaryMax;
  if (priceMax != null && priceMax < 999999) q.maxPrice = priceMax;
  if (traits?.length) q.trait = traits[0];
  if (league && !club) q.league = league;
  if (nation) q.nation = nation;
  if (club) q.club = club;
  if (preferredFoot) q.preferredFoot = preferredFoot;
  if (weakFoot) q.weakFoot = weakFoot;
  if (skillMoves) q.skillMoves = skillMoves;
  if (workRateAttack) q.workRateAttack = workRateAttack;
  if (workRateDefense) q.workRateDefense = workRateDefense;
  if (heightMin) q.minHeight = heightMin;
  if (heightMax) q.maxHeight = heightMax;
  if (weightMin) q.minWeight = weightMin;
  if (weightMax) q.maxWeight = weightMax;
  if (reputation) q.reputation = reputation;
  if (statFilter && statMin) q[`min${statFilter.charAt(0).toUpperCase() + statFilter.slice(1)}`] = statMin;
  if (statFilter && statMax) q[`max${statFilter.charAt(0).toUpperCase() + statFilter.slice(1)}`] = statMax;
  q.page = page || 1;
  q.limit = pageSize || 20;

  const sortMap = {
    ovr_desc:    'overall',
    ovr_asc:     'overall_asc',
    price_desc:  'price_desc',
    price_asc:   'price_asc',
    salary_desc: 'salary',
    salary_asc:  'salary_asc',
    season:      'season',
    name:        'name',
  };
  q.sort = sortMap[sort] || 'overall';

  const res = await axios.get(`${BASE}/players`, { params: q });
  const data = res.data;
  return {
    players: (data.data || []).map(normalizePlayer),
    total: data.total || 0,
    page: data.page || 1,
    totalPages: data.totalPages || 1,
  };
}

export async function fetchPlayerDetail(id) {
  const res = await axios.get(`${BASE}/players/${id}/detail`);
  const { player, enrichment, relatedSeasons } = res.data.data;
  const normalized = normalizePlayer({ ...player, enrichment });
  const related = (relatedSeasons || [])
    .filter(r => String(r._id) !== String(player._id))
    .map(normalizePlayer);
  return { player: normalized, related };
}

export async function fetchMeta() {
  const res = await axios.get(`${BASE}/players/meta`);
  registerSeasonSprites(res.data?.seasons || []);
  return res.data;
}

export async function fetchClubsByLeague(league = '') {
  if (!String(league || '').trim()) return [];
  const res = await axios.get(`${BASE}/players/clubs`, { params: { league } });
  return res.data?.clubs || [];
}

export async function fetchEvents() {
  const res = await axios.get(`${BASE}/events`);
  return res.data?.data || [];
}

export async function createSquadShare(payload) {
  const res = await axios.post(`${BASE}/squad-shares`, payload);
  return res.data?.data;
}

export async function fetchSquadShare(id) {
  const res = await axios.get(`${BASE}/squad-shares/${id}`);
  return res.data?.data;
}

export async function fetchSquadShares(params = {}) {
  const res = await axios.get(`${BASE}/squad-shares`, { params });
  return res.data?.data || [];
}
