import { useEffect, useRef } from 'react';
import { trackImpression, getClickUrl } from '../../../utils/monetizationTracking';

export default function SponsorBanner({ item, placement, entity }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackImpression(item._id, placement, entity?.type, entity?.id);
    }
  }, [item._id, placement, entity]);

  const clickUrl = getClickUrl(item._id, placement, entity?.type, entity?.id);

  return (
    <a
      href={clickUrl}
      rel="noopener noreferrer sponsored"
      className="block rounded-xl overflow-hidden border border-hairline hover:opacity-90 transition-opacity"
    >
      {item.content?.imageUrl ? (
        <img src={item.content.imageUrl} alt={item.title} className="w-full h-auto" />
      ) : (
        <div className="flex h-20 items-center justify-center bg-surface-2 text-ink-muted text-sm">
          {item.title}
        </div>
      )}
    </a>
  );
}
