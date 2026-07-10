/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AssetProvider } from '../assets/AssetProvider.jsx';
import LevelBadge from './LevelBadge.jsx';
import { createTestQueryClient } from '../../testUtils/queryClient.js';

async function renderWithAssets(element, map = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={createTestQueryClient()}>
        <AssetProvider loadAssetMap={() => Promise.resolve({ map, updatedAt: null })}>
          {element}
        </AssetProvider>
      </QueryClientProvider>,
    );
  });

  await act(async () => {
    for (let i = 0; i < 10; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  });

  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('LevelBadge', () => {
  it('renders upgradeBadge Cloudinary URLs for levels 0 through 13', async () => {
    const map = {
      upgradeBadge: Object.fromEntries(
        Array.from({ length: 14 }, (_, level) => [String(level), `https://res.cloudinary.com/demo/grade-${level}.png`]),
      ),
    };

    const mounted = await renderWithAssets(
      <div>{Array.from({ length: 14 }, (_, level) => <LevelBadge key={level} level={level} />)}</div>,
      map,
    );

    const images = [...mounted.container.querySelectorAll('img.fco-level-badge')];
    expect(images.map((image) => image.getAttribute('src'))).toEqual(
      Array.from({ length: 14 }, (_, level) => `https://res.cloudinary.com/demo/grade-${level}.png`),
    );

    await mounted.unmount();
  });

  it('uses neutral text fallback when the badge URL is missing', async () => {
    const mounted = await renderWithAssets(<LevelBadge level={13} />, {});

    expect(mounted.container.querySelector('img')).toBeNull();
    expect(mounted.container.querySelector('.fco-level-badge--fallback')?.textContent).toBe('+13');

    await mounted.unmount();
  });
});
