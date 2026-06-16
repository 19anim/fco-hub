import { useState, useEffect, useRef } from 'react';
import { fetchPlayers } from '../api.js';
import { cleanName, statColor } from '../helpers.js';
import { PlayerAvatar, SeasonChip, PosPill } from '../ui.jsx';
import * as I from '../Icons.jsx';

export default function PlayerPicker({ existing = [], onAdd, onClose, title = "Chọn cầu thủ" }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetchPlayers({ search: q, pageSize: 20 });
        setResults(res.players);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [q]);

  return (
    <div className="fco-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fco-modal">
        <div className="fco-modal-head">
          <div className="fco-modal-title">{title}</div>
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
          {!loading && results.map(p => (
            <button key={p.id} className="fco-modal-item" disabled={existing.includes(p.id)} onClick={() => onAdd(p)}>
              <PlayerAvatar player={p} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fco-modal-itemname">{cleanName(p.name)}</div>
                <div className="fco-modal-itemsub">
                  <SeasonChip code={p.season} img={p.seasonImg} />
                  {' '}<PosPill pos={p.primaryPos} />
                  <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 12, color: statColor(p.ovr) }}>{p.ovr}</span>
                </div>
              </div>
              {existing.includes(p.id) && <I.Check size={14} style={{ color: 'var(--accent)', flex: '0 0 14px' }} />}
            </button>
          ))}
          {!loading && q && results.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Không tìm thấy cầu thủ</div>
          )}
        </div>
      </div>
    </div>
  );
}
