import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { getSeason, getPos, getTrust, initials, statColor, cleanName } from './helpers.js';
import { SEASONS_META } from './constants.js';
import { getSeasonSprite, getSeasonVisual, resolveSeasonSprite } from './seasonSprites.js';
import { normalizeUpgradeLevel } from './upgradeHelpers.js';
import * as I from './Icons.jsx';
import { FcoPlayerCard } from './components/FcoPlayerCard.jsx';
import { getCardThemeForPlayer } from './cardThemes.js';
import { useAssets } from './assets/AssetProvider.jsx';

// ── Player Avatar ──────────────────────────────────────────────────────────────
export function PlayerAvatar({ player, size = 40, bare = false }) {
  const s = getSeason(player.season);
  if (bare) {
    if (player.imageUrl) {
      return (
        <img src={player.imageUrl} alt={player.name}
          style={{ height: size, width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; }} />
      );
    }
    return (
      <div style={{
        width: size * 0.75, height: size, flex: `0 0 ${size * 0.75}px`,
        borderRadius: 10, background: s.bg, color: s.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5,
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: size * 0.28, letterSpacing: '-.02em' }}>
          {initials(player.name)}
        </span>
      </div>
    );
  }
  if (player.imageUrl) {
    return (
      <div style={{
        width: size, height: size, flex: `0 0 ${size}px`,
        borderRadius: size > 56 ? 14 : 10, overflow: 'hidden',
        boxShadow: `inset 0 0 0 1.5px ${s.ring}66, 0 1px 2px rgba(0,0,0,.4)`,
        background: s.bg,
      }}>
        <img src={player.imageUrl} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, flex: `0 0 ${size}px`,
      borderRadius: size > 56 ? 14 : 10,
      background: s.bg,
      boxShadow: `inset 0 0 0 1.5px ${s.ring}66, 0 1px 2px rgba(0,0,0,.4)`,
      color: s.fg, position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: .18,
        backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(0,0,0,.5) 6px 7px)',
      }} />
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: size * 0.32, letterSpacing: '-.02em', position: 'relative', zIndex: 1 }}>
        {initials(player.name)}
      </span>
    </div>
  );
}

export function PlayerCardMini({ player, slotPos, ovr, ovrIsFallback = false, level, className = '', onClick, title }) {
  const { getAssetUrl } = useAssets();
  const theme = getCardThemeForPlayer(player, getAssetUrl);

  return (
    <span className="fco-player-card-mini-wrap">
      <FcoPlayerCard
        player={player}
        theme={theme}
        ovr={ovr ?? player?.ovr}
        pos={slotPos || player?.primaryPos}
        salary={player?.salary}
        grade={level ?? player?.upgradeLevel}
        variant="squad"
        className={className}
        onClick={onClick}
        title={title || cleanName(player?.name)}
      />
      {ovrIsFallback && (
        <span className="fco-player-card-mini-ovr-warning" title="Không có OVR riêng cho vị trí này" aria-label="Không có OVR riêng cho vị trí này">
          <I.Alert size={9} />
        </span>
      )}
    </span>
  );
}

// ── OVR Box ────────────────────────────────────────────────────────────────────
export function OvrBox({ value, pos, size = 'md' }) {
  const dims = { sm: [40, 16, 9], md: [52, 22, 11], lg: [88, 40, 18], xl: [120, 56, 24] }[size];
  const posColor = getPos(pos).color;
  return (
    <div style={{
      width: dims[0], borderRadius: 10, padding: '4px 0', textAlign: 'center',
      background: 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,0))',
      border: '1px solid var(--border)', lineHeight: 1,
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: dims[1], color: statColor(value) }}>{value}</div>
      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: dims[2], color: posColor, marginTop: 2, letterSpacing: '.02em' }}>{pos}</div>
    </div>
  );
}

// ── Position Pill ──────────────────────────────────────────────────────────────
export function PosPill({ pos, faded }) {
  const c = getPos(pos).color;
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, color: c,
      background: c + '1a', border: '1px solid ' + c + '33',
      borderRadius: 5, padding: '2px 5px', letterSpacing: '.02em',
      opacity: faded ? .55 : 1,
    }}>{pos}</span>
  );
}

// ── Season Chip ────────────────────────────────────────────────────────────────
export function SeasonChip({ code, name, full = false, img, sprite }) {
  const [imgError, setImgError] = useState(false);
  const { getAssetUrl } = useAssets();
  const s = getSeason(code);
  const resolvedSprite = resolveSeasonSprite(sprite, getAssetUrl) || getSeasonSprite(code, getAssetUrl);
  const label = full ? (name || s.name || code) : (name || code || 'NG');

  const showImg = img && !imgError;

  if (resolvedSprite || showImg) {
    return (
      <span
        title={name || s.name || code}
        className="fco-season-chip"
        style={{ '--season-ring': s.ring, '--season-bg': s.bg }}
      >
        {resolvedSprite ? (
          <span
            className="fco-season-sprite"
            aria-hidden="true"
            style={{
              ...(resolvedSprite.spriteUrl ? { '--season-sprite-url': `url(${resolvedSprite.spriteUrl})` } : {}),
              '--season-sprite-position': resolvedSprite.backgroundPosition,
              '--season-sprite-size': resolvedSprite.backgroundSize || 'auto',
              '--season-sprite-width': `${resolvedSprite.width || 30}px`,
              '--season-sprite-height': `${resolvedSprite.height || 24}px`,
            }}
          />
        ) : (
          <img src={img} alt={label} onError={() => setImgError(true)} />
        )}
        {full && <span>{label}</span>}
      </span>
    );
  }
  // Fallback: cho các mùa không có ảnh, ưu tiên hiển thị seasonName hiển thị đẹp (từ SEASONS_META) nếu có, fallback sang code
  const seasonCode = String(code || '');
  const seasonMeta = SEASONS_META[seasonCode] || SEASONS_META[seasonCode.toUpperCase()] || SEASONS_META.NG;
  const fallbackLabel = full ? (name || seasonMeta.name || seasonCode) : seasonCode;
  return (
    <span title={name || seasonMeta.name || code} className="fco-season-chip fallback" style={{ '--season-ring': seasonMeta.ring, '--season-bg': seasonMeta.bg, '--season-fg': seasonMeta.fg }}>
      {fallbackLabel}
    </span>
  );
}

// ── Trust Badge ────────────────────────────────────────────────────────────────
export function TrustBadge({ id, variant = 'soft', size = 'sm' }) {
  const t = getTrust(id);
  if (!t) return null;
  const pad = size === 'sm' ? '2px 7px 2px 6px' : '3px 9px 3px 7px';
  const fs = size === 'sm' ? 11 : 12;
  if (variant === 'dot') {
    return (
      <span title={t.vi} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: t.dot, boxShadow: `0 0 6px ${t.dot}99` }} />
        <span style={{ fontSize: fs, color: 'var(--text-dim)' }}>{t.vi}</span>
      </span>
    );
  }
  return (
    <span title={t.desc} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: pad,
      fontSize: fs, fontWeight: 600, lineHeight: 1.1, whiteSpace: 'nowrap',
      color: t.color, background: t.color + '16',
      border: '1px solid ' + t.color + '33', borderRadius: 7,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: t.dot, flex: '0 0 6px' }} />
      {t.vi}
    </span>
  );
}

// ── Stat Bar ───────────────────────────────────────────────────────────────────
export function StatBar({ label, value, max = 110 }) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100));
  const c = statColor(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 116, fontSize: 12.5, color: 'var(--text-dim)', flex: '0 0 116px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 99, background: c, transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
      </div>
      <div style={{ width: 30, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: c, flex: '0 0 30px' }}>{value}</div>
    </div>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────────
export function Button({ variant = 'default', size = 'md', icon: Ico, iconRight: IcoR, loading, disabled, children, danger, active, full, style: extraStyle, ...rest }) {
  const sizes = { sm: ['6px 10px', 12.5, 14], md: ['8px 13px', 13.5, 16], lg: ['11px 18px', 15, 18] }[size];
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: sizes[0], fontSize: sizes[1], fontWeight: 600, borderRadius: 9,
    cursor: disabled || loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
    border: '1px solid transparent', transition: 'all .14s ease', width: full ? '100%' : undefined,
    opacity: disabled ? .45 : 1, fontFamily: 'inherit', userSelect: 'none',
  };
  const variants = {
    primary: { background: 'var(--accent)', color: '#04130d', borderColor: 'var(--accent)' },
    default: { background: 'var(--surface-3)', color: 'var(--text)', borderColor: 'var(--border)' },
    ghost:   { background: active ? 'var(--surface-3)' : 'transparent', color: active ? 'var(--text)' : 'var(--text-dim)', borderColor: 'transparent' },
    outline: { background: 'transparent', color: 'var(--text)', borderColor: 'var(--border)' },
    subtle:  { background: 'var(--surface-2)', color: 'var(--text-dim)', borderColor: 'var(--border)' },
  };
  const style = { ...base, ...(danger ? { background: 'rgba(226,86,111,.12)', color: '#ff7088', borderColor: 'rgba(226,86,111,.35)' } : variants[variant] || variants.default), ...extraStyle };
  return (
    <button {...rest} disabled={disabled || loading} className={`fco-btn fco-btn-${variant}`} style={style}>
      {loading ? <I.Spinner size={sizes[2]} className="fco-spin" /> : (Ico ? <Ico size={sizes[2]} /> : null)}
      {children ? <span>{children}</span> : null}
      {IcoR ? <IcoR size={sizes[2]} /> : null}
    </button>
  );
}

export function IconButton({ icon: Ico, label, onClick, active, size = 16, className, ...rest }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`fco-iconbtn${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      <Ico size={size} />
    </button>
  );
}

// ── Filter Chip ────────────────────────────────────────────────────────────────
export function FilterChip({ label, value, onRemove, color }) {
  return (
    <span className="fco-chip">
      <span style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 12.5, color: color || 'var(--text)' }}>{value}</span>
      <button className="fco-chip-x" onClick={onRemove} aria-label={`Xoá ${label}`}><I.X size={12} /></button>
    </span>
  );
}

// ── Stars ──────────────────────────────────────────────────────────────────────
export function Stars({ n, max = 5, color = 'var(--accent)' }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1, color }}>
      {Array.from({ length: max }).map((_, i) => {
        const Fill = I.StarFill; const Empty = I.Star;
        return i < n ? <Fill key={i} size={12} /> : <Empty key={i} size={12} style={{ opacity: .25 }} />;
      })}
    </span>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Ico = I.Search, title, body, action }) {
  return (
    <div className="fco-empty">
      <div className="fco-empty-ico"><Ico size={26} /></div>
      <div style={{ fontWeight: 650, fontSize: 16 }}>{title}</div>
      {body && <div style={{ color: 'var(--text-dim)', fontSize: 13.5, maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>{body}</div>}
      {action}
    </div>
  );
}

// ── Skeleton Row ───────────────────────────────────────────────────────────────
export function SkeletonRow() {
  return (
    <div className="fco-skrow">
      <div className="fco-sk" style={{ width: 40, height: 40, borderRadius: 10 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div className="fco-sk" style={{ width: '42%', height: 11 }} />
        <div className="fco-sk" style={{ width: '26%', height: 9 }} />
      </div>
      <div className="fco-sk" style={{ width: 52, height: 30, borderRadius: 8 }} />
    </div>
  );
}

// ── Popover ────────────────────────────────────────────────────────────────────
export function Popover({ open, anchorRef, onClose, children, width = 260, align = 'left' }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    let left = align === 'right' ? r.right - width : r.left;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    setPos({ top: r.bottom + 6, left });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    }
    function onEsc(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);
  if (!open) return null;
  return (
    <div ref={ref} className="fco-pop" style={{ position: 'fixed', top: pos.top, left: pos.left, width }}>
      {children}
    </div>
  );
}

// ── Filter Button ──────────────────────────────────────────────────────────────
export function FilterButton({ label, icon: Ico, count, active, onClick, anchorRef }) {
  return (
    <button ref={anchorRef} onClick={onClick} className={`fco-filterbtn${active ? ' active' : ''}`}>
      {Ico && <Ico size={14} />}
      <span>{label}</span>
      {count ? <span className="fco-filterbtn-count">{count}</span> : null}
      <I.ChevronDown size={13} style={{ opacity: .6, marginLeft: -1 }} />
    </button>
  );
}

// ── CheckList ──────────────────────────────────────────────────────────────────
export function CheckList({ options, selected, onToggle, renderOption }) {
  return (
    <div className="fco-checklist">
      {options.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const on = selected.includes(val);
        return (
          <button key={val} className={`fco-check${on ? ' on' : ''}`} onClick={() => onToggle(val)}>
            <span className={`fco-checkbox${on ? ' on' : ''}`}>{on ? <I.Check size={12} /> : null}</span>
            {renderOption ? renderOption(o) : <span>{typeof o === 'string' ? o : o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Range Control ──────────────────────────────────────────────────────────────
export function RangeControl({ min, max, step = 1, value, onChange, format }) {
  const [lo, hi] = value;
  const fmt = format || (v => v);
  function setLo(v) { onChange([Math.min(Number(v), hi - step), hi]); }
  function setHi(v) { onChange([lo, Math.max(Number(v), lo + step)]); }
  const loPct = ((lo - min) / (max - min)) * 100;
  const hiPct = ((hi - min) / (max - min)) * 100;
  return (
    <div className="fco-range">
      <div className="fco-range-head">
        <span>{fmt(lo)}</span>
        <span style={{ color: 'var(--text-faint)' }}>—</span>
        <span>{fmt(hi)}</span>
      </div>
      <div className="fco-range-track">
        <div className="fco-range-fill" style={{ left: loPct + '%', right: (100 - hiPct) + '%' }} />
        <input type="range" min={min} max={max} step={step} value={lo} onChange={e => setLo(e.target.value)} className="fco-range-input" />
        <input type="range" min={min} max={max} step={step} value={hi} onChange={e => setHi(e.target.value)} className="fco-range-input" />
      </div>
    </div>
  );
}

// ── Max Control ────────────────────────────────────────────────────────────────
export function MaxControl({ min, max, step = 1, value, onChange, format }) {
  const fmt = format || (v => v);
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="fco-range">
      <div className="fco-range-head">
        <span style={{ color: 'var(--text-faint)' }}>≤</span>
        <span>{fmt(value)}</span>
      </div>
      <div className="fco-range-track">
        <div className="fco-range-fill" style={{ left: 0, right: (100 - pct) + '%' }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="fco-range-input" />
      </div>
    </div>
  );
}
