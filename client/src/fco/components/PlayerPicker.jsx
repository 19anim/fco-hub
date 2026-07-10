import { useState, useMemo } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { BACKEND_SEARCH_DEBOUNCE_MS, BACKEND_SEARCH_MAX_LENGTH, canRunBackendSearch, normalizeBackendSearch } from '../../utils/backendSearch.js';
import { usePlayersQuery } from '../queries.js';
import { getPlayerCardKey, isSamePlayerCard, normalizeUpgradeLevel } from '../upgradeHelpers.js';
import PlayerPickerItem from './PlayerPickerItem.jsx';
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
  const [levelById, setLevelById] = useState({});
  const debouncedQ = useDebouncedValue(q, q.trim() ? BACKEND_SEARCH_DEBOUNCE_MS : 0);

  const search = normalizeBackendSearch(debouncedQ);
  const canQuery = canRunBackendSearch(debouncedQ) && (search || showTopPlayers);

  const queryFilters = useMemo(() => canQuery ? {
    search,
    posGroups: posGroups?.length ? posGroups : undefined,
    sort: 'ovr_desc',
    pageSize: search ? pageSize : 10,
  } : null, [canQuery, search, posGroups, pageSize]);

  const { data: playersRes, isLoading: loading } = usePlayersQuery(queryFilters);
  const results = playersRes?.players ?? [];

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
            onChange={e => setQ(e.target.value)}
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
              <PlayerPickerItem
                key={cardKey || p.id}
                player={p}
                disabled={disabled}
                allowLevelSelect={allowLevelSelect}
                level={selectedLevel}
                onLevelChange={lv => setLevelById(prev => ({ ...prev, [cardKey]: lv }))}
                onChoose={choosePlayer}
              />
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
