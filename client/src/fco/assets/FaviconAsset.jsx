import { useEffect } from 'react';
import { useAssets } from './AssetProvider.jsx';

export default function FaviconAsset({ fallbackUrl = null }) {
  const { loading, getAssetUrl } = useAssets();
  const faviconUrl = loading ? fallbackUrl : (getAssetUrl('siteAsset', 'favicon') || fallbackUrl);

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
