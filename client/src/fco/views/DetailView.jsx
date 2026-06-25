import { useState, useEffect } from 'react';
import { fetchPlayerDetail } from '../api.js';
import MonetizationSlot from '../../components/monetization/MonetizationSlot';
import { formatCoins, statColor, cleanName, getSeason, getTrust } from '../helpers.js';
import { PlayerAvatar, SeasonChip, TrustBadge, Button, Stars, EmptyState } from '../ui.jsx';
import { getOvrIncreaseForLevel } from '../upgradeHelpers.js';
import * as I from '../Icons.jsx';

const STAT_GROUPS = [
  { key: 'pace',      label: 'Tốc độ',     en: 'Pace' },
  { key: 'shooting',  label: 'Dứt điểm',   en: 'Shooting' },
  { key: 'passing',   label: 'Chuyền bóng', en: 'Passing' },
  { key: 'dribbling', label: 'Kỹ thuật',   en: 'Dribbling' },
  { key: 'defending', label: 'Phòng thủ',  en: 'Defending' },
  { key: 'physical',  label: 'Thể lực',    en: 'Physical' },
];

const GK_STAT_GROUPS = [
  { key: 'diving',      label: 'Đổ người',    en: 'Diving' },
  { key: 'handling',    label: 'Bắt bóng',    en: 'Handling' },
  { key: 'kicking',     label: 'Phát bóng',   en: 'Kicking' },
  { key: 'reflexes',    label: 'Phản xạ',     en: 'Reflexes' },
  { key: 'speed',       label: 'Tốc độ',      en: 'Speed' },
  { key: 'positioning', label: 'Chọn vị trí', en: 'Positioning' },
];

const GK_GROUP = { key: 'gk', label: 'Thủ môn', en: 'Goalkeeper' };
const DEFAULT_STAT_ORDER = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'gk'];
const POSITION_STAT_ORDER = {
  ST: ['shooting', 'pace', 'dribbling', 'physical', 'passing', 'defending', 'gk'],
  CF: ['shooting', 'dribbling', 'passing', 'pace', 'physical', 'defending', 'gk'],
  LW: ['pace', 'dribbling', 'shooting', 'passing', 'physical', 'defending', 'gk'],
  RW: ['pace', 'dribbling', 'shooting', 'passing', 'physical', 'defending', 'gk'],
  LM: ['pace', 'passing', 'dribbling', 'shooting', 'physical', 'defending', 'gk'],
  RM: ['pace', 'passing', 'dribbling', 'shooting', 'physical', 'defending', 'gk'],
  CAM: ['passing', 'dribbling', 'shooting', 'pace', 'physical', 'defending', 'gk'],
  CM: ['passing', 'dribbling', 'physical', 'defending', 'shooting', 'pace', 'gk'],
  CDM: ['defending', 'physical', 'passing', 'pace', 'dribbling', 'shooting', 'gk'],
  LWB: ['pace', 'defending', 'physical', 'passing', 'dribbling', 'shooting', 'gk'],
  RWB: ['pace', 'defending', 'physical', 'passing', 'dribbling', 'shooting', 'gk'],
  LB: ['defending', 'pace', 'physical', 'passing', 'dribbling', 'shooting', 'gk'],
  RB: ['defending', 'pace', 'physical', 'passing', 'dribbling', 'shooting', 'gk'],
  CB: ['defending', 'physical', 'pace', 'passing', 'dribbling', 'shooting', 'gk'],
  GK: ['gk', 'pace', 'passing', 'physical', 'defending', 'dribbling', 'shooting'],
};

const GRADE_OPTIONS = Array.from({ length: 14 }, (_, value) => value);
const OVR_POSITION = 'OVR';
const GK_POSITION = 'GK';
const OVR_STAT_KEY = 'ovr';
const GRADE_STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];

function getOvrBonusForGrade(grade) {
  return grade === 0 ? -3 : getOvrIncreaseForLevel(grade);
}

function getStatBonusForGrade(grade) {
  return Math.max(0, Number(grade) - 1);
}

function addGrade(value, grade) {
  if (value == null) return value;
  const number = Number(value);
  return Number.isFinite(number) ? number + grade : value;
}

function expandPositionLabel(label) {
  if (!label || label === OVR_POSITION) return [];
  if (label.startsWith('L/R')) return [`L${label.slice(3)}`, `R${label.slice(3)}`];
  return [label];
}

function getStatOrderForPosition(label) {
  const positions = expandPositionLabel(label);
  return POSITION_STAT_ORDER[positions[0]] || DEFAULT_STAT_ORDER;
}

function applyGradeBonus(player, grade) {
  if (grade == null) return player;

  const ovrBonus = getOvrBonusForGrade(grade);
  const statBonus = getStatBonusForGrade(grade);
  const detailed = player.detailed
    ? Object.fromEntries(Object.entries(player.detailed).map(([group, value]) => [
        group,
        Array.isArray(value)
          ? value.map((stat) => ({ ...stat, value: addGrade(stat.value, statBonus) }))
          : Object.fromEntries(Object.entries(value).map(([key, statValue]) => [key, addGrade(statValue, statBonus)])),
      ]))
    : player.detailed;

  return {
    ...player,
    [OVR_STAT_KEY]: addGrade(player[OVR_STAT_KEY], ovrBonus),
    ...Object.fromEntries(GRADE_STAT_KEYS.map((key) => [key, addGrade(player[key], statBonus)])),
    positionRatings: player.positionRatings?.map((rating) => ({ ...rating, value: addGrade(rating.value, ovrBonus) })) || [],
    detailed,
    boost: grade,
    ovrBoost: ovrBonus,
  };
}

export default function DetailView({ id, isAdmin, watch, onToggleWatch, onBack, onSelect, onCompare }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [grade, setGrade] = useState(1);
  const [activePosition, setActivePosition] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    setGrade(1);
    setActivePosition('');
    fetchPlayerDetail(id)
      .then(res => { setData(res); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) return <LoadingDetail />;
  if (error || !data) return (
    <EmptyState icon={I.Alert} title="Không tải được cầu thủ"
      body={error || 'Đã xảy ra lỗi không xác định.'}
      action={<Button variant="outline" icon={I.ArrowLeft} onClick={onBack}>Quay lại</Button>} />
  );

  const { player, related } = data;
  const p = applyGradeBonus(player, grade);
  const s = getSeason(p.season);
  const trust = getTrust(p.trust);
  const positionRatings = [{ code: OVR_POSITION, label: OVR_POSITION, value: p.ovr }, ...(p.positionRatings || [])];
  const defaultPosition = p.positionRatings?.find((rating) => rating.recommended)?.label || OVR_POSITION;
  const selectedPosition = activePosition || defaultPosition;
  const activeRating = positionRatings.find((rating) => rating.label === selectedPosition);
  const displayedOvr = activeRating?.value ?? p.ovr;
  const selectedPositions = expandPositionLabel(selectedPosition);
  const displayedPositions = selectedPositions.length
    ? [...selectedPositions, ...(p.positions || []).filter((pos) => !selectedPositions.includes(pos))]
    : p.positions;
  const statOrder = getStatOrderForPosition(selectedPosition);
  const summaryGroups = getSummaryGroups(p, statOrder, selectedPosition);
  const bioItems = [
    p.nation,
    p.club,
    p.league,
    p.age ? `${p.age} tuổi` : '',
    p.birthDate,
    p.height ? `${p.height}cm / ${p.weight || '—'}kg` : '',
    p.foot === 'right' ? 'Chân phải' : p.foot === 'left' ? 'Chân trái' : '',
    p.workRateAttack ? `Xu hướng ${p.workRateAttack}/${p.workRateDefense}` : '',
  ].filter(Boolean);
  const watched = watch.includes(p.id);

  return (
    <div className="fco-detail">
      {/* Breadcrumb */}
      <div className="fco-detail-top">
        <Button variant="ghost" size="sm" icon={I.ArrowLeft} onClick={onBack}>Database</Button>
        <div className="fco-breadcrumb">
          <I.ChevronRight size={13} />
          <span>{cleanName(p.name)}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Button variant="outline" size="sm" icon={watched ? I.StarFill : I.Star}
            style={watched ? { color: '#f5c84b' } : {}}
            onClick={() => onToggleWatch(p.id)}>
            {watched ? 'Đã theo dõi' : 'Theo dõi'}
          </Button>
          <Button variant="outline" size="sm" icon={I.Compare} onClick={() => onCompare(p.id)}>So sánh</Button>
        </div>
      </div>

      <div className="fa-detail-sheet" style={{ '--season-ring': s.ring }}>
        <div className="fa-detail-hero">
          <div className="fa-detail-main">
            <div className="fa-title-row">
              <SeasonChip code={p.season} name={p.seasonName} img={p.seasonImg} full />
              {isAdmin && trust && <TrustBadge id={p.trust} size="sm" />}
              <span className="fa-primary-pos">{selectedPosition || p.primaryPos}</span>
              <span className="fa-hero-ovr" style={{ color: statColor(displayedOvr) }}>{displayedOvr}</span>
            </div>
            <h1 className="fa-player-name">{cleanName(p.name)}</h1>
            <div className="fa-bio-grid">
              {bioItems.map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="fa-position-pills">
              {displayedPositions?.map((pos, i) => (
                <span key={pos} className={i > 0 ? 'muted' : ''}>{pos}</span>
              ))}
            </div>
            <div className="fa-economy-row">
              {p.price > 0 && <span><I.Coins size={12} />Giá <b>{formatCoins(p.price)}</b></span>}
              {p.salary > 0 && <span><I.Wallet size={12} />Lương <b>{p.salary}</b></span>}
              {p.ovrBoost > 0 && <span>OVR boost <b>+{p.ovrBoost}</b></span>}
            </div>
          </div>

          <div className="fa-upgrade-panel">
            <div className="fa-upgrade-label">UPGRADE</div>
            <GradeSelector grade={grade} onChange={setGrade} />
          </div>

          <div className="fa-player-art">
            <PlayerAvatar player={p} size={132} />
          </div>
        </div>

        <SummaryStats groups={summaryGroups} />

        {positionRatings.length > 1 && (
          <PositionRatingsRow
            ratings={positionRatings}
            selectedPosition={selectedPosition}
            onSelect={setActivePosition}
          />
        )}
      </div>

      {/* Korean banner */}
      {isAdmin && p.koreanRaw && (
        <div className="fco-banner kr">
          <I.Languages size={18} style={{ flex: '0 0 18px', marginTop: 2 }} />
          <div>
            <b>Metadata tiếng Hàn</b> — Tên gốc: <code style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.koreanRaw}</code>
            <br /><span style={{ fontSize: 12.5 }}>Cầu thủ chưa được dịch tên / đối chiếu sang tiếng Việt.</span>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="fco-detail-grid">
        <div className="fco-detail-left">
          {/* Stats panel */}
          <div className="fco-panel">
            <div className="fco-panel-head">
              <div className="fco-panel-title">Chỉ số {selectedPosition && <span className="fco-panel-title-sub">{selectedPosition}</span>}</div>
            </div>
            <div className="fco-panel-body">
              {p.detailed
                ? <AllStats p={p} order={statOrder} />
                : <MainOnlyStats p={p} order={statOrder} />
              }
            </div>
          </div>


          {/* Traits */}
          {p.traitsDescription?.length > 0 ? (
            <div className="fco-panel">
              <div className="fco-panel-head"><div className="fco-panel-title">Kỹ năng ẩn</div></div>
              <div className="fco-panel-body">
                <div className="fco-traits-detail">
                  {p.traitsDescription.map((td, i) => (
                    <div key={i} className="fco-trait-desc-item">
                      <div className="fco-trait-desc-name">
                        {td.iconUrl
                          ? <img className="fco-trait-icon" src={td.iconUrl} alt="" onError={e => { e.target.style.display = 'none'; }} />
                          : <I.Zap size={15} style={{ color: 'var(--accent)' }} />}
                        <span>{td.name}</span>
                      </div>
                      <div className="fco-trait-desc-text">{td.description || 'Chưa có mô tả cho kỹ năng này.'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : p.traits?.length > 0 ? (
            <div className="fco-panel">
              <div className="fco-panel-head"><div className="fco-panel-title">Kỹ năng ẩn</div></div>
              <div className="fco-panel-body">
                <div className="fco-traits">
                  {p.traits.map((t, i) => (
                    <span key={i} className="fco-trait"><I.Zap size={12} />{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Team Colors */}
          {p.teamColor?.length > 0 && (
            <div className="fco-panel">
              <div className="fco-panel-head"><div className="fco-panel-title">Team Color (CLB từng khoác áo)</div></div>
              <div className="fco-panel-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {p.teamColor.map((tc, i) => (
                    <span key={i} style={{ fontSize: 12.5, fontWeight: 550, padding: '4px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-dim)' }}>{tc}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lịch sử thi đấu CLB */}
          {p.clubCareer?.length > 0 && (
            <div className="fco-panel">
              <div className="fco-panel-head"><div className="fco-panel-title">Lịch sử thi đấu</div></div>
              <div className="fco-panel-body">
                <div className="fco-club-history">
                  {p.clubCareer.map((c, i) => (
                    <div key={i} className="fco-club-history-row">
                      <span className="fco-club-history-team">{c.team}</span>
                      {c.season && <span className="fco-club-history-season">{c.season}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="fco-detail-right">
          {/* Profile */}
          <div className="fco-panel">
            <div className="fco-panel-head"><div className="fco-panel-title">Thông tin cầu thủ</div></div>
            <div className="fco-panel-body">
              <div className="fco-skillrow">
                <div className="fco-kv">
                  <div className="fco-kv-k">Kỹ thuật</div>
                  <Stars n={p.skillMoves} />
                </div>
                <div className="fco-kv">
                  <div className="fco-kv-k">Chân yếu</div>
                  <Stars n={p.weakFoot} />
                </div>
                <div className="fco-kv">
                  <div className="fco-kv-k">Thuận chân</div>
                  <div className="fco-kv-v">{p.foot === 'right' ? 'Phải' : p.foot === 'left' ? 'Trái' : '—'}</div>
                </div>
              </div>
              <div className="fco-kvgrid">
                <div className="fco-kv"><div className="fco-kv-k">Quốc tịch</div><div className="fco-kv-v">{p.nation || '—'}</div></div>
                <div className="fco-kv"><div className="fco-kv-k">CLB hiện tại</div><div className="fco-kv-v">{p.club || '—'}</div></div>
                <div className="fco-kv"><div className="fco-kv-k">Giải đấu</div><div className="fco-kv-v">{p.league || '—'}</div></div>
                <div className="fco-kv"><div className="fco-kv-k">Ngày sinh</div><div className="fco-kv-v">{p.birthDate || '—'}</div></div>
                <div className="fco-kv"><div className="fco-kv-k">Thể hình</div><div className="fco-kv-v">{p.height ? `${p.height}cm / ${p.weight}kg` : '—'}</div></div>
                <div className="fco-kv"><div className="fco-kv-k">Tuổi</div><div className="fco-kv-v">{p.age ? `${p.age} tuổi` : '—'}</div></div>
                <div className="fco-kv"><div className="fco-kv-k">Xu hướng</div><div className="fco-kv-v">{p.workRateAttack ? `${p.workRateAttack} / ${p.workRateDefense}` : '—'}</div></div>
                <div className="fco-kv"><div className="fco-kv-k">Danh tiếng</div><div className="fco-kv-v">{p.reputation || '—'}</div></div>
              </div>
            </div>
          </div>

          <MonetizationSlot
            placement="player_detail_sidebar"
            entity={p.id ? { type: 'player', id: String(p.id) } : null}
            className="space-y-3"
          />

          {/* Trust (admin) */}
          {isAdmin && trust && (
            <div className="fco-panel">
              <div className="fco-panel-head"><div className="fco-panel-title">Độ tin cậy dữ liệu</div></div>
              <div className="fco-panel-body">
                <div className="fco-trust-row">
                  <span className="fco-trust-big" style={{ color: trust.color, borderColor: trust.color + '44', background: trust.color + '12' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: trust.dot, boxShadow: `0 0 6px ${trust.dot}` }} />
                    {trust.vi}
                  </span>
                </div>
                <p className="fco-trust-desc">{trust.desc}</p>
                <div className="fco-trust-srcs">
                  <div className="fco-src">
                    <span className={`fco-src-dot ${p._raw?.spid ? 'ok' : 'miss'}`} />
                    Nexon Open API
                    {p._raw?.spid && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>spid:{p.spid}</span>}
                  </div>
                  <div className="fco-src">
                    <span className={`fco-src-dot ${p._raw?.enrichment ? 'ok' : 'miss'}`} />
                    FIFAAddict (vn.fifaaddict.com)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related seasons */}
      {related?.length > 0 && (
        <div className="fco-related">
          <div className="fco-section-title">
            <I.Layers size={16} />
            Các phiên bản khác
            <span className="fco-section-sub">{related.length} thẻ</span>
          </div>
          <div className="fco-relgrid">
            {related.map(r => (
              <div key={r.id} className="fco-relcard" onClick={() => onSelect(r.id)}>
                <PlayerAvatar player={r} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cleanName(r.name)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                    <SeasonChip code={r.season} name={r.seasonName} img={r.seasonImg} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: statColor(r.ovr), fontWeight: 700 }}>{r.ovr}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStats({ groups }) {
  return (
    <div className="fa-summary-strip">
      {groups.slice(0, 6).map((group) => (
        <div key={group.key} className="fa-summary-cell">
          <div className="fa-summary-value" style={{ color: group.value != null ? statColor(group.value) : 'var(--text-faint)' }}>
            {group.value ?? '—'}
          </div>
          <div className="fa-summary-label">{group.label}</div>
        </div>
      ))}
    </div>
  );
}

function PositionRatingsRow({ ratings, selectedPosition, onSelect }) {
  return (
    <div className="fa-position-row" aria-label="Chỉ số theo vị trí">
      {ratings.map((rating, i) => {
        const isActive = rating.label === selectedPosition;
        return (
          <button
            key={`${rating.label}-${i}`}
            type="button"
            className={`fa-position-rating${rating.recommended ? ' rec' : ''}${isActive ? ' on' : ''}`}
            onClick={() => onSelect(rating.label)}
            aria-pressed={isActive}
          >
            <span>
              {rating.label}
              {rating.recommended && <I.StarFill size={8} />}
            </span>
            <strong style={{ color: rating.value != null ? statColor(rating.value) : 'var(--text-faint)' }}>{rating.value ?? '—'}</strong>
          </button>
        );
      })}
    </div>
  );
}

function GradeSelector({ grade, onChange }) {
  return (
    <div className="fco-grade-selector" aria-label="FO4 Grade">
      <div className="fco-grade-title">
        <span>FO4 Grade</span>
        <strong>+{grade}</strong>
      </div>
      <div className="fco-grade-grid">
        {GRADE_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            className={`fco-grade-btn grade${value}${grade === value ? ' on' : ''}`}
            onClick={() => onChange(value)}
            aria-pressed={grade === value}
            title={`Grade +${value}`}
          >
            +{value}
          </button>
        ))}
      </div>
    </div>
  );
}

// Một dòng chỉ số thành phần: tên bên trái, số bên phải (màu theo statColor).
// Không dùng progress bar — màu text đã thể hiện mạnh/yếu.
function AttrLine({ label, value }) {
  return (
    <div className="fco-attr-line">
      <span className="fco-attr-line-lab">{label}</span>
      <span className="fco-attr-line-val" style={{ color: value != null ? statColor(value) : 'var(--text-faint)' }}>
        {value != null ? value : '—'}
      </span>
    </div>
  );
}

function AllStats({ p, order }) {
  const groups = buildStatGroups(p, order).filter((group) => group.subs.some((stat) => stat.value != null));

  return (
    <div className="fa-attribute-grid">
      {groups.map((group) => (
        <section key={group.key} className={`fa-attribute-group${group.key === 'gk' ? ' gk' : ''}`}>
          <header className="fa-attribute-group-head">
            <span>{group.label}</span>
            <strong style={{ color: group.value != null ? statColor(group.value) : 'var(--text-faint)' }}>{group.value ?? '—'}</strong>
          </header>
          <div className="fco-attr-lines">
            {group.subs.filter((stat) => stat.value != null).map((stat) => (
              <AttrLine key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MainOnlyStats({ p, order }) {
  const vals = buildStatGroups(p, order).filter((group) => group.value != null);
  return (
    <div>
      <div className="fco-mainonly">
        {vals.map((group) => (
          <div key={group.key} className="fco-mainonly-cell">
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 22, color: statColor(group.value) }}>{group.value}</div>
            <div className="fco-mainonly-lab">{group.label}</div>
          </div>
        ))}
      </div>
      <div className="fco-locked-note">
        <I.Lock size={14} />
        Chưa có chỉ số chi tiết — cần đồng bộ FIFAAddict
      </div>
    </div>
  );
}

function getSummaryGroups(p, order, selectedPosition) {
  if ((selectedPosition === GK_POSITION || p.primaryPos === GK_POSITION) && p.detailed?.gk) {
    const gkGroups = GK_STAT_GROUPS.map((group) => ({ ...group, value: p.detailed.gk[group.key] ?? null }));
    if (gkGroups.some((group) => group.value != null)) return gkGroups;
  }

  return buildStatGroups(p, order).filter((group) => group.key !== 'gk' && group.value != null);
}

function buildStatGroups(p, order) {
  const byKey = Object.fromEntries(STAT_GROUPS.map((group) => [group.key, {
    ...group,
    value: p[group.key],
    subs: p.detailed?.[group.key] || [],
  }]));

  const gkStats = GK_STAT_GROUPS.map((group) => ({ label: group.label, value: p.detailed?.gk?.[group.key] ?? null }));
  const gkValues = gkStats.map((stat) => stat.value).filter((value) => value != null);
  byKey.gk = {
    ...GK_GROUP,
    value: gkValues.length ? Math.round(gkValues.reduce((sum, value) => sum + value, 0) / gkValues.length) : null,
    subs: gkStats,
  };

  return [...order, ...DEFAULT_STAT_ORDER.filter((key) => !order.includes(key))]
    .map((key) => byKey[key])
    .filter(Boolean);
}

function LoadingDetail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ height: 42, borderRadius: 10, background: 'var(--surface-2)' }} className="fco-sk" />
      <div style={{ height: 160, borderRadius: 16, background: 'var(--surface)' }} className="fco-sk" />
      <div style={{ height: 320, borderRadius: 14, background: 'var(--surface)' }} className="fco-sk" />
    </div>
  );
}
