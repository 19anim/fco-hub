import { useState, useEffect } from 'react';
import axios from 'axios';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { BACKEND_SEARCH_DEBOUNCE_MS, BACKEND_SEARCH_MAX_LENGTH, canRunBackendSearch, normalizeBackendSearch } from '../../../utils/backendSearch.js';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE } from '../../../config/api';

const RELATION_TYPES = ['primary', 'secondary', 'mentioned', 'comparison'];

async function searchPlayers(q) {
  const res = await axios.get(`${API_BASE}/admin/search/players`, {
    params: { q, limit: 10 },
    withCredentials: true,
  });
  return res.data.data.players;
}

function EntityOverridePanel({ entity, onChange, onRemove }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-hairline bg-canvas-dark">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{entity.label || entity.displayLabel || entity.entityId}</p>
          <p className="text-xs text-ink-muted">{entity.entityType} · {entity.relationType}</p>
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-ink-muted hover:text-ink transition-colors">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button onClick={onRemove} className="text-ink-muted hover:text-error transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-hairline px-3 py-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1">Relation Type</label>
            <select
              value={entity.relationType ?? 'primary'}
              onChange={(e) => onChange({ ...entity, relationType: e.target.value })}
              className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue"
            >
              {RELATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Priority Override</label>
              <input
                type="number"
                value={entity.priorityOverride ?? ''}
                onChange={(e) => onChange({ ...entity, priorityOverride: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="—"
                className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Featured Override</label>
              <select
                value={entity.featuredOverride === true ? 'true' : entity.featuredOverride === false ? 'false' : ''}
                onChange={(e) => onChange({
                  ...entity,
                  featuredOverride: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined,
                })}
                className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue"
              >
                <option value="">— inherit —</option>
                <option value="true">Featured</option>
                <option value="false">Not featured</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">Start Override</label>
              <input
                type="datetime-local"
                value={entity.startAtOverride ? new Date(entity.startAtOverride).toISOString().slice(0, 16) : ''}
                onChange={(e) => onChange({ ...entity, startAtOverride: e.target.value || undefined })}
                className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">End Override</label>
              <input
                type="datetime-local"
                value={entity.endAtOverride ? new Date(entity.endAtOverride).toISOString().slice(0, 16) : ''}
                onChange={(e) => onChange({ ...entity, endAtOverride: e.target.value || undefined })}
                className="h-8 w-full rounded border border-hairline bg-surface-2 px-2 text-xs text-ink outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LinkedEntityPicker({ linkedEntities = [], onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebouncedValue(query, BACKEND_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const normalizedQuery = normalizeBackendSearch(debouncedQuery);
    if (!normalizedQuery || !canRunBackendSearch(debouncedQuery)) return;

    let ignore = false;
    searchPlayers(normalizedQuery)
      .then((players) => {
        if (!ignore) setResults(players);
      })
      .catch(() => {
        if (!ignore) setResults([]);
      })
      .finally(() => {
        if (!ignore) setSearching(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedQuery]);

  const addPlayer = (player) => {
    const entityId = String(player.entityId || player._id);
    const alreadyAdded = linkedEntities.some(
      e => e.entityType === 'player' && e.entityId === entityId
    );
    if (alreadyAdded) return;
    onChange([
      ...linkedEntities,
      {
        entityType: 'player',
        entityId,
        label: `${player.name} (${player.seasonName || player.seasonId})`,
        relationType: 'primary',
      },
    ]);
    setQuery('');
    setResults([]);
  };

  const updateEntity = (idx, updated) => {
    const next = [...linkedEntities];
    next[idx] = updated;
    onChange(next);
  };

  const removeEntity = (idx) => onChange(linkedEntities.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
        <input
          type="text"
          value={query}
          maxLength={BACKEND_SEARCH_MAX_LENGTH}
          onChange={(e) => {
            const nextQuery = e.target.value;
            setQuery(nextQuery);
            if (!normalizeBackendSearch(nextQuery) || !canRunBackendSearch(nextQuery)) {
              setResults([]);
              setSearching(false);
            } else {
              setSearching(true);
            }
          }}
          placeholder="Search players by name..."
          className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark pl-9 pr-3 text-sm text-ink outline-none focus:border-brand-blue"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">Searching...</span>
        )}
      </div>
      {normalizeBackendSearch(query).length === 1 && (
        <p className="text-xs text-ink-muted mt-1">Nhập ít nhất 2 ký tự để tìm kiếm</p>
      )}

      {results.length > 0 && (
        <div className="rounded-lg border border-hairline bg-canvas-dark divide-y divide-hairline overflow-hidden max-h-56 overflow-y-auto">
          {results.map(player => {
            const entityId = String(player.entityId || player._id);
            const added = linkedEntities.some(
              e => e.entityType === 'player' && e.entityId === entityId
            );
            return (
              <button
                key={entityId}
                disabled={added}
                onClick={() => addPlayer(player)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${added ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-2'}`}
              >
                {player.imageUrl && (
                  <img src={player.imageUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{player.name}</p>
                  <p className="text-xs text-ink-muted">{player.position} · OVR {player.overall} · {player.seasonName}</p>
                </div>
                {added && <span className="ml-auto text-xs text-ink-subtle shrink-0">Added</span>}
              </button>
            );
          })}
        </div>
      )}

      {linkedEntities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{linkedEntities.length} linked</p>
          {linkedEntities.map((entity, idx) => (
            <EntityOverridePanel
              key={`${entity.entityType}-${entity.entityId}`}
              entity={entity}
              onChange={(updated) => updateEntity(idx, updated)}
              onRemove={() => removeEntity(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
