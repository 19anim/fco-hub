import { describe, expect, it } from 'vitest';
import {
  calculateEffectGaugeBonus,
  calculateUpgradeGauge,
  getSelectedMainUpgradeLevel,
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
