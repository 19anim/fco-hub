import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { DollarSign, Plus, Copy, Archive, Eye, EyeOff, Pencil, X, Trash2 } from 'lucide-react';
import { adminMonetizationService } from '../../services/adminMonetization';
import { API_BASE } from '../../config/api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const TYPE_LABEL = {
  youtube_video: 'YouTube',
  affiliate_link: 'Affiliate',
  sponsor_banner: 'Banner',
  ad_slot: 'Ad Slot',
  custom_cta: 'CTA',
};

const STATUS_BADGE = {
  draft: 'bg-surface-3 text-ink-muted',
  scheduled: 'bg-yellow-500/15 text-yellow-400',
  published: 'bg-green-500/15 text-green-400',
  disabled: 'bg-red-500/15 text-red-400',
  archived: 'bg-surface-3 text-ink-subtle',
};

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-hairline bg-surface-1 px-3 text-sm text-ink outline-none focus:border-brand-blue"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
          {typeof o === 'string' ? o : o.label}
        </option>
      ))}
    </select>
  );
}

export default function MonetizationListPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', type: '', status: '', platform: '', sort: 'newest', linkedPlayerId: '' });
  const [actionLoading, setActionLoading] = useState(null);

  const { user } = useAdminAuth();

  // Player filter
  const [playerQuery, setPlayerQuery] = useState('');
  const [playerSuggestions, setPlayerSuggestions] = useState([]);
  const [playerFilterLabel, setPlayerFilterLabel] = useState('');
  const playerDebounceRef = useRef(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminMonetizationService.list(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      );
      setItems(result.data.items);
      setTotal(result.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (!playerQuery || playerFilterLabel) {
      setPlayerSuggestions([]);
      return;
    }
    clearTimeout(playerDebounceRef.current);
    playerDebounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/search/players`, {
          params: { q: playerQuery, limit: 10 },
          withCredentials: true,
        });
        setPlayerSuggestions(res.data.data.players ?? []);
      } catch {
        setPlayerSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(playerDebounceRef.current);
  }, [playerQuery, playerFilterLabel]);

  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));

  const handleAction = async (action, item) => {
    setActionLoading(item._id + action);
    try {
      let result;
      if (action === 'publish') result = await adminMonetizationService.publish(item._id);
      else if (action === 'unpublish') result = await adminMonetizationService.unpublish(item._id);
      else if (action === 'archive') result = await adminMonetizationService.archive(item._id);
      else if (action === 'duplicate') {
        result = await adminMonetizationService.duplicate(item._id);
        if (result.success) fetchItems();
        return;
      }
      if (result?.success) {
        setItems((prev) => prev.map((i) => i._id === item._id ? result.data.item : i));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await adminMonetizationService.delete(deleteTarget._id);
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
      setTotal((t) => t - 1);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Xoá thất bại');
    } finally {
      setDeleteLoading(false);
    }
  };

  const ctr = (item) => {
    const imp = item.tracking?.impressionCount || 0;
    const clk = item.tracking?.clickCount || 0;
    return imp > 0 ? `${((clk / imp) * 100).toFixed(1)}%` : '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <DollarSign className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Monetization</h1>
            <p className="text-sm text-ink-muted">{total} items total</p>
          </div>
        </div>
        <Link
          to="/admin/monetization/new"
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          New Item
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search title..."
          value={filters.search}
          onChange={(e) => setFilter('search')(e.target.value)}
          className="h-9 rounded-lg border border-hairline bg-surface-1 px-3 text-sm text-ink outline-none focus:border-brand-blue min-w-[200px]"
        />
        <FilterSelect label="All Types" value={filters.type} onChange={setFilter('type')}
          options={Object.entries(TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
        <FilterSelect label="All Statuses" value={filters.status} onChange={setFilter('status')}
          options={['draft', 'scheduled', 'published', 'disabled', 'archived'].map((s) => ({ value: s, label: s }))} />
        <FilterSelect label="All Platforms" value={filters.platform} onChange={setFilter('platform')}
          options={['youtube', 'shopee', 'tiktok_shop', 'google_ads', 'custom'].map((s) => ({ value: s, label: s }))} />
        <FilterSelect label="Sort" value={filters.sort} onChange={setFilter('sort')}
          options={[{ value: 'newest', label: 'Newest' }, { value: 'priority', label: 'Priority' }, { value: 'ctr', label: 'CTR' }]} />
        <div className="relative">
          <div className="flex items-center h-9 rounded-lg border border-hairline bg-surface-1 px-3 gap-1.5 min-w-[200px]">
            <input
              type="text"
              placeholder="Filter by player..."
              value={playerFilterLabel || playerQuery}
              onChange={(e) => {
                setPlayerFilterLabel('');
                setFilters((f) => ({ ...f, linkedPlayerId: '' }));
                setPlayerQuery(e.target.value);
              }}
              className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
            />
            {(playerFilterLabel || playerQuery) && (
              <button
                onClick={() => {
                  setPlayerQuery('');
                  setPlayerFilterLabel('');
                  setPlayerSuggestions([]);
                  setFilters((f) => ({ ...f, linkedPlayerId: '' }));
                }}
                className="text-ink-muted hover:text-ink transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {playerSuggestions.length > 0 && (
            <div className="absolute top-full left-0 z-20 mt-1 w-64 rounded-xl border border-hairline bg-surface-1 shadow-lg overflow-hidden">
              {playerSuggestions.map((p) => (
                <button
                  key={p.spid ?? p._id}
                  onClick={() => {
                    const label = p.name || String(p.spid);
                    setPlayerFilterLabel(label);
                    setPlayerQuery('');
                    setPlayerSuggestions([]);
                    setFilters((f) => ({ ...f, linkedPlayerId: String(p.spid ?? p._id) }));
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <span className="font-medium truncate">{p.name}</span>
                  {p.spid && <span className="text-xs text-ink-muted shrink-0">#{p.spid}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                {['Title', 'Type', 'Placements', 'Status', 'Priority', 'CTR', 'Updated', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-muted">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-muted">No items found</td></tr>
              ) : items.map((item) => (
                <tr key={item._id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{item.title}</p>
                    {item.platform && <p className="text-xs text-ink-subtle mt-0.5">{item.platform}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-muted">
                      {TYPE_LABEL[item.type] ?? item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {item.placementIds?.length ?? 0} placement{item.placementIds?.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[item.status] ?? 'bg-surface-3 text-ink-muted'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{item.priority ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{ctr(item)}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/admin/monetization/${item._id}`}
                        className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => handleAction('duplicate', item)}
                        disabled={!!actionLoading}
                        className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {item.status === 'published' ? (
                        <button
                          onClick={() => handleAction('unpublish', item)}
                          disabled={!!actionLoading}
                          className="rounded-lg p-1.5 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                          title="Unpublish"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </button>
                      ) : item.status !== 'archived' ? (
                        <button
                          onClick={() => handleAction('publish', item)}
                          disabled={!!actionLoading}
                          className="rounded-lg p-1.5 text-green-400 hover:bg-green-500/10 transition-colors"
                          title="Publish"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      {item.status !== 'published' && item.status !== 'archived' && (
                        <button
                          onClick={() => handleAction('archive', item)}
                          disabled={!!actionLoading}
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors"
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {user?.role === 'owner' && (
                        <button
                          onClick={() => { setDeleteError(''); setDeleteTarget(item); }}
                          disabled={!!actionLoading || item.status === 'published'}
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={item.status === 'published' ? 'Unpublish trước khi xoá' : 'Xoá'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface-1 p-6 shadow-xl mx-4">
            <h2 className="text-base font-semibold text-ink mb-1">Xoá item này?</h2>
            <p className="text-sm text-ink-muted mb-1">
              <span className="font-medium text-ink">{deleteTarget.title}</span>
            </p>
            <p className="text-xs text-ink-subtle mb-4">
              Status: {deleteTarget.status} · Thao tác này không thể hoàn tác.
            </p>
            {deleteError && (
              <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{deleteError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                disabled={deleteLoading}
                className="rounded-lg border border-hairline bg-surface-2 px-4 py-2 text-sm text-ink hover:bg-surface-3 transition-colors disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {deleteLoading ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
