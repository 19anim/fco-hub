import MonetizationPlacement from '../models/MonetizationPlacement.js';

const DEFAULTS = [
  { key: 'dashboard_top', label: 'Dashboard – Trên cùng', page: 'dashboard', supportedTypes: ['sponsor_banner', 'ad_slot', 'custom_cta'], defaultLimit: 1 },
  { key: 'dashboard_inline', label: 'Dashboard – Giữa trang', page: 'dashboard', supportedTypes: ['youtube_video', 'affiliate_link'], defaultLimit: 3 },
  { key: 'videos_top', label: 'Videos – Trên cùng', page: 'videos', supportedTypes: ['sponsor_banner', 'ad_slot'], defaultLimit: 1 },
  { key: 'videos_inline', label: 'Videos – Giữa trang', page: 'videos', supportedTypes: ['youtube_video', 'affiliate_link'], defaultLimit: 3 },
  { key: 'market_top', label: 'Market – Trên cùng', page: 'market', supportedTypes: ['sponsor_banner', 'ad_slot'], defaultLimit: 1 },
  { key: 'market_inline', label: 'Market – Giữa trang', page: 'market', supportedTypes: ['affiliate_link'], defaultLimit: 3 },
  { key: 'calculator_bottom', label: 'Calculator – Dưới cùng', page: 'calculator', supportedTypes: ['affiliate_link', 'custom_cta'], defaultLimit: 2 },
  { key: 'player_detail_sidebar', label: 'Player Detail – Sidebar', page: 'player', supportedTypes: ['affiliate_link', 'custom_cta', 'youtube_video'], defaultLimit: 2 },
];

export async function seedPlacements() {
  try {
    const count = await MonetizationPlacement.countDocuments();
    if (count > 0) {
      console.log('[SeedPlacements] Placements already exist, skipping seed');
      return;
    }
    await MonetizationPlacement.insertMany(DEFAULTS);
    console.log(`[SeedPlacements] Seeded ${DEFAULTS.length} default placements`);
  } catch (err) {
    console.error('[SeedPlacements] Seed failed:', err.message);
  }
}
