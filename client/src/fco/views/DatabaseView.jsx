import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchPlayers, fetchMeta } from '../api.js';
import { formatCoins, statColor, cleanName } from '../helpers.js';
import { POS_GROUPS, SORTS, POSITIONS_META } from '../constants.js';
import {
  PlayerAvatar, OvrBox, PosPill, SeasonChip, TrustBadge,
  Button, IconButton, FilterChip, EmptyState, SkeletonRow,
  Popover, FilterButton, RangeControl, MaxControl,
} from '../ui.jsx';
import * as I from '../Icons.jsx';
import { SEASONS_META } from '../constants.js';

const MAIN_STATS = [
  { key: 'pace',      label: 'PAC' },
  { key: 'shooting',  label: 'SHO' },
  { key: 'passing',   label: 'PAS' },
  { key: 'dribbling', label: 'DRI' },
  { key: 'defending', label: 'DEF' },
  { key: 'physical',  label: 'PHY' },
];

const PAGE_SIZES = [12, 24, 48];
const DEFAULT_SORT     = 'ovr_desc';
const DEFAULT_OVR      = [50, 150];
const POSITION_GROUPS = {
  GK:  ['GK'],
  DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
  FWD: ['ST', 'CF', 'LW', 'RW'],
};

function formatPosChipValue(selected) {
  if (selected.length === 0) return '';
  const displayParts = [];
  let remaining = [...selected];
  for (const [group, subs] of Object.entries(POSITION_GROUPS)) {
    if (subs.every(p => selected.includes(p))) {
      displayParts.push(group);
      remaining = remaining.filter(p => !subs.includes(p));
    }
  }
  displayParts.push(...remaining);
  return displayParts.join(', ');
}
const DEFAULT_SALARY   = 999999;
const DEFAULT_PRICE    = 999999;
const DEFAULT_PAGESIZE = 12;

// ── URL query-string ↔ filter helpers ────────────────────────────────────────
// We use the REAL URL search (?...), completely separate from the hash (#/db).
// This avoids any collision between route params and filter params.

function readQS() {
  return new URLSearchParams(window.location.search);
}

function writeQS(p) {
  const qs = p.toString();
  const next = qs ? `${window.location.pathname}?${qs}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;
  if (window.location.href !== next) window.history.replaceState(null, '', next);
}

function filtersFromQS() {
  const p = readQS();
  const ovrMinVal = p.get('ovrMin');
  const ovrMaxVal = p.get('ovrMax');
  const salVal = p.get('sal');
  const priceVal = p.get('price');
  const pageVal = p.get('page');
  const sizeVal = p.get('size');

  const ovrMin = ovrMinVal && !isNaN(ovrMinVal) ? Number(ovrMinVal) : DEFAULT_OVR[0];
  const ovrMax = ovrMaxVal && !isNaN(ovrMaxVal) ? Number(ovrMaxVal) : DEFAULT_OVR[1];
  const salaryMax = salVal && !isNaN(salVal) ? Number(salVal) : DEFAULT_SALARY;
  const priceMax = priceVal && !isNaN(priceVal) ? Number(priceVal) : DEFAULT_PRICE;
  const page = pageVal && !isNaN(pageVal) ? Number(pageVal) : 1;
  const pageSize = sizeVal && !isNaN(sizeVal) ? Number(sizeVal) : DEFAULT_PAGESIZE;

  return {
    search: p.get('q') || '',
    posGroups: p.get('pos') ? p.get('pos').split(',').map(x => x.trim()).filter(Boolean) : [],
    seasons: p.get('sea') ? p.get('sea').split(',').map(x => x.trim()).filter(Boolean) : [],
    ovr: [ovrMin, ovrMax],
    salaryMax,
    priceMax,
    sort: p.get('sort') || DEFAULT_SORT,
    page,
    pageSize,
  };
}

function filtersToQS(f) {
  const p = new URLSearchParams();
  if (f.search)                    p.set('q',      f.search);
  if (f.posGroups.length)          p.set('pos',    f.posGroups.join(','));
  if (f.seasons && f.seasons.length) p.set('sea',   f.seasons.join(','));
  if (f.ovr[0] > DEFAULT_OVR[0])  p.set('ovrMin', f.ovr[0]);
  if (f.ovr[1] < DEFAULT_OVR[1])  p.set('ovrMax', f.ovr[1]);
  if (f.salaryMax < DEFAULT_SALARY)p.set('sal',    f.salaryMax);
  if (f.priceMax  < DEFAULT_PRICE) p.set('price',  f.priceMax);
  if (f.sort !== DEFAULT_SORT)     p.set('sort',   f.sort);
  if (f.page > 1)                  p.set('page',   f.page);
  if (f.pageSize !== DEFAULT_PAGESIZE) p.set('size', f.pageSize);
  return p;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function DatabaseView({ isAdmin, watch, onToggleWatch, onSelect }) {

  // Init from URL query string
  const init = filtersFromQS();
  const [search,    setSearch]    = useState(init.search);
  const [posGroups, setPosGroups] = useState(init.posGroups);
  const [seasons,   setSeasons]   = useState(init.seasons || []);
  const [ovr,       setOvr]       = useState(init.ovr);
  const [salaryMax, setSalaryMax] = useState(init.salaryMax);
  const [priceMax,  setPriceMax]  = useState(init.priceMax);
  const [sort,      setSort]      = useState(init.sort);
  const [page,      setPage]      = useState(init.page);
  const [pageSize,  setPageSize]  = useState(init.pageSize);
  const [dense,     setDense]     = useState(false);

  const [allSeasons, setAllSeasons] = useState([]);
  const [seasonSearch, setSeasonSearch] = useState('');

  const [players,    setPlayers]    = useState([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);

  const [openPop, setOpenPop] = useState(null);
  const sortRef   = useRef(null);
  const ovrRef    = useRef(null);
  const salaryRef = useRef(null);
  const priceRef  = useRef(null);
  const seasonRef = useRef(null);

  useEffect(() => {
    fetchMeta().then(res => {
      if (res.success && res.seasons) setAllSeasons(res.seasons);
    });
  }, []);

  // Sync filter state → URL query string (replaceState = no history spam)
  useEffect(() => {
    writeQS(filtersToQS({ search, posGroups, seasons, ovr, salaryMax, priceMax, sort, page, pageSize }));
  }, [search, posGroups, seasons, ovr, salaryMax, priceMax, sort, page, pageSize]);

  // Fetch data whenever any filter changes
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPlayers({ search, posGroups, seasons, ovr, salaryMax, priceMax, sort, page, pageSize });
      setPlayers(res.players);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error('fetchPlayers error', e);
    } finally {
      setLoading(false);
    }
  }, [search, posGroups, seasons, ovr, salaryMax, priceMax, sort, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  // Close popovers on popstate (user hit back)
  useEffect(() => {
    function onPop() { setOpenPop(null); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function resetFilters() {
    setSearch('');
    setPosGroups([]);
    setSeasons([]);
    setOvr(DEFAULT_OVR);
    setSalaryMax(DEFAULT_SALARY);
    setPriceMax(DEFAULT_PRICE);
    setSort(DEFAULT_SORT);
    setPage(1);
  }

  const hasFilters = search || posGroups.length || seasons.length ||
    ovr[0] > DEFAULT_OVR[0] || ovr[1] < DEFAULT_OVR[1] ||
    salaryMax < DEFAULT_SALARY || priceMax < DEFAULT_PRICE;

  const activeChips = [
    posGroups.length > 0 && {
      key: 'pos', label: 'Vị trí', value: formatPosChipValue(posGroups),
      onRemove: () => { setPosGroups([]); setPage(1); },
    },
    seasons.length > 0 && {
      key: 'sea', label: 'Mùa',
      value: seasons.length <= 2
        ? seasons.map(id => allSeasons.find(s => String(s.seasonId) === id)?.seasonName || id).join(', ')
        : `${seasons.length} mùa`,
      onRemove: () => { setSeasons([]); setPage(1); },
    },
    (ovr[0] > DEFAULT_OVR[0] || ovr[1] < DEFAULT_OVR[1]) && {
      key: 'ovr', label: 'OVR', value: `${ovr[0]}–${ovr[1]}`,
      onRemove: () => { setOvr(DEFAULT_OVR); setPage(1); },
    },
    salaryMax < DEFAULT_SALARY && {
      key: 'sal', label: 'Lương ≤', value: String(salaryMax),
      onRemove: () => { setSalaryMax(DEFAULT_SALARY); setPage(1); },
    },
    priceMax < DEFAULT_PRICE && {
      key: 'price', label: 'Giá ≤', value: formatCoins(priceMax),
      onRemove: () => { setPriceMax(DEFAULT_PRICE); setPage(1); },
    },
  ].filter(Boolean);

  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  return (
    <div className="fco-db">
      {/* Toolbar */}
      <div className="fco-toolbar">
        <div className="fco-search">
          <I.Search size={16} style={{ color: 'var(--text-faint)', flex: '0 0 16px' }} />
          <input
            className="fco-search-input"
            placeholder="Tìm cầu thủ…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="fco-search-clear" onClick={() => { setSearch(''); setPage(1); }}>
              <I.X size={14} />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <FilterButton
          anchorRef={sortRef}
          label={SORTS.find(s => s.value === sort)?.label || 'Sắp xếp'}
          icon={I.ArrowUpDown}
          active={openPop === 'sort'}
          onClick={() => setOpenPop(p => p === 'sort' ? null : 'sort')}
        />
        <Popover open={openPop === 'sort'} anchorRef={sortRef} onClose={() => setOpenPop(null)} width={210} align="right">
          <div className="fco-pop-title">Sắp xếp</div>
          {SORTS.map(s => (
            <button key={s.value}
              className={`fco-sortopt${sort === s.value ? ' on' : ''}`}
              onClick={() => { setSort(s.value); setPage(1); setOpenPop(null); }}>
              {sort === s.value && <I.Check size={13} style={{ color: 'var(--accent)', flex: '0 0 13px' }} />}
              <span>{s.label}</span>
            </button>
          ))}
        </Popover>

        <IconButton icon={I.List} label={dense ? 'Bình thường' : 'Rút gọn'} active={dense} onClick={() => setDense(d => !d)} />
      </div>

      {/* Filter bar */}
      <div className="fco-filterbar" style={{ gap: 12 }}>
        {/* Position container - Structured Grid */}
        <div className="fco-pos-container">
          <div className="fco-pos-subs">
            {Object.keys(POSITION_GROUPS).map(g => (
              <div key={g} className="fco-pos-subgroup">
                <div className="fco-pos-subgroup-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="fco-pos-subgroup-title">{g}</span>
                  <button
                    className="fco-posgroup-select-all"
                    style={{ fontSize: 9, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700 }}
                    onClick={() => {
                      const subs = POSITION_GROUPS[g];
                      const allSelected = subs.every(p => posGroups.includes(p));
                      if (allSelected) {
                        setPosGroups(prev => prev.filter(x => !subs.includes(x)));
                      } else {
                        setPosGroups(prev => [...new Set([...prev.filter(x => !subs.includes(x)), ...subs])]);
                      }
                      setPage(1);
                    }}
                  >
                    {POSITION_GROUPS[g].every(p => posGroups.includes(p)) ? 'Bỏ chọn' : 'Tất cả'}
                  </button>
                </div>
                <div className="fco-pos-subgroup-items">
                  {POSITION_GROUPS[g].map(p => {
                    const isSelected = posGroups.includes(p);
                    const color = POSITIONS_META[p]?.color || 'var(--accent)';
                    return (
                      <button key={p}
                        className={`fco-subpos-btn${isSelected ? ' on' : ''}`}
                        style={isSelected ? { '--pos-color': color } : {}}
                        onClick={() => {
                          setPosGroups(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
                          setPage(1);
                        }}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fco-filter-divider" />

        {/* Season selector - Display all seasons in a grid with images/fallback badges */}
        <div className="fco-season-ext-list">
           <div className="fco-season-ext-head">
             <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Mùa thẻ</span>
             <button onClick={() => { setSeasons([]); setPage(1); }} style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>Xoá chọn</button>
           </div>
           <div className="fco-seasons-grid">
              {allSeasons.map(s => {
                const isSelected = seasons.includes(String(s.seasonId));
                const seasonCode = String(s.seasonId || '');
                const seasonSprite = s.seasonSprite;
                const seasonMeta = s.seasonImg || seasonSprite ? null : (SEASONS_META[seasonCode] || SEASONS_META[seasonCode.toUpperCase()] || SEASONS_META.NG);
                return (
                  <button key={s.seasonId}
                    className={`fco-season-opt${isSelected ? ' on' : ''}`}
                    title={s.seasonName}
                    onClick={() => {
                      const sid = String(s.seasonId);
                      setSeasons(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]);
                      setPage(1);
                    }}>
                    {s.seasonImg ? (
                      <img src={s.seasonImg} alt="" className="fco-season-opt-img" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    ) : seasonSprite ? (
                      <span
                        className="fco-season-sprite fco-season-opt-sprite"
                        aria-hidden="true"
                        style={{
                          '--season-sprite-url': `url(${seasonSprite.spriteUrl || '/fifaaddict-season-sprite.png'})`,
                          '--season-sprite-position': seasonSprite.backgroundPosition,
                          '--season-sprite-size': seasonSprite.backgroundSize || 'auto',
                          '--season-sprite-width': `${seasonSprite.width || 30}px`,
                          '--season-sprite-height': `${seasonSprite.height || 24}px`,
                        }}
                      />
                    ) : (
                      <div className="fco-season-opt-badge" style={{ background: seasonMeta?.bg, color: seasonMeta?.fg, borderColor: seasonMeta?.ring }}>
                        <span>{seasonMeta?.name || seasonCode}</span>
                      </div>
                    )}
                    {isSelected && (
                      <span className="fco-check-icon">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17l-3.42-3.42a1.5 1.5 0 1 0-2.12 2.12l9 9a1.5 1.5 0 0 0 2.12 0l9-9a1.5 1.5 0 1 0-2.12-2.12L9 16.17z"/>
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
           </div>
        </div>

        <div className="fco-filter-divider" />

        {/* OVR range */}
        <FilterButton
          anchorRef={ovrRef}
          label="OVR"
          icon={I.Activity}
          count={(ovr[0] > DEFAULT_OVR[0] || ovr[1] < DEFAULT_OVR[1]) ? 1 : 0}
          active={openPop === 'ovr'}
          onClick={() => setOpenPop(p => p === 'ovr' ? null : 'ovr')}
        />
        <Popover open={openPop === 'ovr'} anchorRef={ovrRef} onClose={() => setOpenPop(null)} width={250}>
          <div className="fco-pop-title">Overall</div>
          <RangeControl min={50} max={150} value={ovr} onChange={v => { setOvr(v); setPage(1); }} />
        </Popover>

        {/* Salary max */}
        <FilterButton
          anchorRef={salaryRef}
          label="Lương"
          icon={I.Wallet}
          count={salaryMax < DEFAULT_SALARY ? 1 : 0}
          active={openPop === 'salary'}
          onClick={() => setOpenPop(p => p === 'salary' ? null : 'salary')}
        />
        <Popover open={openPop === 'salary'} anchorRef={salaryRef} onClose={() => setOpenPop(null)} width={230}>
          <div className="fco-pop-title">Lương tối đa</div>
          <MaxControl
            min={1} max={50} step={1}
            value={salaryMax < DEFAULT_SALARY ? salaryMax : 50}
            onChange={v => { setSalaryMax(v); setPage(1); }}
          />
        </Popover>

        {/* Price max */}
        <FilterButton
          anchorRef={priceRef}
          label="Giá"
          icon={I.Coins}
          count={priceMax < DEFAULT_PRICE ? 1 : 0}
          active={openPop === 'price'}
          onClick={() => setOpenPop(p => p === 'price' ? null : 'price')}
        />
        <Popover open={openPop === 'price'} anchorRef={priceRef} onClose={() => setOpenPop(null)} width={230}>
          <div className="fco-pop-title">Giá thị trường ≤</div>
          <MaxControl
            min={0} max={200000000} step={1000000}
            value={priceMax < DEFAULT_PRICE ? priceMax : 200000000}
            onChange={v => { setPriceMax(v); setPage(1); }}
            format={formatCoins}
          />
        </Popover>
      </div>

      {/* Result count + active filter chips */}
      <div className="fco-resultbar">
        <div className="fco-resultcount">
          Hiển thị&nbsp;<b>{total > 0 ? `${start}–${end}` : '0'}</b>&nbsp;/&nbsp;<b>{total.toLocaleString()}</b> cầu thủ
        </div>
        {activeChips.length > 0 && (
          <div className="fco-chips">
            {activeChips.map(c => (
              <FilterChip key={c.key} label={c.label} value={c.value} onRemove={c.onRemove} />
            ))}
            <button className="fco-clearall" onClick={resetFilters}>
              <I.X size={12} /> Xoá tất cả
            </button>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="fco-rowhead">
        <div style={{ flex: '0 0 48px' }} />
        <div style={{ flex: 1, minWidth: 160 }}>Cầu thủ</div>
        <div className="fco-hide-sm" style={{ width: 56 }}>OVR</div>
        {isAdmin && <div className="fco-hide-md" style={{ width: 96 }}>Trust</div>}
        <div className="fco-hide-md" style={{ width: 220 }}>Chỉ số</div>
        <div className="fco-hide-sm" style={{ width: 80, textAlign: 'right' }}>Giá</div>
        <div className="fco-hide-sm" style={{ width: 80, textAlign: 'right' }}>Lương</div>
        <div style={{ width: 32 }} />
      </div>

      {/* Rows */}
      <div className={`fco-rows${dense ? ' dense' : ''}`}>
        {loading
          ? Array.from({ length: Math.min(pageSize, 12) }).map((_, i) => <SkeletonRow key={i} />)
          : players.length === 0
            ? (
              <EmptyState
                icon={I.Search}
                title="Không tìm thấy cầu thủ"
                body="Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."
                action={hasFilters
                  ? <Button variant="outline" size="sm" icon={I.X} onClick={resetFilters}>Xoá bộ lọc</Button>
                  : null}
              />
            )
            : players.map(p => (
              <PlayerRow
                key={p.id}
                player={p}
                isAdmin={isAdmin}
                watched={watch.includes(p.id)}
                onToggleWatch={() => onToggleWatch(p.id)}
                onClick={() => onSelect(p.id)}
              />
            ))
        }
      </div>

      {/* Pagination */}
      {!loading && total > pageSize && (
        <div className="fco-pager">
          <div className="fco-pager-info">
            <span className="fco-pagesize">
              {PAGE_SIZES.map(n => (
                <button
                  key={n}
                  className={`fco-pagesize-btn${pageSize === n ? ' on' : ''}`}
                  onClick={() => { setPageSize(n); setPage(1); }}>
                  {n}
                </button>
              ))}
            </span>
            <span>trang <b>{page}</b> / <b>{totalPages}</b></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconButton
              icon={I.ChevronLeft} label="Trang trước"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            />
            <span className="fco-pagenum">{page} / {totalPages}</span>
            <IconButton
              icon={I.ChevronRight} label="Trang sau"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Player row ────────────────────────────────────────────────────────────────
function PlayerRow({ player: p, isAdmin, watched, onToggleWatch, onClick }) {
  if (!p || !p.name) return null; // Safety check for malformed data
  return (
    <div className="fco-row" tabIndex={0} role="button"
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}>

      <PlayerAvatar player={p} size={40} />

      <div className="fco-row-player">
        <div className="fco-row-name">
          {cleanName(p.name)}
          {isAdmin && p.koreanRaw && <span className="fco-kr-flag">KR</span>}
        </div>
        <div className="fco-row-sub">
          <SeasonChip code={p.season} name={p.seasonName} img={p.seasonImg} />
          <PosPill pos={p.primaryPos} />
          {p.positions?.slice(1, 3).map(pos => (
            <PosPill key={pos} pos={pos} faded />
          ))}
          {p.club && <span className="fco-row-club">{p.club}</span>}
        </div>
        <div className="fco-row-meta-inline">
          <span className="fco-mini-badge wf">
            {p.foot === 'left' ? '5' : p._raw?.enrichment?.weakFoot || '?'}/{p.foot === 'right' ? '5' : p._raw?.enrichment?.weakFoot || '?'}
          </span>
          <span className="fco-mini-badge sm">
            {p.skillMoves}★
          </span>
          <span className="fco-mini-badge wr">
            {p.workRateAttack}/{p.workRateDefense}
          </span>
        </div>
      </div>

      <div className="fco-hide-sm" style={{ width: 56 }}>
        <OvrBox value={p.ovr} pos={p.primaryPos} size="sm" />
      </div>

      {isAdmin && (
        <div className="fco-hide-md" style={{ width: 96 }}>
          <TrustBadge id={p.trust} variant="soft" size="sm" />
        </div>
      )}

      {/* Stat strip */}
      <div className="fco-hide-md fco-statstrip" style={{ width: 220 }}>
        {MAIN_STATS.map(s => {
          const v = p[s.key];
          const c = v != null && v > 0 ? statColor(v) : 'var(--text-faint)';
          return (
            <div key={s.key} className="fco-statcell">
              <div className="fco-statcell-lab">{s.label}</div>
              <div className="fco-statcell-val" style={{ color: c }}>
                {v != null && v > 0 ? v : '—'}
              </div>
              <div className="fco-minibar">
                {v != null && v > 0 &&
                  <div style={{ width: `${Math.min(100, v)}%`, height: '100%', background: c, borderRadius: 99 }} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fco-hide-sm fco-num" style={{ width: 80, textAlign: 'right', color: p.price ? 'var(--text)' : 'var(--text-faint)' }}>
        {p.price ? formatCoins(p.price) : '—'}
      </div>
      <div className="fco-hide-sm fco-num" style={{ width: 80, textAlign: 'right', color: p.salary ? 'var(--text)' : 'var(--text-faint)' }}>
        {p.salary ? `${p.salary}` : '—'}
      </div>

      <button
        className={`fco-star${watched ? ' on' : ''}`}
        onClick={e => { e.stopPropagation(); onToggleWatch(); }}
        title={watched ? 'Bỏ theo dõi' : 'Theo dõi'}>
        {watched ? <I.StarFill size={14} /> : <I.Star size={14} />}
      </button>

      <I.ChevronRight size={16} style={{ color: 'var(--text-faint)', flex: '0 0 16px' }} />
    </div>
  );
}
