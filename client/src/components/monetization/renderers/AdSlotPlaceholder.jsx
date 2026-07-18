import { useEffect, useRef } from 'react';
import { trackImpression } from '../../../utils/monetizationTracking';
import { resolveAdSlotId } from '../adPlacementShapes';

const DEFAULT_AD_CLIENT = 'ca-pub-3945555281408942';

export default function AdSlotPlaceholder({ item, placement, entity }) {
  const tracked = useRef(false);
  const pushed = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackImpression(item._id, placement, entity?.type, entity?.id);
    }
  }, [item._id, placement, entity]);

  const { provider, size, adClient } = item.content?.providerConfig || {};
  const slotId = resolveAdSlotId(placement);

  useEffect(() => {
    if (provider !== 'google_adsense' || !slotId || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not ready/blocked — ins stays empty, no crash
    }
  }, [provider, slotId]);

  if (provider === 'google_adsense' && slotId) {
    return (
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: size?.height || 100, ...(size?.width && { width: size.width }), ...(size?.height && { height: size.height }) }}
        data-ad-client={adClient || DEFAULT_AD_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-hairline bg-surface-1 text-xs text-ink-subtle"
      style={{ minHeight: size?.height || 100 }}
    >
      Ad • {provider || 'unknown'}
    </div>
  );
}
