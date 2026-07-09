import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AssetPreview from './AssetPreview.jsx';
import { formatBytes, formatDate } from './assetUtils.js';

export default function AssetDetailPanel({ asset, loading, error, mutation, onRollback, onArchive, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (loading) {
    return <div className="rounded-xl border border-hairline bg-surface-1 p-5 text-sm text-ink-muted">Loading asset detail...</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error}</div>;
  }

  if (!asset) {
    return <div className="rounded-xl border border-hairline bg-surface-1 p-5 text-sm text-ink-muted">Select an asset to inspect metadata and history.</div>;
  }

  const activeVersion = asset.versions?.find((version) => version.version === asset.activeVersion);
  const isArchived = asset.status === 'archived';

  return (
    <div className="space-y-4 rounded-xl border border-hairline bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-ink-subtle">{asset.category}/{asset.key}</p>
          <h2 className="truncate text-lg font-semibold text-ink">{asset.label || 'Untitled asset'}</h2>
          <p className="text-xs text-ink-muted">Active version v{asset.activeVersion} · {asset.versionCount} total versions</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            disabled={mutation === 'archive'}
            onClick={() => onArchive(asset)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/15 disabled:cursor-wait disabled:opacity-50"
          >
            <Archive className="h-3.5 w-3.5" /> {mutation === 'archive' ? 'Archiving...' : 'Archive'}
          </button>
          {isArchived && !confirmDelete && (
            <button
              type="button"
              disabled={mutation === 'delete'}
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 disabled:cursor-wait disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {isArchived && confirmDelete && (
        <div className="rounded-lg border border-red-700/40 bg-red-900/20 p-3 text-xs text-red-300">
          <p className="font-semibold">Delete permanently?</p>
          <p className="mt-1 text-red-400">This removes all {asset.versionCount} version{asset.versionCount !== 1 ? 's' : ''} from Cloudinary and the database. This cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={mutation === 'delete'}
              onClick={() => { setConfirmDelete(false); onDelete(asset); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-700/60 px-3 py-1.5 font-semibold text-red-100 hover:bg-red-700/80 disabled:cursor-wait disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> {mutation === 'delete' ? 'Deleting...' : 'Delete permanently'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <AssetPreview title="Active preview" asset={activeVersion || asset.active} />

      <div className="grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
        <span>Status <b className="text-ink">{asset.status}</b></span>
        <span>Source path <b className="text-ink">{asset.sourcePath || '—'}</b></span>
        <span>Updated <b className="text-ink">{formatDate(asset.updatedAt)}</b></span>
        <span>Created <b className="text-ink">{formatDate(asset.createdAt)}</b></span>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">History</p>
        <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
          {[...(asset.versions || [])].sort((a, b) => b.version - a.version).map((version) => {
            const isActive = version.version === asset.activeVersion;
            return (
              <div key={version.version} className="grid gap-3 p-3 text-xs text-ink-muted sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">v{version.version}</span>
                    {isActive && <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-brand-blue">active</span>}
                    <span>{version.width}×{version.height}</span>
                    <span>{formatBytes(version.bytes)}</span>
                    <span className="uppercase">{version.format}</span>
                  </div>
                  <p className="mt-1 truncate text-ink-subtle">{version.cloudinaryPublicId}</p>
                  <p className="mt-1">Uploaded {formatDate(version.uploadedAt)} · {version.source} · {version.uploadedBy || 'system'}</p>
                </div>
                {!isActive && (
                  <button
                    type="button"
                    disabled={mutation === `rollback-${version.version}`}
                    onClick={() => onRollback(asset, version.version)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 text-xs font-medium text-ink hover:bg-surface-3 disabled:cursor-wait disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> {mutation === `rollback-${version.version}` ? 'Rolling back...' : `Rollback to v${version.version}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
