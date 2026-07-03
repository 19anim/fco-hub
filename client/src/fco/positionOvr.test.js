import { describe, expect, it } from 'vitest';
import { getOvrForSlotPosition } from './positionOvr.js';

describe('getOvrForSlotPosition', () => {
  it('uses side wingback OVR separately from fullback OVR', () => {
    const player = {
      ovr: 90,
      positions: [
        { position: 'RB', overall: 82 },
        { position: 'RWB', overall: 76 },
        { position: 'LB', overall: 81 },
        { position: 'LWB', overall: 75 },
      ],
    };

    expect(getOvrForSlotPosition(player, 'RB')).toEqual({ ovr: 82, ovrIsFallback: false });
    expect(getOvrForSlotPosition(player, 'RWB')).toEqual({ ovr: 76, ovrIsFallback: false });
    expect(getOvrForSlotPosition(player, 'LB')).toEqual({ ovr: 81, ovrIsFallback: false });
    expect(getOvrForSlotPosition(player, 'LWB')).toEqual({ ovr: 75, ovrIsFallback: false });
  });

  it('uses combined left/right labels from position ratings', () => {
    const player = {
      ovr: 136,
      positions: [{ position: 'ST', overall: 136 }],
      positionRatings: [
        { label: 'ST', value: 133 },
        { label: 'L/RWB', value: 111 },
        { label: 'L/RB', value: 108 },
      ],
    };

    expect(getOvrForSlotPosition(player, 'LB')).toEqual({ ovr: 108, ovrIsFallback: false });
    expect(getOvrForSlotPosition(player, 'RB')).toEqual({ ovr: 108, ovrIsFallback: false });
    expect(getOvrForSlotPosition(player, 'LWB')).toEqual({ ovr: 111, ovrIsFallback: false });
    expect(getOvrForSlotPosition(player, 'RWB')).toEqual({ ovr: 111, ovrIsFallback: false });
  });
});
