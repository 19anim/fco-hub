export const MAX_FODDERS = 5;
export const MAX_GAUGE = 5;
export const MIN_UPGRADE_LEVEL = 1;
export const MAX_UPGRADE_LEVEL = 13;

export const QUICK_ADD_GAUGE_TARGETS = Object.freeze([1, 2, 3, 4, 5]);

export const UPGRADE_MASCOT_IMAGES = Object.freeze({
  sad: '/upgrade-sad.png',
  happy: '/upgrade-happy.png',
});

export const BASE_GAUGE_BY_LEVEL = Object.freeze({
  1: 2.5,
  2: 1.66,
  3: 1.25,
  4: 1,
  5: 0.99,
  6: 0.99,
  7: 0.99,
  8: 0.99,
  9: 0.99,
  10: 0.99,
  11: 0.99,
  12: 0.99,
});

export const UPGRADE_OUTCOMES_BY_LEVEL = Object.freeze({
  1: Object.freeze({ ovrGain: 1, fullGaugeSuccessRate: 1 }),
  2: Object.freeze({ ovrGain: 1, fullGaugeSuccessRate: 0.81 }),
  3: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.64 }),
  4: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.5 }),
  5: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.26 }),
  6: Object.freeze({ ovrGain: 3, fullGaugeSuccessRate: 0.15 }),
  7: Object.freeze({ ovrGain: 4, fullGaugeSuccessRate: 0.07 }),
  8: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.05 }),
  9: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.04 }),
  10: Object.freeze({ ovrGain: 2, fullGaugeSuccessRate: 0.03 }),
  11: Object.freeze({ ovrGain: 3, fullGaugeSuccessRate: 0.02 }),
  12: Object.freeze({ ovrGain: 3, fullGaugeSuccessRate: 0.01 }),
});

export const FULL_GAUGE_SUCCESS_RATE_BY_LEVEL = Object.freeze(
  Object.fromEntries(
    Object.entries(UPGRADE_OUTCOMES_BY_LEVEL).map(([level, outcome]) => [
      level,
      outcome.fullGaugeSuccessRate,
    ]),
  ),
);
