export default function ItemPreview({ data }) {
  const { type, title, content = {} } = data;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Preview</p>

      {type === 'youtube_video' && (
        <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
          {content.thumbnailUrl || content.youtubeVideoId ? (
            <img
              src={content.thumbnailUrl || `https://img.youtube.com/vi/${content.youtubeVideoId}/hqdefault.jpg`}
              alt={title}
              className="w-full object-cover aspect-video"
            />
          ) : (
            <div className="aspect-video bg-surface-2 flex items-center justify-center text-ink-muted text-sm">
              YouTube video preview
            </div>
          )}
          <div className="p-3">
            <p className="font-semibold text-ink text-sm">{title || 'Video title'}</p>
            {content.channelName && <p className="text-xs text-ink-muted mt-0.5">{content.channelName}</p>}
          </div>
        </div>
      )}

      {type === 'affiliate_link' && (
        <div className="rounded-xl border border-hairline bg-surface-1 p-4 flex items-center gap-4">
          {content.imageUrl && (
            <img src={content.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm">{title || 'Affiliate link'}</p>
            {content.targetUrl && <p className="text-xs text-ink-muted mt-0.5 truncate">{content.targetUrl}</p>}
          </div>
          {content.ctaLabel && (
            <button className="shrink-0 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white">
              {content.ctaLabel}
            </button>
          )}
        </div>
      )}

      {type === 'sponsor_banner' && (
        <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
          {content.imageUrl ? (
            <img src={content.imageUrl} alt={title} className="w-full object-cover max-h-32" />
          ) : (
            <div className="h-24 bg-surface-2 flex items-center justify-center text-ink-muted text-sm">
              Banner image preview
            </div>
          )}
          {content.ctaLabel && (
            <div className="p-3 flex justify-end">
              <button className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white">
                {content.ctaLabel}
              </button>
            </div>
          )}
        </div>
      )}

      {type === 'ad_slot' && (
        <div className="rounded-xl border border-dashed border-hairline bg-surface-1 h-24 flex items-center justify-center">
          <p className="text-sm text-ink-subtle">Ad slot placeholder</p>
        </div>
      )}

      {type === 'custom_cta' && (
        <div className="rounded-xl border border-hairline bg-surface-1 p-4 flex items-center justify-between gap-4">
          <p className="font-semibold text-ink text-sm">{title || 'CTA item'}</p>
          {content.ctaLabel && (
            <button className="shrink-0 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white">
              {content.ctaLabel}
            </button>
          )}
        </div>
      )}

      {!type && (
        <div className="rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-ink-subtle">
          Select a type to see the preview
        </div>
      )}
    </div>
  );
}
