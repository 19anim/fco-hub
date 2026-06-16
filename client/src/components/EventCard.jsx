import { ExternalLink, Info, Zap, Newspaper, ChevronRight } from 'lucide-react';

export default function EventCard({ event, viewMode }) {
  const isGrid = viewMode === 'grid';

  if (isGrid) {
    return (
      <div className="group bg-surface-1 border border-hairline rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-surface-2 hover:shadow-xl hover:shadow-black/40 flex flex-col">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-2 mb-4">
            {event.isSubdomain ? (
              <span className="px-2.5 py-0.5 bg-brand-blue/20 text-brand-blue text-xs font-semibold uppercase tracking-wider rounded-full">
                Event
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-warning/20 text-warning text-xs font-semibold uppercase tracking-wider rounded-full">
                News
              </span>
            )}
            <span className="text-xs text-ink-subtle">
              {event.dateLabel}
            </span>
          </div>
          <h3 className="text-lg font-semibold leading-tight mb-4 line-clamp-2 group-hover:text-brand-blue transition-colors text-ink">
            {event.title}
          </h3>
        </div>
        <div className="px-6 py-4 border-t border-hairline flex items-center justify-between bg-surface-1/50">
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-subtle hover:text-ink-muted flex items-center gap-1.5 transition-colors"
          >
            <Info className="w-3 h-3" />
            Chi tiết
          </a>
          <a
            href={event.launchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 bg-brand-blue hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/20"
          >
            Mở ngay
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="group p-4 bg-surface-1 border border-hairline rounded-2xl flex items-center justify-between transition-all hover:border-surface-2">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          event.isSubdomain ? 'bg-brand-blue/10 text-brand-blue' : 'bg-warning/10 text-warning'
        }`}>
          {event.isSubdomain ? <Zap className="w-5 h-5" /> : <Newspaper className="w-5 h-5" />}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold truncate text-ink">{event.title}</h3>
          <p className="text-xs text-ink-subtle">{event.dateLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <a
          href={event.launchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 rounded-full bg-surface-2 text-white hover:bg-brand-blue transition-all"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <ChevronRight className="w-4 h-4 text-ink-subtle" />
      </div>
    </div>
  );
}
