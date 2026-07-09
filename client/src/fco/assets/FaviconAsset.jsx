import { useEffect } from 'react';
import { useAssets } from './AssetProvider.jsx';

export default function FaviconAsset() {
  const { getAssetUrl } = useAssets();
  const faviconUrl = getAssetUrl('siteAsset', 'favicon');

  useEffect(() => {
    if (!faviconUrl) return;

    let icon = document.head.querySelector('link[rel~="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.append(icon);
    }
    icon.href = faviconUrl;
  }, [faviconUrl]);

  return null;
}
