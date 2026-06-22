import { useState, useEffect } from 'react';
import { fetchPlayerDetail } from '../api.js';
import MonetizationSlot from '../../components/monetization/MonetizationSlot';
import { formatCoins, statColor, cleanName, getSeason, getTrust } from '../helpers.js';
import { PlayerAvatar, OvrBox, PosPill, SeasonChip, TrustBadge, Button, Stars, EmptyState } from '../ui.jsx';
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

export default function DetailView({ id, role, watch, onToggleWatch, onBack, onSelect, onCompare }) {
  const isAdmin = role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
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

  const { player: p, related } = data;
  const s = getSeason(p.season);
  const trust = getTrust(p.trust);
  const isGK = p.primaryPos === 'GK';
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

      {/* Header card */}
      <div className="fco-detail-header" style={{ '--season-ring': s.ring }}>
        <PlayerAvatar player={p} size={88} />

        <div className="fco-detail-id">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SeasonChip code={p.season} name={p.seasonName} img={p.seasonImg} full />
            {isAdmin && trust && <TrustBadge id={p.trust} size="sm" />}
          </div>
          <div className="fco-detail-name">{cleanName(p.name)}</div>
          <div className="fco-detail-meta">
            {p.nation && <span>{p.nation}</span>}
            {p.club && <><span className="fco-dotsep" /><span>{p.club}</span></>}
            {p.league && <><span className="fco-dotsep" /><span>{p.league}</span></>}
            {p.age && <><span className="fco-dotsep" /><span>{p.age} tuổi</span></>}
            {p.height && <><span className="fco-dotsep" /><span>{p.height}cm</span></>}
            {p.foot && <><span className="fco-dotsep" /><span>{p.foot === 'right' ? 'Chân phải' : 'Chân trái'}</span></>}
          </div>
        </div>

        <div className="fco-detail-stats">
          <div className="fco-detail-ovr">
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 52, lineHeight: 1, color: statColor(p.ovr) }}>{p.ovr}</div>
            <div className="fco-detail-ovr-lab">OVERALL</div>
          </div>
          <div className="fco-detail-posrow">
            {p.positions?.map((pos, i) => <PosPill key={pos} pos={pos} faded={i > 0} />)}
          </div>
          <div className="fco-detail-money">
            {p.price > 0 && (
              <div className="fco-money-cell">
                <div className="fco-money-lab"><I.Coins size={12} />Giá</div>
                <div className="fco-money-val" style={{ color: 'var(--accent)' }}>{formatCoins(p.price)}</div>
              </div>
            )}
            {p.salary > 0 && (
              <div className="fco-money-cell">
                <div className="fco-money-lab"><I.Wallet size={12} />Lương</div>
                <div className="fco-money-val">{p.salary}</div>
              </div>
            )}
          </div>
        </div>
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
              <div className="fco-panel-title">Chỉ số</div>
            </div>
            <div className="fco-panel-body">
              {p.detailed
                ? isGK
                  ? <GKStats gk={p.detailed.gk} />
                  : <OutfieldStats p={p} />
                : <MainOnlyStats p={p} isGK={isGK} />
              }
            </div>
          </div>

          {/* Chỉ số theo vị trí */}
          {p.positionRatings?.length > 0 && (
            <div className="fco-panel">
              <div className="fco-panel-head"><div className="fco-panel-title">Chỉ số theo vị trí</div></div>
              <div className="fco-panel-body">
                <div className="fco-posrating-grid">
                  {p.positionRatings.map((pr, i) => (
                    <div key={i} className={`fco-posrating${pr.recommended ? ' rec' : ''}`}>
                      <div className="fco-posrating-code">
                        {pr.label}
                        {pr.recommended && <I.StarFill size={9} style={{ color: '#f5c84b' }} />}
                      </div>
                      <div className="fco-posrating-val" style={{ color: statColor(pr.value) }}>{pr.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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

function OutfieldStats({ p }) {
  return (
    <div className="fco-attrs-grid">
      {STAT_GROUPS.map(g => {
        const mainVal = p[g.key];
        const subs = p.detailed?.[g.key] || [];
        return (
          <div key={g.key} className="fco-attr-group">
            <div className="fco-attr-group-title" style={{ color: mainVal != null ? statColor(mainVal) : 'var(--text)' }}>
              {g.label}
              <span style={{ float: 'right' }}>{mainVal || '—'}</span>
            </div>
            <div className="fco-attr-lines">
              {subs.filter(s => s.value != null).map(s => (
                <AttrLine key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GKStats({ gk }) {
  if (!gk) return <div className="fco-muted">Chưa có dữ liệu GK.</div>;
  return (
    <div className="fco-attr-lines">
      {GK_STAT_GROUPS.map(g => {
        const v = gk[g.key];
        if (v == null) return null;
        return <AttrLine key={g.key} label={g.label} value={v} />;
      })}
    </div>
  );
}

function MainOnlyStats({ p, isGK }) {
  const groups = isGK ? [] : STAT_GROUPS;
  const vals = groups.map(g => ({ ...g, value: p[g.key] })).filter(g => g.value != null);
  return (
    <div>
      <div className="fco-mainonly">
        {vals.map(g => (
          <div key={g.key} className="fco-mainonly-cell">
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 22, color: statColor(g.value) }}>{g.value}</div>
            <div className="fco-mainonly-lab">{g.label}</div>
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

function LoadingDetail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ height: 42, borderRadius: 10, background: 'var(--surface-2)' }} className="fco-sk" />
      <div style={{ height: 160, borderRadius: 16, background: 'var(--surface)' }} className="fco-sk" />
      <div style={{ height: 320, borderRadius: 14, background: 'var(--surface)' }} className="fco-sk" />
    </div>
  );
}
