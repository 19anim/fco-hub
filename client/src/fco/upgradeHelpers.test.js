import { describe, expect, it } from 'vitest';
import {
  calculateEffectGaugeBonus,
  calculateUpgradeGauge,
  getLevelBadgeAssetIdentity,
  getMascotAssetIdentity,
  getSelectedMainUpgradeLevel,
  getSkillMovesBonusForLevel,
  getSkillMovesForLevel,
  getUpgradeAssetUrl,
  isUpgradeLevelSelectDisabled,
  normalizeMaterialOvr,
} from './upgradeHelpers.js';

describe('upgrade helper formula semantics', () => {
  it('keeps full gauge real success rate level-based', () => {
    const result = calculateUpgradeGauge({
      targetOvr: 100,
      currentLevel: 12,
      fodderOvrs: [200],
    });

    expect(result.gaugeRatio).toBe(1);
    expect(result.fullGaugeSuccessRate).toBe(0.01);
    expect(result.successRate).toBe(0.01);
  });

  it('calculates default OVR 200 through the formula instead of forcing full gauge', () => {
    const result = calculateUpgradeGauge({
      targetOvr: 205,
      currentLevel: 5,
      fodderOvrs: [200],
    });

    expect(result.totalGauge).toBeGreaterThan(0);
    expect(result.totalGauge).toBeLessThan(5);
    expect(result.gaugeRatio).toBeLessThan(1);
  });

  it('adds effect percent to session gauge before applying real success rate', () => {
    const withoutEffect = calculateUpgradeGauge({
      targetOvr: 205,
      currentLevel: 12,
      fodderOvrs: [200],
    });
    const withEffect = calculateUpgradeGauge({
      targetOvr: 205,
      currentLevel: 12,
      fodderOvrs: [200],
      eventGaugeBonus: calculateEffectGaugeBonus(20),
    });

    expect(withEffect.gaugeRatio).toBeGreaterThan(withoutEffect.gaugeRatio);
    expect(withEffect.successRate).toBeCloseTo(withEffect.fullGaugeSuccessRate * withEffect.gaugeRatio, 4);
    expect(withEffect.successRate).toBeLessThanOrEqual(0.01);
  });

  it('normalizes invalid material OVR as no material', () => {
    expect(normalizeMaterialOvr('')).toBeNull();
    expect(normalizeMaterialOvr('abc')).toBeNull();
    expect(normalizeMaterialOvr(0)).toBeNull();
    expect(normalizeMaterialOvr('200')).toBe(200);
  });

  it('uses the newly selected card level instead of carrying a maxed upgrade level', () => {
    expect(getSelectedMainUpgradeLevel({ upgradeLevel: 1 }, 13)).toBe(1);
  });

  it('keeps the level selector enabled at max level while idle', () => {
    expect(isUpgradeLevelSelectDisabled('idle')).toBe(false);
    expect(isUpgradeLevelSelectDisabled('running')).toBe(true);
  });
});

describe('upgrade asset identities', () => {
  const map = {
    upgradeBadge: { 0: 'https://res.cloudinary.com/demo/grade-0.png', 13: 'https://res.cloudinary.com/demo/grade-13.png' },
    upgradeMascot: { happy: 'https://res.cloudinary.com/demo/happy.png', sad: 'https://res.cloudinary.com/demo/sad.png' },
    upgradeBase: { default: 'https://res.cloudinary.com/demo/base.png' },
    upgradeEffect: { shatter: 'https://res.cloudinary.com/demo/shatter.webp' },
  };
  const getAssetUrl = (category, key) => map[category]?.[key] || null;

  it('resolves badge levels 0 through 13 through upgradeBadge identities', () => {
    expect(Array.from({ length: 14 }, (_, level) => getLevelBadgeAssetIdentity(level))).toEqual(
      Array.from({ length: 14 }, (_, level) => ['upgradeBadge', String(level)]),
    );
  });

  it('chooses the happy mascot only at full gauge', () => {
    expect(getMascotAssetIdentity(5)).toEqual(['upgradeMascot', 'happy']);
    expect(getMascotAssetIdentity(4.999)).toEqual(['upgradeMascot', 'sad']);
  });

  it('resolves upgrade base, shatter, mascot, and badges via the provided lookup', () => {
    expect(getUpgradeAssetUrl(getAssetUrl, ['upgradeBase', 'default'])).toBe('https://res.cloudinary.com/demo/base.png');
    expect(getUpgradeAssetUrl(getAssetUrl, ['upgradeEffect', 'shatter'])).toBe('https://res.cloudinary.com/demo/shatter.webp');
    expect(getUpgradeAssetUrl(getAssetUrl, getMascotAssetIdentity(5))).toBe('https://res.cloudinary.com/demo/happy.png');
    expect(getUpgradeAssetUrl(getAssetUrl, getLevelBadgeAssetIdentity(13))).toBe('https://res.cloudinary.com/demo/grade-13.png');
  });

  it('returns null for missing upgrade assets instead of synthesizing local URLs', () => {
    expect(getUpgradeAssetUrl(() => null, ['upgradeBase', 'default'])).toBeNull();
    expect(getUpgradeAssetUrl(() => null, getLevelBadgeAssetIdentity(13))).toBeNull();
  });

  it('bumps skillMoves by upgrade level tier and caps at 6', () => {
    expect(getSkillMovesBonusForLevel(4)).toBe(0);
    expect(getSkillMovesBonusForLevel(5)).toBe(1);
    expect(getSkillMovesBonusForLevel(7)).toBe(1);
    expect(getSkillMovesBonusForLevel(8)).toBe(2);
    expect(getSkillMovesBonusForLevel(13)).toBe(2);

    expect(getSkillMovesForLevel(4, 4)).toBe(4);
    expect(getSkillMovesForLevel(4, 5)).toBe(5);
    expect(getSkillMovesForLevel(5, 8)).toBe(6);
    expect(getSkillMovesForLevel(2, 8)).toBe(4);
    expect(getSkillMovesForLevel(null, 8)).toBeNull();
  });
});
