import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { trackImpression, getClickUrl } from '../../../utils/monetizationTracking';

export default function AffiliateCtaCard({ item, placement, entity }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackImpression(item._id, placement, entity?.type, entity?.id);
    }
  }, [item._id, placement, entity]);

  const clickUrl = getClickUrl(item._id, placement, entity?.type, entity?.id);

  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-4 space-y-3">
      {item.content?.logoUrl && (
        <img src={item.content.logoUrl} alt="" className="h-8 w-auto object-contain" />
      )}
      <div>
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        {item.description && <p className="mt-0.5 text-xs text-ink-muted">{item.description}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {item.affiliateLinks?.length > 0 ? (
          item.affiliateLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/80 transition-colors"
            >
              {link.label} <ExternalLink className="h-3 w-3" />
            </a>
          ))
        ) : (
          <a
            href={clickUrl}
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/80 transition-colors"
          >
            {item.content?.ctaLabel || 'Xem ngay'} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
