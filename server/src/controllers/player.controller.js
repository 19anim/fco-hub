import Player from '../models/Player.js';
import PlayerAlias from '../models/PlayerAlias.js';
import PlayerEnrichment from '../models/PlayerEnrichment.js';
import PlayerUsageAggregate from '../models/PlayerUsageAggregate.js';
import FifaAddictSeason from '../models/FifaAddictSeason.js';
import { getNexonMetadata, syncNexonPlayers } from '../services/nexonMetadata.js';
import { enrichSinglePlayer, ensureEnrichmentDetail, fetchFifaAddictTeamsByLeague } from '../services/fifaAddictSource.js';
import { hasSearchText, toFoldedSearchRegex } from '../services/searchText.js';

async function attachEnrichment(players) {
  const list = players.map((player) => (typeof player.toObject === 'function' ? player.toObject() : player));
  const spids = list.map((player) => player.spid).filter(Boolean);
  const aliases = await PlayerAlias.find({ spid: { $in: spids }, status: { $in: ['matched', 'candidate'] } })
    .populate('enrichmentId')
    .lean();
  const aliasBySpid = new Map();

  for (const alias of aliases) {
    const existing = aliasBySpid.get(alias.spid);
    if (!existing || alias.confidence > existing.confidence) {
      aliasBySpid.set(alias.spid, alias);
    }
  }

  return list.map((player) => {
    const alias = aliasBySpid.get(player.spid);
    return {
      ...player,
      enrichment: alias?.enrichmentId || null,
      enrichmentMatch: alias ? {
        confidence: alias.confidence,
        reason: alias.reason,
        status: alias.status,
      } : null,
    };
  });
}

function addNumberRange(query, field, min, max) {
  if (!min && !max) return;
  query[field] = {};
  if (min) query[field].$gte = Number(min);
  if (max) query[field].$lte = Number(max);
}

function normalizeMetaText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function isWeakSeasonLabel(value) {
  const label = normalizeMetaText(value);
  return !label || /^\d+$/.test(label);
}

function getFifaAddictSeasonClassId(season) {
  return String(season?.className || '').match(/(?:^|\s)y(\d+)(?:\s|$)/)?.[1] || '';
}

export function buildEnrichmentSearchQuery(search, seasonId, filters = {}) {
  const query = { source: 'fifaaddict-vn' };

  if (hasSearchText(search)) {
    const searchRegex = toFoldedSearchRegex(search);
    query.$and = query.$and || [];
    query.$and.push({ searchKey: { $regex: searchRegex, $options: 'i' } });
  }

  if (seasonId) {
    const seasonCodes = String(seasonId)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (seasonCodes.length === 1) query.seasonCode = seasonCodes[0];
    if (seasonCodes.length > 1) query.seasonCode = { $in: seasonCodes };
  }

  if (filters.position) {
    const posList = String(filters.position).split(',').map(p => p.trim()).filter(Boolean);
    if (posList.length > 0) {
      query.$and = query.$and || [];
      query.$and.push({ $or: [
        { bestPosition: { $in: posList } },
        { 'positions.position': { $in: posList } },
      ] });
    }
  }
  if (filters.trait) query.hiddenTraits = { $regex: filters.trait, $options: 'i' };
  if (filters.league && !filters.careerClub) query.league = { $regex: filters.league, $options: 'i' };
  if (filters.nation) query.nation = { $regex: filters.nation, $options: 'i' };
  if (filters.club) {
    const clubRegex = { $regex: filters.club, $options: 'i' };
    const clubConditions = [
      { club: clubRegex },
      { teamColor: clubRegex },
      { 'clubCareer.team': clubRegex },
    ];
    if (query.$and) {
      query.$and.push({ $or: clubConditions });
    } else {
      query.$and = [{ $or: clubConditions }];
    }
  }
  if (filters.careerClub) query['clubCareer.team'] = { $regex: filters.careerClub, $options: 'i' };
  if (filters.preferredFoot) query.preferredFoot = filters.preferredFoot;
  if (filters.workRateAttack) query.workRateAttack = filters.workRateAttack;
  if (filters.workRateDefense) query.workRateDefense = filters.workRateDefense;
  if (filters.weakFoot) query.weakFoot = { $gte: Number(filters.weakFoot) };
  if (filters.skillMoves) query.skillMoves = { $gte: Number(filters.skillMoves) };
  if (filters.reputation) query.reputation = filters.reputation;
  addNumberRange(query, 'overall', filters.minOverall, filters.maxOverall);
  addNumberRange(query, 'price', filters.minPrice, filters.maxPrice);
  addNumberRange(query, 'salary', filters.minSalary, filters.maxSalary);
  addNumberRange(query, 'height', filters.minHeight, filters.maxHeight);
  addNumberRange(query, 'weight', filters.minWeight, filters.maxWeight);
  for (const field of ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']) {
    const min = filters[`min${field[0].toUpperCase()}${field.slice(1)}`];
    const max = filters[`max${field[0].toUpperCase()}${field.slice(1)}`];
    addNumberRange(query, field, min, max);
  }

  return query;
}

function toEnrichmentOnlyPlayer(enrichment) {
  return {
    _id: `enrichment-${enrichment._id}`,
    isEnrichmentOnly: true,
    name: enrichment.displayNameVi || enrichment.displayNameEn,
    searchName: enrichment.displayNameEn || enrichment.displayNameVi,
    seasonName: enrichment.seasonName,
    seasonImg: enrichment.seasonImg,
    seasonId: enrichment.seasonCode,
    cardType: enrichment.seasonName,
    position: enrichment.bestPosition || enrichment.positions?.[0]?.position || '',
    overall: enrichment.overall,
    marketPrice: enrichment.price,
    salary: enrichment.salary ?? enrichment.fp,
    imageUrl: enrichment.imageUrl,
    dataSource: 'fifaaddict-vn',
    sourceUrl: enrichment.sourceUrl,
    enrichment,
    enrichmentMatch: {
      confidence: 0,
      reason: 'unmatched_enrichment_record',
      status: 'unmatched',
    },
  };
}

async function getRelatedSeasons({ player, enrichment }) {
  const related = [];

  if (player?.pid) {
    const siblingPlayers = await Player.find({ pid: player.pid, isActive: true })
      .sort({ seasonId: -1, overall: -1 })
      .limit(60)
      .lean();
    related.push(...await attachEnrichment(siblingPlayers));
  }

  const name = enrichment?.displayNameVi || enrichment?.displayNameEn || player?.name;
  if (name) {
    const enrichmentRows = await PlayerEnrichment.find({
      source: 'fifaaddict-vn',
      $or: [
        { displayNameVi: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { displayNameEn: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ],
    })
      .sort({ seasonCode: -1, overall: -1 })
      .limit(60)
      .lean();

    // Abbreviated names like "R. Keane" collide across distinct players (e.g. Roy Keane vs
    // Robbie Keane). When the target has a full name on file, only keep rows that share it.
    const targetFullName = normalizeMetaText(enrichment?.fullNameVi || '').toLowerCase();
    const filteredRows = targetFullName
      ? enrichmentRows.filter((row) => {
        const rowFullName = normalizeMetaText(row.fullNameVi || '').toLowerCase();
        return !rowFullName || rowFullName === targetFullName;
      })
      : enrichmentRows;

    related.push(...filteredRows.map(toEnrichmentOnlyPlayer));
  }

  const seen = new Set();
  return related
    .filter((item) => {
      const key = String(item.spid || item.enrichment?.sourceUid || item._id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(b.seasonId || 0) - Number(a.seasonId || 0) || (b.overall || 0) - (a.overall || 0));
}

// GET /api/players - List & search players
// Strategy: PlayerEnrichment is the ONLY source.
export const getPlayers = async (req, res) => {
  try {
    const {
      search,
      position,
      seasonId,
      minOverall,
      maxOverall,
      minPrice,
      maxPrice,
      minSalary,
      maxSalary,
      trait,
      league,
      nation,
      preferredFoot,
      weakFoot,
      skillMoves,
      workRateAttack,
      workRateDefense,
      club,
      careerClub,
      reputation,
      minHeight,
      maxHeight,
      minWeight,
      maxWeight,
      minPace,
      maxPace,
      minShooting,
      maxShooting,
      minPassing,
      maxPassing,
      minDribbling,
      maxDribbling,
      minDefending,
      maxDefending,
      minPhysical,
      maxPhysical,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const skip     = (pageNum - 1) * limitNum;

    // Build enrichment query
    const enrichmentFilters = {
      position, minOverall, maxOverall,
      minPrice, maxPrice, minSalary, maxSalary,
      trait,
      league, nation, club, careerClub, preferredFoot, weakFoot, skillMoves, workRateAttack, workRateDefense,
      reputation, minHeight, maxHeight, minWeight, maxWeight,
      minPace, maxPace, minShooting, maxShooting,
      minPassing, maxPassing, minDribbling, maxDribbling,
      minDefending, maxDefending, minPhysical, maxPhysical,
    };
    const enrichmentQuery = buildEnrichmentSearchQuery(search, seasonId, enrichmentFilters);

    // Exclude records with no stats
    if (!enrichmentQuery.overall) {
      enrichmentQuery.overall = { $gt: 0 };
    } else if ((enrichmentQuery.overall.$gte ?? 0) < 1) {
      enrichmentQuery.overall.$gt = 0;
    }

    // Sort options
    const enrichmentSort = (() => {
      switch (sort) {
        case 'overall':     return { overall: -1, syncedAt: -1 };
        case 'overall_asc': return { overall: 1,  syncedAt: -1 };
        case 'price_desc':  return { price: -1,   overall: -1  };
        case 'price_asc':   return { price: 1,    overall: -1  };
        case 'salary':      return { salary: -1,  overall: -1  };
        case 'salary_asc':  return { salary: 1,   overall: -1  };
        case 'season':      return { seasonCode: -1, overall: -1 };
        case 'name':        return { displayNameVi: 1 };
        default:            return { overall: -1, syncedAt: -1 };
      }
    })();

    const [enrichmentRows, total] = await Promise.all([
      PlayerEnrichment.find(enrichmentQuery).sort(enrichmentSort).skip(skip).limit(limitNum).lean(),
      PlayerEnrichment.countDocuments(enrichmentQuery),
    ]);

    // Build response — simplified, no more Player/Alias joins
    const data = enrichmentRows.map(e => ({
      _id: String(e._id),
      enrichment: e,
      // Compatibility fields for frontend if needed
      spid: e.sourceUid,
      name: e.displayNameVi || e.displayNameEn,
      seasonName: e.seasonName,
      overall: e.overall,
    }));

    res.json({
      success: true,
      count: data.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching players',
      error: error.message,
    });
  }
};

// GET /api/players/clubs?league=xxx - Career clubs filtered by league
export const getClubsByLeague = async (req, res) => {
  try {
    const { league } = req.query;
    if (!String(league || '').trim()) return res.json({ clubs: [] });

    const match = { source: 'fifaaddict-vn', overall: { $gt: 0 }, clubCareer: { $elemMatch: { team: { $nin: ['', null] } } }, league: { $regex: league, $options: 'i' } };
    const clubs = await PlayerEnrichment.aggregate([
      { $match: match },
      { $unwind: '$clubCareer' },
      { $match: { 'clubCareer.team': { $nin: ['', null] } } },
      { $group: { _id: '$clubCareer.team', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 200 },
      { $project: { _id: 0, club: '$_id' } },
    ]);
    const dbClubs = clubs.map(r => r.club).filter(Boolean);
    if (dbClubs.length) return res.json({ clubs: dbClubs });

    const sourceClubs = await fetchFifaAddictTeamsByLeague(league);
    res.json({ clubs: sourceClubs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// getPlayerMeta aggregates filter metadata across the whole collection (season list, leagues,
// nations, etc.) that barely changes minute to minute — cache it to avoid re-scanning on every request.
const PLAYER_META_CACHE_TTL_MS = 5 * 60 * 1000;
let playerMetaCache = null;
let playerMetaCacheAt = 0;

// GET /api/players/meta - Filter metadata
export const getPlayerMeta = async (req, res) => {
  try {
    if (playerMetaCache && Date.now() - playerMetaCacheAt < PLAYER_META_CACHE_TTL_MS) {
      return res.json(playerMetaCache);
    }

    const enrichmentMatch = { source: 'fifaaddict-vn', overall: { $gt: 0 } };
    const [dbSeasons, dbPositions, count, nexonMeta, fifaAddictSeasons, dbNations, dbLeagues, dbHiddenTraits, dbTopClubs] = await Promise.all([
      PlayerEnrichment.aggregate([
        { $match: { ...enrichmentMatch, seasonCode: { $nin: ['', null] } } },
        {
          $addFields: {
            seasonSort: { $convert: { input: '$seasonCode', to: 'int', onError: 0, onNull: 0 } },
            hasSeasonName: { $cond: [{ $in: ['$seasonName', ['', null]] }, 0, 1] },
            hasSeasonImg: { $cond: [{ $in: ['$seasonImg', ['', null]] }, 0, 1] },
          },
        },
        { $sort: { seasonSort: -1, hasSeasonName: -1, hasSeasonImg: -1 } },
        {
          $group: {
            _id: '$seasonCode',
            seasonName: { $first: '$seasonName' },
            seasonImg: { $first: '$seasonImg' },
            seasonSort: { $first: '$seasonSort' },
            count: { $sum: 1 },
          },
        },
        { $sort: { seasonSort: -1, count: -1 } },
      ]),
      PlayerEnrichment.distinct('bestPosition', { ...enrichmentMatch, bestPosition: { $nin: ['', null] } }),
      PlayerEnrichment.countDocuments(enrichmentMatch),
      getNexonMetadata().catch(() => ({ seasons: [] })),
      FifaAddictSeason.find({ isActive: true }).lean().catch(() => []),
      PlayerEnrichment.distinct('nation', { ...enrichmentMatch, nation: { $nin: ['', null] } }),
      PlayerEnrichment.distinct('league', { ...enrichmentMatch, league: { $nin: ['', null] } }),
      PlayerEnrichment.distinct('hiddenTraits', { ...enrichmentMatch }),
      PlayerEnrichment.aggregate([
        { $match: { ...enrichmentMatch, club: { $nin: ['', null] } } },
        { $group: { _id: '$club', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 150 },
        { $project: { _id: 0, club: '$_id' } },
      ]),
    ]);

    const seasonMetaById = new Map((nexonMeta.seasons || []).map((season) => [String(season.seasonId), season]));
    const fifaAddictSeasonByValue = new Map(
      (fifaAddictSeasons || []).map((season) => [String(season.value || '').toUpperCase(), season])
    );
    const fifaAddictSeasonByClassId = new Map(
      (fifaAddictSeasons || [])
        .map((season) => [getFifaAddictSeasonClassId(season), season])
        .filter(([classId]) => classId)
    );

    const seasons = dbSeasons.map((season) => {
      const seasonCode = String(season._id || '');
      const metaSeason = seasonMetaById.get(seasonCode);
      const fifaAddictSeason = fifaAddictSeasonByValue.get(seasonCode.toUpperCase())
        || fifaAddictSeasonByClassId.get(seasonCode);
      const seasonName = isWeakSeasonLabel(season.seasonName) && metaSeason?.seasonName
        ? metaSeason.seasonName
        : season.seasonName || fifaAddictSeason?.title || metaSeason?.seasonName || `Season ${seasonCode}`;
      const seasonImg = season.seasonImg || metaSeason?.seasonImg || '';
      return {
        // seasonId is what the client sends back as ?seasonId= → matched against seasonCode
        seasonId: seasonCode,
        seasonName,
        seasonLabel: seasonName,
        seasonShortName: seasonName.split(/\s+/)[0] || seasonCode,
        seasonImg,
        seasonSprite: fifaAddictSeason ? {
          className: fifaAddictSeason.className,
          spriteUrl: fifaAddictSeason.spriteUrl,
          backgroundPosition: fifaAddictSeason.backgroundPosition,
          backgroundSize: fifaAddictSeason.backgroundSize,
          width: fifaAddictSeason.width,
          height: fifaAddictSeason.height,
        } : null,
        sortOrder: Number.isFinite(fifaAddictSeason?.sortOrder) ? fifaAddictSeason.sortOrder : null,
        seasonSort: season.seasonSort,
        count: season.count,
      };
    }).sort((a, b) => {
      const aOrder = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.POSITIVE_INFINITY;
      const bOrder = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.POSITIVE_INFINITY;
      if (aOrder !== bOrder) return aOrder - bOrder;
      if (a.seasonSort !== b.seasonSort) return b.seasonSort - a.seasonSort;
      return b.count - a.count;
    }).map(({ sortOrder, seasonSort, ...season }) => season);

    const payload = {
      success: true,
      totalPlayers: count,
      seasons,
      availablePositions: dbPositions.sort(),
      nations: (dbNations || []).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')),
      leagues: (dbLeagues || []).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')),
      hiddenTraits: (dbHiddenTraits || []).filter(Boolean).sort((a, b) => a.localeCompare(b)),
      topClubs: (dbTopClubs || []).map(r => r.club).filter(Boolean),
    };

    playerMetaCache = payload;
    playerMetaCacheAt = Date.now();

    res.json(payload);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching player metadata',
      error: error.message,
    });
  }
};

// POST /api/players/sync-nexon - Import player-season metadata from Nexon
export const syncPlayersFromNexon = async (req, res) => {
  try {
    const result = await syncNexonPlayers({ limit: req.body?.limit });

    res.json({
      success: true,
      message: 'Nexon player metadata synced',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error syncing Nexon metadata',
      error: error.message,
    });
  }
};

// GET /api/players/:id/detail - Player + enrichment
export const getPlayerDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoId = id.replace('enrichment-', '');

    let enrichment = await PlayerEnrichment.findById(mongoId).lean();
    if (!enrichment) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // Self-healing: fetch missing detail on demand
    try {
      const updated = await ensureEnrichmentDetail(enrichment);
      if (updated) enrichment = typeof updated.toObject === 'function' ? updated.toObject() : updated;
    } catch (detailError) {
      // Serve cached data if live fetch fails
    }

    res.json({
      success: true,
      data: {
        player: {
          _id: String(enrichment._id),
          name: enrichment.displayNameVi || enrichment.displayNameEn,
          overall: enrichment.overall,
        },
        enrichment,
        relatedSeasons: await getRelatedSeasons({ enrichment }),
        usage: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching player detail',
      error: error.message,
    });
  }
};

// GET /api/players/:id - Get single player
export const getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    res.json({
      success: true,
      data: player,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching player',
      error: error.message,
    });
  }
};

// GET /api/players/:slug - Get player by slug
export const getPlayerBySlug = async (req, res) => {
  try {
    const player = await Player.findOne({ slug: req.params.slug });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    res.json({
      success: true,
      data: player,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching player',
      error: error.message,
    });
  }
};

// POST /api/players - Create player (admin)
export const createPlayer = async (req, res) => {
  try {
    const player = new Player(req.body);
    await player.save();

    res.status(201).json({
      success: true,
      data: player,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating player',
      error: error.message,
    });
  }
};

// PUT /api/players/:id - Update player
export const updatePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found',
      });
    }

    res.json({
      success: true,
      data: player,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating player',
      error: error.message,
    });
  }
};

// Admin cleanup
// mode = 'nexon' (default): xóa Nexon + Alias + enrichment rỗng
// mode = 'all': xóa sạch TẤT CẢ để fetch lại từ đầu
export const cleanupData = async (req, res) => {
  try {
    const mode = req.body?.mode || 'nexon';
    await Player.deleteMany({});
    await PlayerAlias.deleteMany({});

    if (mode === 'all') {
      const r = await PlayerEnrichment.deleteMany({});
      return res.json({ success: true, message: `Đã xóa SẠCH ${r.deletedCount} bản ghi. Sẵn sàng fetch lại từ đầu.` });
    }

    const r = await PlayerEnrichment.deleteMany({ overall: { $in: [0, null] }, source: 'fifaaddict-vn' });
    res.json({ success: true, message: `Dọn dẹp xong: xóa Nexon/Alias + ${r.deletedCount} bản ghi rỗng.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
