import { useEffect, useRef, useState } from 'react';
import { detectAdBlock } from '../../utils/adBlockDetection';

const AD_CLIENT = 'ca-pub-3945555281408942';
const FILL_CHECK_DELAY_MS = 6000;

export default function AdSenseUnit({ slotId, width, height, className = '', style }) {
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
    if (blocked !== false) return;

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
  }, [blocked, slotId]);

  // blocked === null: detection still pending, don't render yet (avoids the white flash).
  // blocked === true: render the ins pre-marked unfilled so the CSS :has() collapse rule
  // applies immediately, instead of leaving the parent's reserved min-height unfilled forever.
  if (blocked === null) return null;

  const sized = width && height;

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className}`}
      style={{ display: 'inline-block', ...(sized ? { width, height } : {}), ...style }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slotId}
      {...(blocked ? { 'data-ad-status': 'unfilled' } : {})}
      {...(sized ? {} : { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' })}
    />
  );
}
