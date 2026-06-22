import { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { adminPlacementsService } from '../../services/adminPlacements';

const PAGE_LABELS = {
  dashboard: 'Dashboard',
  videos: 'Videos',
  player_detail: 'Chi tiết cầu thủ',
  database: 'Database',
  market: 'Market',
  calculator: 'Calculator',
};

export default function PlacementsPage() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    adminPlacementsService.list()
      .then(r => { if (r.success) setPlacements(r.data.placements); })
      .finally(() => setLoading(false));
  }, []);

  const toggleEnabled = async (p) => {
    try {
      const result = await adminPlacementsService.update(p._id, { enabled: !p.enabled });
      if (result.success) setPlacements(prev => prev.map(x => x._id === p._id ? result.data.placement : x));
    } catch { /* ignore */ }
  };

  const saveEdit = async () => {
    try {
      const result = await adminPlacementsService.update(editing, editValues);
      if (result.success) {
        setPlacements(prev => prev.map(x => x._id === editing ? result.data.placement : x));
        setEditing(null);
      }
    } catch { /* ignore */ }
  };

  const grouped = placements.reduce((acc, p) => {
    (acc[p.page] = acc[p.page] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
          <LayoutGrid className="h-5 w-5 text-brand-blue" />
        </div>
        <h1 className="text-xl font-semibold text-ink">Placements</h1>
      </div>

      {loading ? (
        <p className="text-ink-muted text-sm">Loading...</p>
      ) : (
        Object.entries(grouped).map(([page, items]) => (
          <div key={page} className="space-y-2">
            <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wider">
              {PAGE_LABELS[page] ?? page}
            </h2>
            <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline">
                    {['Key', 'Label', 'Types', 'Limit', 'Enabled', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {items.map(p => (
                    <tr key={p._id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-ink-subtle">{p.key}</td>
                      <td className="px-4 py-3 text-ink font-medium">{p.label}</td>
                      <td className="px-4 py-3 text-ink-muted text-xs">{p.supportedTypes?.join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.defaultLimit}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleEnabled(p)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.enabled ? 'bg-brand-blue' : 'bg-surface-3'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.enabled ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditing(p._id);
                            setEditValues({ label: p.label, defaultLimit: p.defaultLimit, description: p.description || '' });
                          }}
                          className="text-xs text-ink-muted hover:text-ink underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface-1 p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-semibold text-ink">Edit Placement</h2>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Label</label>
              <input
                value={editValues.label}
                onChange={e => setEditValues(v => ({ ...v, label: e.target.value }))}
                className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Default Limit</label>
              <input
                type="number"
                value={editValues.defaultLimit}
                onChange={e => setEditValues(v => ({ ...v, defaultLimit: Number(e.target.value) }))}
                className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Description</label>
              <textarea
                value={editValues.description}
                onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-hairline bg-canvas-dark px-3 py-2 text-sm text-ink outline-none focus:border-brand-blue"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-lg border border-hairline bg-surface-2 py-2 text-sm font-medium text-ink hover:bg-surface-3"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 btn-primary py-2 text-sm font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
