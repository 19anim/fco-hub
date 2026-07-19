import { useEffect, useRef, useState } from 'react';
import { trackImpression } from '../../../utils/monetizationTracking';
import { detectAdBlock } from '../../../utils/adBlockDetection';
import { resolveAdSlotId, resolveAdSize } from '../adPlacementShapes';

const DEFAULT_AD_CLIENT = 'ca-pub-3945555281408942';
const FILL_CHECK_DELAY_MS = 6000;

export default function AdSlotPlaceholder({ item, placement, entity }) {
  const tracked = useRef(false);
  const pushed = useRef(false);
  const insRef = useRef(null);
  // Don't touch adsbygoogle.push() until we know a blocker isn't present —
  // Google's own script paints a white iframe immediately on push, before
  // any post-hoc "unfilled" check can react, so gate render on detection first.
  const [blocked, setBlocked] = useState(null);

  useEffect(() => {
    let cancelled = false;
    detectAdBlock().then((isBlocked) => { if (!cancelled) setBlocked(isBlocked); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackImpression(item._id, placement, entity?.type, entity?.id);
    }
  }, [item._id, placement, entity]);

  const { provider, adClient } = item.content?.providerConfig || {};
  const slotId = resolveAdSlotId(placement);
  const size = resolveAdSize(placement);

  useEffect(() => {
    if (provider !== 'google_adsense' || !slotId || blocked !== false) return;

    if (!pushed.current) {
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // AdSense script not ready — ins stays empty, no crash
      }
    }

    const timer = setTimeout(() => {
      const el = insRef.current;
      if (el && !el.getAttribute('data-ad-status')) {
        el.setAttribute('data-ad-status', 'unfilled');
      }
    }, FILL_CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [provider, slotId, blocked]);

  if (provider === 'google_adsense' && slotId && size) {
    if (blocked === null) return null;
    return (
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: 'inline-block', width: size.width, height: size.height }}
        data-ad-client={adClient || DEFAULT_AD_CLIENT}
        data-ad-slot={slotId}
        {...(blocked ? { 'data-ad-status': 'unfilled' } : {})}
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
