import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Database, RefreshCw, Play } from 'lucide-react';
import { API_BASE } from '../../config/api';

const api = axios.create({ baseURL: `${API_BASE}`, withCredentials: true });

async function fetchStatus() {
  const [enr, players] = await Promise.all([
    api.get('/enrichment/status').then(r => r.data.data),
    api.get('/players/meta').then(r => r.data).catch(() => null),
  ]);
  return { enrichment: enr, players };
}

// Pipeline chính: 1 → 2 → 3 (theo thứ tự)
// sync-nexon chạy độc lập để đồng bộ metadata từ Nexon
// Các luồng cũ (discover-hybrid, sync-full, sync, resync) đã bị ẩn
const ACTIONS = [
  {
    step: 1,
    key: 'scrape-seasons',
    label: 'Scrape Seasons',
    desc: 'Cập nhật danh sách mùa thẻ và sprite icon từ FIFAAddict',
    path: '/enrichment/fifaaddict/scrape-seasons',
    body: { headless: true },
    confirm: false,
  },
  {
    step: 2,
    key: 'discover-by-season',
    label: 'Discover by Season',
    desc: 'Crawl danh sách cầu thủ theo từng mùa, upsert PlayerEnrichment cơ bản',
    path: '/enrichment/fifaaddict/discover-by-season',
    body: { maxRoundsPerSeason: 50, delayMs: 500 },
    confirm: true,
  },
  {
    step: 3,
    key: 'bulk-detail',
    label: 'Bulk Detail Hydrate',
    desc: 'Fetch chi tiết stats, traits, workrate cho các record còn thiếu',
    path: '/enrichment/fifaaddict/bulk-detail',
    body: { batchSize: 50, delayMs: 500, limit: 0 },
    confirm: true,
  },
  {
    step: null,
    key: 'sync-nexon',
    label: 'Sync Nexon Metadata',
    desc: 'Đồng bộ danh sách cầu thủ từ Nexon (chạy độc lập)',
    path: '/players/sync-nexon',
    body: { limit: 90000 },
    confirm: true,
  },

  // --- Luồng cũ, không dùng nữa ---
  // { key: 'discover-hybrid',  label: 'Discover Hybrid',        path: '/enrichment/fifaaddict/discover-hybrid',  body: {} },
  // { key: 'sync-full',        label: 'FIFAAddict Full Sync',   path: '/enrichment/fifaaddict/sync-full',        body: {} },
  // { key: 'sync',             label: 'FIFAAddict Incremental', path: '/enrichment/fifaaddict/sync',             body: {} },
  // { key: 'resync',           label: 'Resync Failed',          path: '/enrichment/fifaaddict/resync',           body: {} },
];

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-4">
      <p className="text-2xl font-semibold text-ink">{value ?? '—'}</p>
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}

export default function DataOpsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [log, setLog] = useState([]);
  const pollRef = useRef(null);

  const load = async () => {
    try { setStatus(await fetchStatus()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 10000);
    return () => clearInterval(pollRef.current);
  }, []);

  const runAction = async (action) => {
    if (action.confirm && !window.confirm(`Run "${action.label}"?`)) return;
    setBusy(b => ({ ...b, [action.key]: true }));
    const ts = new Date().toLocaleTimeString();
    setLog(l => [{ key: action.key, label: action.label, ts, status: 'running', msg: '' }, ...l.slice(0, 19)]);
    try {
      const res = await api.post(action.path, action.body);
      const msg = res.data?.message || 'Started';
      setLog(l => l.map(e => e.key === action.key && e.ts === ts ? { ...e, status: 'ok', msg } : e));
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setLog(l => l.map(e => e.key === action.key && e.ts === ts ? { ...e, status: 'err', msg } : e));
    } finally {
      setBusy(b => ({ ...b, [action.key]: false }));
      setTimeout(load, 2000);
    }
  };

  const enr = status?.enrichment;
  const pl  = status?.players;
  const lr  = enr?.latestRun;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <Database className="h-5 w-5 text-brand-blue" />
          </div>
          <h1 className="text-xl font-semibold text-ink">Data Ops</h1>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:text-ink hover:bg-surface-3 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Status tiles */}
      {loading ? (
        <p className="text-ink-muted text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Players"     value={pl?.totalPlayers?.toLocaleString()} />
          <StatCard label="Enriched"          value={enr?.totalEnriched?.toLocaleString()} />
          <StatCard label="Matched"           value={enr?.totalMatched?.toLocaleString()} />
          <StatCard label="Missing Detail"    value={enr?.quality?.missingDetail?.toLocaleString()} />
        </div>
      )}

      {/* Latest job */}
      {lr && (
        <div className="rounded-xl border border-hairline bg-surface-1 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Latest Job</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              lr.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
              lr.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-red-500/20 text-red-400'
            }`}>{lr.status}</span>
          </div>
          {lr.message && <p className="text-xs text-ink-muted">{lr.message}</p>}
          {lr.status === 'running' && lr.requested > 0 && (
            <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full bg-brand-blue rounded-full transition-all duration-500"
                style={{ width: `${Math.round(((lr.processed || 0) / lr.requested) * 100)}%` }}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
            <span>Requested: <b className="text-ink">{lr.requested?.toLocaleString()}</b></span>
            <span>Processed: <b className="text-ink">{(lr.processed || 0).toLocaleString()}</b></span>
            <span>Failed: <b className={lr.failed > 0 ? 'text-red-400' : 'text-ink'}>{lr.failed || 0}</b></span>
          </div>
        </div>
      )}

      {/* Pipeline Actions */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Pipeline chính (chạy theo thứ tự)</p>
          <div className="rounded-xl border border-hairline bg-surface-1 divide-y divide-hairline overflow-hidden">
            {ACTIONS.filter(a => a.step !== null).map(action => (
              <div key={action.key} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-blue/40 bg-brand-blue/10 text-sm font-bold text-brand-blue">
                  {action.step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{action.label}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{action.desc}</p>
                </div>
                <button
                  onClick={() => runAction(action)}
                  disabled={!!busy[action.key]}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-3 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <Play className="h-3 w-3" />
                  {busy[action.key] ? 'Running...' : 'Run'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Chạy độc lập</p>
          <div className="rounded-xl border border-hairline bg-surface-1 divide-y divide-hairline overflow-hidden">
            {ACTIONS.filter(a => a.step === null).map(action => (
              <div key={action.key} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-2">
                  <Database className="h-4 w-4 text-ink-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{action.label}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{action.desc}</p>
                </div>
                <button
                  onClick={() => runAction(action)}
                  disabled={!!busy[action.key]}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-3 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <Play className="h-3 w-3" />
                  {busy[action.key] ? 'Running...' : 'Run'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity log */}
      {log.length > 0 && (
        <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
          <div className="px-5 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider border-b border-hairline">Activity</div>
          <div className="divide-y divide-hairline">
            {log.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  entry.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                  entry.status === 'ok'      ? 'bg-emerald-500/20 text-emerald-400' :
                                               'bg-red-500/20 text-red-400'
                }`}>{entry.status}</span>
                <span className="text-ink-muted text-xs shrink-0">{entry.ts}</span>
                <span className="text-ink font-medium shrink-0">{entry.label}</span>
                {entry.msg && <span className="text-ink-muted text-xs truncate">{entry.msg}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
