import { useEffect, useRef } from 'react';
import { trackImpression } from '../../../utils/monetizationTracking';

export default function AdSlotPlaceholder({ item, placement, entity }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackImpression(item._id, placement, entity?.type, entity?.id);
    }
  }, [item._id, placement, entity]);

  const { provider, slotId, size } = item.content?.providerConfig || {};

  if (provider === 'google_adsense' && slotId) {
    return (
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', ...(size?.width && { width: size.width }), ...(size?.height && { height: size.height }) }}
        data-ad-client={item.content?.providerConfig?.adClient || ''}
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
