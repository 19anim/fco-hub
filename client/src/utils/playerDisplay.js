export function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getValue(value, fallback = 'Chưa có dữ liệu') {
  return value === null || value === undefined || value === '' ? fallback : value;
}

export function formatPrice(value, text) {
  if (text && text !== '0') return text;
  if (!value) return 'Chưa có giá';
  if (value >= 1000000000000) return `${(value / 1000000000000).toFixed(2)}T BP`;
  if (value >= 1000000000) return `${Math.round(value / 1000000000)}B BP`;
  if (value >= 1000000) return `${Math.round(value / 1000000)}M BP`;
  return `${value.toLocaleString()} BP`;
}

const POSITION_TONES = [
  { positions: ['GK'], badge: 'border-amber-400/50 bg-amber-400/15 text-amber-300' },
  {
    positions: ['CB', 'LCB', 'RCB', 'LB', 'RB', 'LWB', 'RWB', 'SW'],
    badge: 'border-sky-400/50 bg-sky-400/15 text-sky-300',
  },
  {
    positions: ['CDM', 'CM', 'CAM', 'LM', 'RM', 'LDM', 'RDM', 'LCM', 'RCM', 'LAM', 'RAM'],
    badge: 'border-emerald-400/50 bg-emerald-400/15 text-emerald-300',
  },
  {
    positions: ['ST', 'CF', 'LW', 'RW', 'LF', 'RF', 'LS', 'RS'],
    badge: 'border-rose-400/50 bg-rose-400/15 text-rose-300',
  },
];

export function getPositionTone(position = '') {
  const tone = POSITION_TONES.find((group) => group.positions.includes(position));
  return tone ? tone.badge : 'border-hairline bg-surface-2 text-ink-muted';
}

export function getOverallTone(overall) {
  if (overall >= 130) return 'text-fuchsia-300';
  if (overall >= 120) return 'text-amber-300';
  if (overall >= 110) return 'text-emerald-300';
  if (overall >= 100) return 'text-sky-300';
  return 'text-ink';
}

export function getStatTone(value) {
  if (value >= 130) return 'bg-fuchsia-400';
  if (value >= 120) return 'bg-amber-400';
  if (value >= 110) return 'bg-emerald-400';
  if (value >= 90) return 'bg-sky-400';
  return 'bg-surface-3';
}

export function getQualityTone(score = 0) {
  if (score >= 90) return 'border-success/40 bg-success/12 text-success';
  if (score >= 60) return 'border-warning/40 bg-warning/12 text-warning';
  return 'border-error/40 bg-error/12 text-error';
}

export function getDisplay(player = {}) {
  const enrichment = player.enrichment || {};
  const dataQuality = enrichment.dataQuality || player.dataQuality || null;
  const detailedStats = enrichment.detailedStats || [];
  const keyStats = enrichment.keyStats?.length ? enrichment.keyStats : enrichment.stats || [];

  return {
    enrichment,
    name: enrichment.displayNameVi || enrichment.displayNameEn || player.name,
    fullName: enrichment.fullNameVi || enrichment.displayNameEn || player.name,
    seasonName: enrichment.seasonName || player.seasonName || player.cardType,
    seasonImg: enrichment.seasonImg || player.seasonImg,
    imageUrl: enrichment.imageUrl || player.imageUrl,
    bestPosition: enrichment.bestPosition || player.position || '',
    overall: enrichment.overall ?? player.overall,
    price: enrichment.price ?? player.marketPrice,
    priceText: enrichment.priceText || '',
    salary: enrichment.salary ?? enrichment.fp ?? player.salary,
    positions: enrichment.positions || [],
    keyStats,
    detailedStats,
    hiddenTraits: enrichment.hiddenTraits || [],
    traitsDescription: enrichment.traitsDescription || [],
    groupStats: {
      pace: enrichment.pace,
      shooting: enrichment.shooting,
      passing: enrichment.passing,
      dribbling: enrichment.dribbling,
      defending: enrichment.defending,
      physical: enrichment.physical,
    },
    club: enrichment.club || player.club,
    nation: enrichment.nation || player.nation,
    league: enrichment.league || player.league,
    heightCm: enrichment.heightCm,
    weightKg: enrichment.weightKg,
    age: enrichment.age,
    weakFoot: enrichment.weakFoot,
    skillMoves: enrichment.skillMoves,
    sourceUrl: enrichment.sourceUrl || player.sourceUrl,
    dataQuality,
    matchStatus: player.enrichmentMatch?.status,
    matchConfidence: player.enrichmentMatch?.confidence,
  };
}
