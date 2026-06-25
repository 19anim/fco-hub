import { SEASONS_META, POSITIONS_META, TRUST_META } from './constants.js';

export function formatCoins(n) {
  if (!n) return '0';
  if (n >= 1e9) {
    const val = n / 1e9;
    const formatted = val >= 10 ? Math.round(val).toLocaleString('en-US') : val.toFixed(1);
    return formatted + ' B';
  }
  if (n >= 1e6) return (n / 1e6).toFixed(0).toLocaleString('en-US') + ' tr';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k';
  return String(n);
}

export function statColor(v) {
  const value = Number(v);
  if (!Number.isFinite(value)) return '#6b6e76';
  if (value >= 130) return '#dc0000';
  if (value >= 120) return '#cf13c0';
  if (value >= 110) return '#b33bff';
  if (value >= 100) return '#6e3bff';
  if (value >= 90) return '#175dde';
  if (value >= 80) return '#2194d6';
  if (value >= 70) return '#deded8';
  if (value >= 60) return '#9ea6b2';
  return '#6b6e76';
}

export function initials(name) {
  const clean = (name || '').replace(/\(.*?\)/g, '').replace(/[가-힣]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return (name || '').slice(0, 2);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function cleanName(name) {
  return (name || '').replace(/\(.*?\)/g, '').trim();
}

export function getSeason(seasonCode) {
  if (!seasonCode) return SEASONS_META.NG;
  const key = String(seasonCode).toUpperCase();
  return SEASONS_META[key] || SEASONS_META.NG;
}

export function getPos(pos) {
  return POSITIONS_META[pos] || { group: 'MID', color: '#9aa3af' };
}

export function getTrust(id) {
  return TRUST_META[id] || null;
}

export function getPosGroup(pos) {
  return (POSITIONS_META[pos] || {}).group || 'MID';
}

// Derive trust status from enrichment data quality.
// Đơn giản hoá: chỉ 2 trạng thái — đã đồng bộ (có chỉ số) hoặc thiếu chi tiết.
export function deriveTrust(player) {
  const e = player.enrichment;
  if (!e) return 'missing_detail';
  const dq = e.dataQuality || {};
  if (dq.hasStats || e.overall) return 'synced';
  return 'missing_detail';
}

const POS_VN = {
  ST: 'TĐ', CF: 'HĐ', LW: 'CTT', RW: 'CTP',
  CAM: 'TVTC', CM: 'TVTT', CDM: 'TVPN', LM: 'TVT', RM: 'TVP',
  CB: 'CB', LB: 'HVTr', RB: 'HVP', LWB: 'HVBT', RWB: 'HVBP',
  GK: 'TM'
};

export function getPosVn(pos) {
  return POS_VN[pos] || pos;
}

// Normalize a player from server API to FCO Hub format
export function normalizePlayer(raw) {
  if (!raw) return {};
  const e = raw.enrichment || {};
  const positions = e.positions?.map(p => p.position).filter(Boolean) || [];
  const primaryPos = e.bestPosition || raw.position || positions[0] || 'CM';

  // Prefer real FIFAAddict/Nexon season code so season icons render accurately.
  const seasonCode = String(e.seasonCode || raw.seasonId || raw.seasonCode || deriveSeasonCode(raw.seasonName || raw.cardType || e.seasonName || ''));
  const seasonNameDisplay = raw.seasonName || e.seasonName || (isNaN(seasonCode) ? seasonCode : '');

  // Build merged stat map from all available sources (detailedStats > stats > keyStats)
  const statMap = buildStatMap(e);

  // Group stats — prefer enrichment fields, fall back to deriving from statMap
  const pace      = e.pace      ?? raw.pace      ?? deriveGroupStat(statMap, 'pace');
  const shooting  = e.shooting  ?? raw.shooting  ?? deriveGroupStat(statMap, 'shooting');
  const passing   = e.passing   ?? raw.passing   ?? deriveGroupStat(statMap, 'passing');
  const dribbling = e.dribbling ?? raw.dribbling ?? deriveGroupStat(statMap, 'dribbling');
  const defending = e.defending ?? raw.defending ?? deriveGroupStat(statMap, 'defending');
  const physical  = e.physical  ?? raw.physical  ?? deriveGroupStat(statMap, 'physical');

  const trust = deriveTrust(raw);

  // Detailed stats from merged stat map
  const detailed = buildDetailed(statMap);

  return {
    id: String(raw._id),
    spid: raw.spid,
    name: e.displayNameVi || e.fullNameVi || raw.name || '',
    nameEn: e.displayNameEn || '',
    fullName: e.fullNameVi || e.displayNameVi || '',
    season: seasonCode,
    seasonName: seasonNameDisplay || seasonCode,
    seasonImg: raw.seasonImg || e.seasonImg || '',
    primaryPos,
    primaryPosVn: getPosVn(primaryPos),
    positions: positions.length ? positions : [primaryPos],
    positionsVn: (positions.length ? positions : [primaryPos]).map(getPosVn),
    ovr: e.overall ?? raw.overall ?? 0,
    club: e.club || raw.club || '',
    nation: e.nation || raw.nation || '',
    league: e.league || raw.league || '',
    salary: e.salary ?? e.fp ?? raw.salary ?? 0,
    price: e.price ?? raw.marketPrice ?? 0,
    pace, shooting, passing, dribbling, defending, physical,
    skillMoves: e.skillMoves ?? 1,
    weakFoot: e.weakFoot ?? 1,
    foot: e.preferredFoot || 'right',
    traits: e.hiddenTraits || [],
    traitsDescription: e.traitsDescription || [],
    positionRatings: e.positionRatings || [],
    clubCareer: e.clubCareer || [],
    workRateAttack: e.workRateAttack || '2',
    workRateDefense: e.workRateDefense || '2',
    teamColor: e.teamColor || [],
    birthDate: e.birthDateText || '',
    reputation: e.reputation || '',
    trust,
    height: e.heightCm || null,
    weight: e.weightKg || null,
    age: e.age || null,
    imageUrl: e.imageUrl || raw.imageUrl || '',
    koreanRaw: /[가-힣]/.test(raw.name || '') ? raw.name : null,
    detailed,
    boost: 0,
    isEnrichmentOnly: raw.isEnrichmentOnly || false,
    _raw: raw,
  };
}

function deriveSeasonCode(seasonName) {
  if (!seasonName) return 'NG';
  const s = seasonName.toUpperCase();
  if (s.includes('ICON')) return 'ICON';
  if (s.includes('TOTY') || s.includes('TEAM OF THE YEAR')) return 'TOTY';
  if (s.includes('TOTS') || s.includes('TEAM OF THE SEASON')) return 'TOTS';
  if (s.includes('LH') || s.includes('LIVE')) return 'LH';
  if (s.includes('NHD') || s.includes('NEW HEROES')) return 'NHD';
  if (s.includes('MOTM') || s.includes('MAN OF THE MATCH')) return 'MOTM';
  if (s.includes('TKI') || s.includes('TOTY KIT')) return 'TKI';
  if (s.includes('BTB') || s.includes('BACK TO BACK')) return 'BTB';
  if (s.includes('UP') || s.includes('UPGRADE')) return 'UP';
  return 'NG';
}

const STAT_KEY_MAP = {
  // pace
  'tốc độ': 'sprintSpeed', 'sprint speed': 'sprintSpeed', 'sprintspeed': 'sprintSpeed',
  'tăng tốc': 'acceleration', 'acceleration': 'acceleration',
  // shooting
  'dứt điểm': 'finishing', 'finishing': 'finishing',
  'lực sút': 'shotPower', 'shot power': 'shotPower', 'shotpower': 'shotPower',
  'sút xa': 'longShots', 'long shots': 'longShots', 'longshots': 'longShots',
  'vô-lê': 'volleys', 'volleys': 'volleys',
  'penalty': 'penalties', 'penalties': 'penalties',
  'chọn vị trí': 'positioning', 'positioning': 'positioning',
  // passing
  'ch.ngắn': 'shortPassing', 'chuyền ngắn': 'shortPassing', 'short passing': 'shortPassing', 'shortpassing': 'shortPassing',
  'tầm nhìn': 'vision', 'vision': 'vision',
  'tạt bóng': 'crossing', 'crossing': 'crossing',
  'ch.dài': 'longPassing', 'chuyền dài': 'longPassing', 'long passing': 'longPassing', 'longpassing': 'longPassing',
  'đá phạt': 'fkAccuracy', 'fk accuracy': 'fkAccuracy', 'freekickaccuracy': 'fkAccuracy',
  'sút xoáy': 'curve', 'curve': 'curve',
  // dribbling
  'rê bóng': 'dribbling', 'dribbling': 'dribbling',
  'giữ bóng': 'ballControl', 'ball control': 'ballControl', 'ballcontrol': 'ballControl',
  'khéo léo': 'agility', 'agility': 'agility',
  'thăng bằng': 'balance', 'balance': 'balance',
  'phản ứng': 'reactions', 'reactions': 'reactions',
  'bình tĩnh': 'composure', 'binh tĩnh': 'composure', 'composure': 'composure',
  // defending
  'kèm người': 'defAwareness', 'marking': 'defAwareness',
  'lấy bóng': 'standingTackle', 'lắy bóng': 'standingTackle', 'tackle': 'standingTackle', 'standingtackle': 'standingTackle',
  'cắt bóng': 'interceptions', 'interceptions': 'interceptions',
  'xoạc bóng': 'slidingTackle', 'sliding tackle': 'slidingTackle', 'slidingtackle': 'slidingTackle',
  'đánh đầu': 'heading', 'heading': 'heading', 'headingaccuracy': 'heading',
  // physical
  'sức mạnh': 'strength', 'strength': 'strength',
  'thể lực': 'stamina', 'stamina': 'stamina',
  'quyết đoán': 'aggression', 'aggression': 'aggression',
  'nhảy': 'jumping', 'jumping': 'jumping',
  // gk
  'tm đổ người': 'diving', 'gk diving': 'diving', 'gkdiving': 'diving',
  'tm bắt bóng': 'handling', 'gk handling': 'handling', 'gkhandling': 'handling',
  'tm phát bóng': 'kicking', 'gk kicking': 'kicking', 'gkkicking': 'kicking',
  'tm phản xạ': 'reflexes', 'gk reflexes': 'reflexes', 'gkreflexes': 'reflexes',
  'tm chọn vị trí': 'gkPositioning', 'gk positioning': 'gkPositioning', 'gkpositioning': 'gkPositioning',
};

// Build a merged stat map from all enrichment stat sources
function buildStatMap(e) {
  const byKey = {};
  // Priority: keyStats (low) < stats < detailedStats (high)
  for (const arr of [e.keyStats || [], e.stats || [], e.detailedStats || []]) {
    for (const s of arr) {
      if (!s || s.value == null || s.value <= 0) continue;
      const label = (s.labelVi || s.key || '').toLowerCase().trim();
      const mappedKey = STAT_KEY_MAP[label] || s.key;
      if (mappedKey) byKey[mappedKey] = s.value;
    }
  }
  return byKey;
}

// Derive a group stat average from individual sub-stats
const GROUP_STAT_KEYS = {
  pace:      ['sprintSpeed', 'acceleration'],
  shooting:  ['finishing', 'shotPower', 'longShots', 'volleys', 'penalties', 'positioning'],
  passing:   ['shortPassing', 'vision', 'crossing', 'longPassing', 'fkAccuracy', 'curve'],
  dribbling: ['dribbling', 'ballControl', 'agility', 'balance', 'reactions', 'composure'],
  defending: ['defAwareness', 'standingTackle', 'interceptions', 'slidingTackle', 'heading'],
  physical:  ['strength', 'stamina', 'aggression', 'jumping'],
};

function deriveGroupStat(statMap, group) {
  const keys = GROUP_STAT_KEYS[group] || [];
  const vals = keys.map(k => statMap[k]).filter(v => v != null && v > 0);
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function buildDetailed(statMap) {
  if (!Object.keys(statMap).length) return null;
  const v = statMap;

  return {
    gk: {
      diving: v.diving ?? null,
      handling: v.handling ?? null,
      kicking: v.kicking ?? null,
      reflexes: v.reflexes ?? null,
      speed: v.sprintSpeed ?? v.acceleration ?? null,
      positioning: v.gkPositioning ?? null,
    },
    pace: [
      { label: 'Tăng tốc', value: v.acceleration ?? null },
      { label: 'Tốc độ', value: v.sprintSpeed ?? null },
    ],
    shooting: [
      { label: 'Dứt điểm', value: v.finishing ?? null },
      { label: 'Lực sút', value: v.shotPower ?? null },
      { label: 'Sút xa', value: v.longShots ?? null },
      { label: 'Vô-lê', value: v.volleys ?? null },
      { label: 'Penalty', value: v.penalties ?? null },
      { label: 'Chọn vị trí', value: v.positioning ?? null },
    ],
    passing: [
      { label: 'Tầm nhìn', value: v.vision ?? null },
      { label: 'Tạt bóng', value: v.crossing ?? null },
      { label: 'Chuyền ngắn', value: v.shortPassing ?? null },
      { label: 'Chuyền dài', value: v.longPassing ?? null },
      { label: 'Sút xoáy', value: v.curve ?? null },
      { label: 'Đá phạt', value: v.fkAccuracy ?? null },
    ],
    dribbling: [
      { label: 'Khéo léo', value: v.agility ?? null },
      { label: 'Thăng bằng', value: v.balance ?? null },
      { label: 'Phản ứng', value: v.reactions ?? null },
      { label: 'Giữ bóng', value: v.ballControl ?? null },
      { label: 'Rê bóng', value: v.dribbling ?? null },
      { label: 'Bình tĩnh', value: v.composure ?? null },
    ],
    defending: [
      { label: 'Cắt bóng', value: v.interceptions ?? null },
      { label: 'Đánh đầu', value: v.heading ?? null },
      { label: 'Kèm người', value: v.defAwareness ?? null },
      { label: 'Lấy bóng', value: v.standingTackle ?? null },
      { label: 'Xoạc bóng', value: v.slidingTackle ?? null },
    ],
    physical: [
      { label: 'Sức mạnh', value: v.strength ?? null },
      { label: 'Thể lực', value: v.stamina ?? null },
      { label: 'Quyết đoán', value: v.aggression ?? null },
      { label: 'Nhảy', value: v.jumping ?? null },
    ],
  };
}
