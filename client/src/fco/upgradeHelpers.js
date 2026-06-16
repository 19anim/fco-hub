// Pure logic for the Upgrade Simulator.

// Map level boost to cumulative OVR increase.
// Based on spec: +0 -> +13 total +20 OVR.
const OVR_INCREASE_MAP = [
  0, // +0
  1, // +1
  2, // +2
  3, // +3
  4, // +4
  5, // +5
  6, // +6
  7, // +7
  9, // +8 (+2 jump)
  11,// +9
  13,// +10
  15,// +11
  17,// +12
  20 // +13 (+3 jump)
];

export function getOvrForLevel(baseOvr, level) {
  const boost = OVR_INCREASE_MAP[level] || 0;
  return baseOvr + boost;
}

// Calculate how many "percent" a fuel card contributes to the progress bar (5 slots = 100%).
export function calculateFuelValue(mainPlayer, fuelPlayer) {
  const diff = fuelPlayer.ovr - mainPlayer.ovr;
  let val = 15;
  if (diff >= 5) val = 30;
  else if (diff >= 0) val = 25;
  else if (diff >= -5) val = 20;

  const specialSeasons = ['ICON', 'TOTY', 'TOTS'];
  if (specialSeasons.includes(fuelPlayer.season)) val += 5;

  return Math.min(30, val);
}

export function getSuccessProbability(totalPercent) {
  if (totalPercent <= 0) return 0;
  if (totalPercent >= 100) return 0.95;
  return 0.1 + (totalPercent / 100) * 0.85;
}

export function rollUpgrade(probability) {
  return Math.random() < probability;
}
