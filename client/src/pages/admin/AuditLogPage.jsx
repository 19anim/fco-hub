import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE } from '../../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/audit-log`, withCredentials: true });

const ACTION_COLORS = {
  'monetization.publish': 'text-green-400',
  'monetization.unpublish': 'text-yellow-400',
  'monetization.delete': 'text-red-400',
  'monetization.archive': 'text-orange-400',
  'users.create': 'text-blue-400',
  'users.delete': 'text-red-400',
  'auth.login': 'text-ink-muted',
  'auth.changePassword': 'text-yellow-400',
};

function actionColor(action) {
  return ACTION_COLORS[action] ?? 'text-ink-muted';
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' });
}

function DiffCell({ before, after }) {
  if (!before && !after) return <span className="text-ink-subtle">—</span>;
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  return (
    <div className="space-y-0.5 max-w-xs">
      {keys.map(k => {
        const b = before?.[k];
        const a = after?.[k];
        if (b === a) return null;
        return (
          <div key={k} className="text-xs">
            <span className="text-ink-muted">{k}: </span>
            {b !== undefined && <span className="line-through text-red-400/70 mr-1">{String(b)}</span>}
            {a !== undefined && <span className="text-green-400">{String(a)}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/', { params });
      if (res.data.success) {
        setLogs(res.data.data.logs);
        setTotal(res.data.data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <ClipboardList className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Audit Log</h1>
            <p className="text-xs text-ink-muted">{total.toLocaleString()} entries</p>
          </div>
        </div>
        <input
          type="text"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-brand-blue w-52"
        />
      </div>

      <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-ink-muted">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No audit log entries found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-2">
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {logs.map(log => (
                <tr key={log._id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-ink">{log.actorEmail ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono font-medium ${actionColor(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {log.resourceType && <span>{log.resourceType}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <DiffCell before={log.before} after={log.after} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-muted">
            Page {page} of {totalPages} · {total.toLocaleString()} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-ink-muted hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-hairline text-ink-muted hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
