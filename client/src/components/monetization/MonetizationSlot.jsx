import { useMonetizationFeed } from '../../hooks/useMonetizationFeed';
import YouTubeCard     from './renderers/YouTubeCard';
import AffiliateCtaCard from './renderers/AffiliateCtaCard';
import SponsorBanner   from './renderers/SponsorBanner';
import AdSlotPlaceholder from './renderers/AdSlotPlaceholder';

function renderItem(item, placement, entity) {
  const props = { item, placement, entity };
  switch (item.type) {
    case 'youtube_video':   return <YouTubeCard key={item._id} {...props} />;
    case 'affiliate_link':  return <AffiliateCtaCard key={item._id} {...props} />;
    case 'sponsor_banner':  return <SponsorBanner key={item._id} {...props} />;
    case 'ad_slot':         return <AdSlotPlaceholder key={item._id} {...props} />;
    case 'custom_cta':      return <AffiliateCtaCard key={item._id} {...props} />;
    default:                return null;
  }
}

export default function MonetizationSlot({ placement, entity, limit, className = '' }) {
  const { items, loading } = useMonetizationFeed({ placement, entity, limit });

  if (loading || !items.length) return null;

  return (
    <div className={className}>
      {items.map(item => renderItem(item, placement, entity))}
    </div>
  );
}
