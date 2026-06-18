import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fetchPlayers } from '../api.js';
import { cleanName, statColor } from '../helpers.js';
import { getPlayerCardKey, isSamePlayerCard, normalizeUpgradeLevel } from '../upgradeHelpers.js';
import { PlayerAvatar, SeasonChip, PosPill } from '../ui.jsx';
import LevelBadge from './LevelBadge.jsx';
import * as I from '../Icons.jsx';

const LEVELS = Array.from({ length: 13 }, (_, index) => index + 1);

function LevelDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [gridStyle, setGridStyle] = useState({});
  const triggerRef = useRef(null);
  const gridRef = useRef(null);

  // Tính toán vị trí fixed cho grid khi mở
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const gridW = 212;
    const left = Math.min(r.right - gridW, window.innerWidth - gridW - 8);
    setGridStyle({
      position: 'fixed',
      top: r.bottom + 6,
      left: Math.max(8, left),
      zIndex: 9999,
      width: gridW,
    });
  }, [open]);

  // Đóng khi click ngoài
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        gridRef.current  && !gridRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div
      ref={triggerRef}
      className="fco-lvl-dropdown"
      onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
    >
      <LevelBadge level={value} scale={0.30} />
      <I.ChevronDown size={10} className="fco-lvl-dropdown-caret" />
      {open && createPortal(
        <div
          ref={gridRef}
          className="fco-lvl-dropdown-grid"
          style={gridStyle}
          onClick={e => e.stopPropagation()}
        >
          {LEVELS.map(lv => (
            <button
              key={lv}
              className={`fco-lvl-dropdown-item${lv === value ? ' active' : ''}`}
              onClick={() => { onChange(lv); setOpen(false); }}
            >
              <LevelBadge level={lv} scale={0.28} />
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function PlayerPicker({
  existing = [],
  existingPlayers = [],
  onAdd,
  onClose,
  title = 'Chọn cầu thủ',
  showTopPlayers = false,
  allowLevelSelect = false,
  defaultLevel = 1,
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [levelById, setLevelById] = useState({});
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const search = q.trim();

      if (!search && !showTopPlayers) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetchPlayers({
          search,
          sort: 'ovr_desc',
          pageSize: search ? 20 : 10,
        });
        setResults(res.players);
      } finally {
        setLoading(false);
      }
    }, q.trim() ? 300 : 0);

    return () => clearTimeout(timer.current);
  }, [q, showTopPlayers]);

  function getLevel(playerId) {
    return normalizeUpgradeLevel(levelById[playerId] ?? defaultLevel);
  }

  function choosePlayer(player) {
    onAdd({
      ...player,
      upgradeLevel: getLevel(getPlayerCardKey(player)),
    });
  }

  return (
    <div className="fco-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fco-modal">
        <div className="fco-modal-head">
          <div>
            <div className="fco-modal-title">{title}</div>
            {showTopPlayers && !q.trim() && (
              <div className="fco-modal-subtitle">Top 10 OVR cao nhất</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>
            <I.X size={18} />
          </button>
        </div>
        <div className="fco-modal-search">
          <I.Search size={15} style={{ color: 'var(--text-faint)' }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm cầu thủ…" />
        </div>
        <div className="fco-modal-list">
          {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-faint)' }}><I.Spinner size={20} className="fco-spin" /></div>}
          {!loading && results.map(p => {
            const cardKey = getPlayerCardKey(p);
            const disabled = existing.includes(cardKey) || existing.includes(p.id) || existingPlayers.some(player => isSamePlayerCard(p, player));
            const selectedLevel = getLevel(cardKey);

            return (
              <button key={cardKey || p.id} className="fco-modal-item" disabled={disabled} onClick={() => choosePlayer(p)}>
                <PlayerAvatar player={p} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fco-modal-itemname">{cleanName(p.name)}</div>
                  <div className="fco-modal-itemsub">
                    <SeasonChip code={p.season} img={p.seasonImg} />
                    {' '}<PosPill pos={p.primaryPos} />
                    <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 12, color: statColor(p.ovr) }}>{p.ovr}</span>
                  </div>
                </div>
                {allowLevelSelect && !disabled && (
                  <LevelDropdown
                    value={selectedLevel}
                    onChange={lv => setLevelById(prev => ({ ...prev, [cardKey]: lv }))}
                  />
                )}
                {disabled && <I.Check size={14} style={{ color: 'var(--accent)', flex: '0 0 14px' }} />}
              </button>
            );
          })}
          {!loading && q && results.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Không tìm thấy cầu thủ</div>
          )}
        </div>
      </div>
    </div>
  );
}
