import { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { trackImpression } from '../../../utils/monetizationTracking';

export default function YouTubeCard({ item, placement, entity, featured = false }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackImpression(item._id, placement, entity?.type, entity?.id);
    }
  }, [item._id, placement, entity]);

  const thumbnailUrl = item.content?.thumbnailUrl
    || (item.content?.youtubeVideoId
      ? `https://img.youtube.com/vi/${item.content.youtubeVideoId}/hqdefault.jpg`
      : null);

  const youtubeUrl = item.content?.youtubeUrl
    || (item.content?.youtubeVideoId
      ? `https://www.youtube.com/watch?v=${item.content.youtubeVideoId}`
      : '#');

  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-xl overflow-hidden border border-hairline bg-surface-1 hover:border-brand-blue/40 transition-colors ${featured ? 'w-full' : ''}`}
    >
      <div className="relative aspect-video bg-surface-2 overflow-hidden">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm group-hover:bg-brand-blue/80 transition-colors">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        </div>
      </div>
      <div className="p-3 space-y-0.5">
        <p className="text-sm font-semibold text-ink line-clamp-2">{item.title}</p>
        {item.description && (
          <p className="text-xs text-ink-muted line-clamp-2">{item.description}</p>
        )}
      </div>
    </a>
  );
}
