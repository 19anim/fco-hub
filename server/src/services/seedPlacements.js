import MonetizationPlacement from '../models/MonetizationPlacement.js';

const DEFAULTS = [
  { key: 'videos_top', label: 'Videos – Trên cùng', page: 'videos', supportedTypes: ['sponsor_banner', 'ad_slot', 'custom_cta'], defaultLimit: 1 },
  { key: 'videos_inline', label: 'Videos – Nội dung chính', page: 'videos', supportedTypes: ['youtube_video'], defaultLimit: 20 },
  { key: 'videos_aff', label: 'Videos – Sidebar affiliate', page: 'videos', supportedTypes: ['affiliate_link', 'custom_cta'], defaultLimit: 4 },
  { key: 'videos_bottom', label: 'Videos – Dưới cùng', page: 'videos', supportedTypes: ['sponsor_banner', 'ad_slot', 'custom_cta', 'affiliate_link'], defaultLimit: 1 },
  { key: 'calculator_bottom', label: 'Calculator – Dưới cùng', page: 'calculator', supportedTypes: ['affiliate_link', 'custom_cta'], defaultLimit: 2 },
  { key: 'player_detail_sidebar', label: 'Player Detail – Sidebar', page: 'player', supportedTypes: ['affiliate_link', 'custom_cta', 'youtube_video', 'ad_slot'], defaultLimit: 2 },
  { key: 'squad_top', label: 'Squad Maker – Rail trên', page: 'squad', supportedTypes: ['sponsor_banner', 'ad_slot', 'custom_cta', 'affiliate_link', 'youtube_video'], defaultLimit: 1 },
  { key: 'squad_bottom', label: 'Squad Maker – Rail dưới', page: 'squad', supportedTypes: ['sponsor_banner', 'ad_slot', 'custom_cta', 'affiliate_link', 'youtube_video'], defaultLimit: 1 },
  { key: 'squad_sharing_top', label: 'Squad Sharing – Rail trên', page: 'squad-sharing', supportedTypes: ['sponsor_banner', 'ad_slot', 'custom_cta', 'affiliate_link', 'youtube_video'], defaultLimit: 1 },
  { key: 'squad_sharing_bottom', label: 'Squad Sharing – Rail dưới', page: 'squad-sharing', supportedTypes: ['sponsor_banner', 'ad_slot', 'custom_cta', 'affiliate_link', 'youtube_video'], defaultLimit: 1 },
];

const LEGACY_KEYS = [
  'dashboard_top',
  'dashboard_inline',
  'market_top',
  'market_inline',
];

export async function seedPlacements() {
  try {
    await MonetizationPlacement.deleteMany({ key: { $in: LEGACY_KEYS } });
    await Promise.all(
      DEFAULTS.map(({ key, ...rest }) =>
        MonetizationPlacement.updateOne(
          { key },
          { $set: rest },
          { upsert: true }
        )
      )
    );
    console.log(`[SeedPlacements] Upserted ${DEFAULTS.length} placements`);
  } catch (err) {
    console.error('[SeedPlacements] Seed failed:', err.message);
  }
}
