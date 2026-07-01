import { describe, expect, it } from 'vitest';
import { calculateTrainingOvr } from './trainingOvrConfig.js';

describe('training OVR formula', () => {
  it('calculates before and after OVR from weighted component stats', () => {
    const statValues = {
      'Dứt điểm': 100,
      'Chọn vị trí': 101,
      'Giữ bóng': 102,
      'Lực sút': 103,
      'Đánh đầu': 104,
      'Phản ứng': 105,
      'Rê bóng': 106,
      'Sức mạnh': 107,
      'Tốc độ': 108,
      'Chuyền ngắn': 109,
      'Tăng tốc': 110,
      'Sút xa': 111,
      'Vô lê': 112,
    };

    const result = calculateTrainingOvr({
      position: 'ST',
      statValues,
      training: {
        'Dứt điểm': 2,
        'Chọn vị trí': 1,
      },
    });

    expect(result.before).toBe(104.02);
    expect(result.after).toBe(104.51);
    expect(result.gained).toBe(0.49);
  });
});
