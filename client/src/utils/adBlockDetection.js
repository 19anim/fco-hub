let cached = null;

// Classic bait element: cosmetic filter lists (EasyList etc.) hide elements
// matching these class/id names, even when the ad script itself loads fine
// and reports the slot as "filled" with a blank/empty creative.
export function detectAdBlock() {
  if (cached) return cached;

  cached = new Promise((resolve) => {
    const bait = document.createElement('div');
    bait.className = 'adsbox ad-banner ad-placement adsbygoogle';
    bait.style.cssText = 'position:absolute; left:-9999px; top:-9999px; width:1px; height:1px;';
    document.body.appendChild(bait);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const blocked = bait.offsetParent === null
          || bait.offsetHeight === 0
          || getComputedStyle(bait).display === 'none'
          || getComputedStyle(bait).visibility === 'hidden';
        bait.remove();
        resolve(blocked);
      });
    });
  });

  return cached;
}
