import { ImageOff } from 'lucide-react';
import { formatBytes, formatDate } from './assetUtils.js';

export default function AssetPreview({ title = 'Preview', asset, url, fileName, compact = false }) {
  const imageUrl = url ?? asset?.secureUrl ?? asset?.active?.secureUrl;
  const meta = asset?.active ?? asset;

  return (
    <div className={`rounded-xl border border-hairline bg-surface-2 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {meta?.version && <span className="rounded-full bg-brand-blue/15 px-2 py-0.5 text-xs font-medium text-brand-blue">v{meta.version}</span>}
      </div>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-hairline bg-canvas-dark">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-ink-subtle">
            <ImageOff className="h-7 w-7" />
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
        <span>Dimensions <b className="text-ink">{meta?.width && meta?.height ? `${meta.width}×${meta.height}` : '—'}</b></span>
        <span>Format <b className="text-ink uppercase">{meta?.format || '—'}</b></span>
        <span>Bytes <b className="text-ink">{formatBytes(meta?.bytes)}</b></span>
        <span>Source <b className="text-ink">{meta?.source || 'local'}</b></span>
      </div>
      {(fileName || meta?.uploadedAt) && (
        <p className="truncate text-xs text-ink-subtle">{fileName || `Uploaded ${formatDate(meta.uploadedAt)}`}</p>
      )}
    </div>
  );
}
