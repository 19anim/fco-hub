import { describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { fetchPlayerDetail } from './api.js';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('fetchPlayerDetail', () => {
  it('preserves every related season returned by the server', async () => {
    const relatedSeasons = Array.from({ length: 12 }, (_, index) => ({
      _id: `related-${index + 1}`,
      name: `Related ${index + 1}`,
      seasonId: 2026 - index,
      overall: 100 - index,
    }));

    axios.get.mockResolvedValueOnce({
      data: {
        data: {
          player: { _id: 'current', name: 'Current', overall: 100 },
          enrichment: { displayNameVi: 'Current', overall: 100 },
          relatedSeasons,
        },
      },
    });

    const detail = await fetchPlayerDetail('current');

    expect(detail.related).toHaveLength(12);
    expect(detail.related.map((player) => player.id)).toEqual(relatedSeasons.map((player) => player._id));
  });
});
