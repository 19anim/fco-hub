import { useAssets } from '../assets/AssetProvider.jsx';
import { getLevelBadgeAssetIdentity, getUpgradeAssetUrl, normalizeUpgradeLevel } from '../upgradeHelpers.js';

// Ảnh badge đã normalize về canvas chuẩn 600x390 (tỉ lệ ~3:2)
// display size cơ sở: width=120, height=78 (scale=1)
const BADGE_BASE_W = 120;
const BADGE_BASE_H = 78;

// Legacy sprite config — kept for backward compatibility if needed elsewhere
const LEGACY_W = 102;
const LEGACY_H = 68;
export const LEVEL_SPRITE_CONFIG = Object.freeze(
  Object.fromEntries(
    Array.from({ length: 13 }, (_, index) => {
      const level = index + 1;
      return [
        level,
        Object.freeze({ x: index * LEGACY_W, y: 0, width: LEGACY_W, height: LEGACY_H }),
      ];
    }),
  ),
);

export default function LevelBadge({ level, scale = 1, className = '', title }) {
  const rawLevel = Math.trunc(Number(level));
  const safeLevel = rawLevel === 0 ? 0 : normalizeUpgradeLevel(level);
  const safeScale = Number.isFinite(Number(scale)) ? Number(scale) : 1;
  const { getAssetUrl } = useAssets();
  const badgeUrl = getUpgradeAssetUrl(getAssetUrl, getLevelBadgeAssetIdentity(safeLevel));
  const width = BADGE_BASE_W * safeScale;
  const height = BADGE_BASE_H * safeScale;
  const label = title || `Thẻ +${safeLevel}`;

  if (!badgeUrl) {
    return (
      <span
        className={`fco-level-badge fco-level-badge--fallback ${className}`.trim()}
        role="img"
        aria-label={label}
        style={{ width, height }}
      >
        +{safeLevel}
      </span>
    );
  }

  return (
    <img
      src={badgeUrl}
      className={`fco-level-badge ${className}`.trim()}
      role="img"
      aria-label={label}
      width={width}
      height={height}
      style={{ display: 'inline-block', objectFit: 'contain' }}
    />
  );
}
