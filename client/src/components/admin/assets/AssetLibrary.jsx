import AssetPreview from './AssetPreview.jsx';
import { formatBytes } from './assetUtils.js';

function statusClass(status) {
  if (status === 'active') return 'bg-emerald-500/15 text-emerald-400';
  if (status === 'archived') return 'bg-red-500/15 text-red-400';
  return 'bg-surface-3 text-ink-subtle';
}

export default function AssetLibrary({ items, loading, error, selectedId, pagination, onSelect, onPageChange, onRetry }) {
  if (loading) {
    return <div className="rounded-xl border border-hairline bg-surface-1 p-6 text-sm text-ink-muted">Loading asset library...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
        <p className="font-semibold">Asset library failed to load.</p>
        <p className="mt-1 text-red-200/80">{error}</p>
        <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-500/10">Retry</button>
      </div>
    );
  }

  if (!items.length) {
    return <div className="rounded-xl border border-hairline bg-surface-1 p-8 text-center text-sm text-ink-muted">No assets match the current filters.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1">
        <div className="divide-y divide-hairline">
          {items.map((asset) => (
            <button
              key={asset.id || asset._id}
              type="button"
              onClick={() => onSelect(asset)}
              className={`grid w-full gap-4 px-4 py-3 text-left transition-colors md:grid-cols-[92px_1fr_auto] ${selectedId === (asset.id || asset._id) ? 'bg-brand-blue/10' : 'hover:bg-surface-2'}`}
            >
              <div className="w-20">
                <AssetPreview title={asset.label || asset.key} asset={asset} compact />
              </div>
              <div className="min-w-0 space-y-2 py-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink-subtle">{asset.category}/{asset.key}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(asset.status)}`}>{asset.status}</span>
                </div>
                <p className="truncate text-sm font-semibold text-ink">{asset.label || 'Untitled asset'}</p>
                <p className="truncate text-xs text-ink-muted">{asset.sourcePath || asset.active?.secureUrl || 'No source path'}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-right text-xs text-ink-muted md:min-w-56">
                <span>Active<br /><b className="text-ink">v{asset.activeVersion || '—'}</b></span>
                <span>Versions<br /><b className="text-ink">{asset.versionCount}</b></span>
                <span>Size<br /><b className="text-ink">{formatBytes(asset.active?.bytes)}</b></span>
              </div>
            </button>
          ))}
        </div>
      </div>
      {pagination?.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>Page {pagination.page} of {pagination.pages} · {pagination.total} assets</span>
          <div className="flex gap-2">
            <button type="button" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => onPageChange(pagination.page + 1)} className="rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
