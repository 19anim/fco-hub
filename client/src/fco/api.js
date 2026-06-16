import axios from 'axios';
import { normalizePlayer } from './helpers.js';
import { registerSeasonSprites } from './seasonSprites.js';
import { API_BASE } from '../config/api.js';

const BASE = API_BASE;

export async function fetchPlayers(params = {}) {
  const { search, posGroups, seasons, ovr, salaryMax, priceMax, traits, leagues, sort, page, pageSize } = params;

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
  if (leagues?.length) q.league = leagues.join(',');
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
    .slice(0, 8)
    .map(normalizePlayer);
  return { player: normalized, related };
}

export async function fetchMeta() {
  const res = await axios.get(`${BASE}/players/meta`);
  registerSeasonSprites(res.data?.seasons || []);
  return res.data;
}

export async function fetchEvents() {
  const res = await axios.get(`${BASE}/events`);
  return res.data?.data || [];
}
