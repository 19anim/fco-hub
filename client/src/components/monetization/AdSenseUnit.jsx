import { useEffect, useRef } from 'react';

const AD_CLIENT = 'ca-pub-3945555281408942';

export default function AdSenseUnit({ slotId, width, height, className = '', style }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not ready/blocked — ins stays empty, no crash
    }
  }, [slotId]);

  const sized = width && height;

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: 'inline-block', ...(sized ? { width, height } : {}), ...style }}
      data-ad-client={AD_CLIENT}
      data-ad-slot={slotId}
      {...(sized ? {} : { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' })}
    />
  );
}
