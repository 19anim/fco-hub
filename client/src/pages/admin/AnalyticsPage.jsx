import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart2, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { API_BASE } from '../../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/analytics`, withCredentials: true });

const RANGES = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink">{value ?? '—'}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-subtle">{sub}</p>}
    </div>
  );
}

function TopTable({ title, rows, labelKey, valueKey = 'clicks', valueLabel = 'Clicks' }) {
  if (!rows?.length) return null;
  return (
    <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
      <div className="px-5 py-3 border-b border-hairline">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline">
            <th className="px-4 py-2 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">#</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Name</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-ink-muted uppercase tracking-wider">{valueLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-surface-2 transition-colors">
              <td className="px-4 py-2.5 text-ink-muted text-xs">{i + 1}</td>
              <td className="px-4 py-2.5 text-ink font-medium">{row[labelKey]}</td>
              <td className="px-4 py-2.5 text-right text-ink font-semibold">{row[valueKey]?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const from = new Date(Date.now() - range * 86400000).toISOString();
      const res = await api.get('/summary', { params: { from } });
      if (res.data.success) setData(res.data.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <BarChart2 className="h-5 w-5 text-brand-blue" />
          </div>
          <h1 className="text-xl font-semibold text-ink">Analytics</h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-hairline bg-surface-2 p-1">
          {RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.days ? 'bg-surface-3 text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-ink-muted text-sm">Loading...</p>}

      {!loading && data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Impressions" value={data.impressions?.toLocaleString()} />
            <StatCard label="Clicks"      value={data.clicks?.toLocaleString()} />
            <StatCard label="CTR"         value={`${data.ctr}%`} sub="click-through rate" />
          </div>

          {/* Daily CTR chart */}
          {data.dailyCtr?.length > 0 && (
            <div className="rounded-xl border border-hairline bg-surface-1 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-blue" />
                <h3 className="text-sm font-semibold text-ink">Daily Performance</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.dailyCtr} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline, #2a2a2a)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-ink-muted, #888)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-muted, #888)' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#888' }}
                    itemStyle={{ color: '#e0e0e0' }}
                  />
                  <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} dot={false} name="Impressions" />
                  <Line type="monotone" dataKey="clicks"      stroke="#22c55e" strokeWidth={2} dot={false} name="Clicks" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top tables */}
          <div className="grid gap-4 md:grid-cols-2">
            <TopTable
              title="Top Items by Clicks"
              rows={data.topItems}
              labelKey="title"
            />
            <TopTable
              title="Top Placements by Clicks"
              rows={data.topPlacements}
              labelKey="_id"
            />
          </div>

          {data.topEntities?.length > 0 && (
            <TopTable
              title="Top Entities by Clicks"
              rows={data.topEntities.map(e => ({
                label: `${e._id.entityType}:${e._id.entityId}`,
                clicks: e.clicks,
              }))}
              labelKey="label"
            />
          )}

          {!data.impressions && !data.clicks && (
            <div className="rounded-xl border border-hairline bg-surface-1 p-10 text-center">
              <BarChart2 className="h-8 w-8 text-ink-subtle mx-auto mb-3" />
              <p className="text-ink-muted text-sm">No events recorded in this period.</p>
              <p className="text-ink-subtle text-xs mt-1">Publish monetization items and visit pages to start tracking.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
