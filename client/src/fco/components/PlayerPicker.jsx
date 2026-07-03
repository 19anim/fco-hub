import { useState, useEffect } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { BACKEND_SEARCH_DEBOUNCE_MS, BACKEND_SEARCH_MAX_LENGTH, canRunBackendSearch, normalizeBackendSearch } from '../../utils/backendSearch.js';
import { fetchPlayers } from '../api.js';
import { cleanName, statColor } from '../helpers.js';
import { getPlayerCardKey, isSamePlayerCard, normalizeUpgradeLevel } from '../upgradeHelpers.js';
import { PlayerAvatar, SeasonChip, PosPill } from '../ui.jsx';
import LevelSelect from './LevelSelect.jsx';
import * as I from '../Icons.jsx';

export default function PlayerPicker({
  existing = [],
  existingPlayers = [],
  onAdd,
  onClose,
  title = 'Chọn cầu thủ',
  showTopPlayers = false,
  allowLevelSelect = false,
  defaultLevel = 1,
  posGroups = null,
  pageSize = 20,
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [levelById, setLevelById] = useState({});
  const debouncedQ = useDebouncedValue(q, q.trim() ? BACKEND_SEARCH_DEBOUNCE_MS : 0);

  useEffect(() => {
    const search = normalizeBackendSearch(debouncedQ);

    if (!canRunBackendSearch(debouncedQ)) return;

    if (!search && !showTopPlayers) {
      setResults([]);
      return;
    }

    let ignore = false;
    setLoading(true);
    fetchPlayers({
      search,
      posGroups: posGroups?.length ? posGroups : undefined,
      sort: 'ovr_desc',
      pageSize: search ? pageSize : 10,
    })
      .then((res) => {
        if (!ignore) setResults(res.players);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedQ, showTopPlayers, posGroups, pageSize]);

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
          <input
            autoFocus
            maxLength={BACKEND_SEARCH_MAX_LENGTH}
            value={q}
            onChange={e => {
              const nextQuery = e.target.value;
              setQ(nextQuery);
              if (!canRunBackendSearch(nextQuery)) {
                setResults([]);
                setLoading(false);
              }
            }}
            placeholder="Tìm cầu thủ…"
          />
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
                  <LevelSelect
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
