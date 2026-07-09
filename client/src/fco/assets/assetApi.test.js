import { describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { fetchPublicAssetMap } from './assetApi.js';
import { API_BASE } from '../../config/api.js';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('fetchPublicAssetMap', () => {
  it('uses the FCO API base URL convention for the public map endpoint', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { cardTheme: { 865: 'https://res.cloudinary.com/demo/card-theme.png' } },
        updatedAt: '2026-07-07T00:00:00.000Z',
      },
    });

    await expect(fetchPublicAssetMap()).resolves.toEqual({
      map: { cardTheme: { 865: 'https://res.cloudinary.com/demo/card-theme.png' } },
      updatedAt: '2026-07-07T00:00:00.000Z',
    });
    expect(axios.get).toHaveBeenCalledWith(`${API_BASE}/assets/public-map`);
  });

  it('normalizes missing response fields to an empty map and null revision', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true } });

    await expect(fetchPublicAssetMap()).resolves.toEqual({ map: {}, updatedAt: null });
  });
});
