import { useAssets } from './AssetProvider.jsx';

export const FCO_SITE_LOGO_URL = 'https://res.cloudinary.com/dk6nhyxaq/image/upload/v1783688033/Fco-hub/site-assets/favicon-v3.png';

export default function FcoBrandLogo({ className = 'fco-brand-logo' }) {
  const { loading, getAssetUrl } = useAssets();
  const logoUrl = loading ? FCO_SITE_LOGO_URL : (getAssetUrl('siteAsset', 'favicon') || FCO_SITE_LOGO_URL);

  return <img className={className} src={logoUrl} alt="FCO Đá Phím" />;
}
