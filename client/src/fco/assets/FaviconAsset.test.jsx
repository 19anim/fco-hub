/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { AssetProvider } from './AssetProvider.jsx';
import FaviconAsset from './FaviconAsset.jsx';

async function renderWithAssets(map = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <AssetProvider loadAssetMap={() => Promise.resolve({ map, updatedAt: null })}>
        <FaviconAsset />
      </AssetProvider>,
    );
  });

  await act(async () => {
    await Promise.resolve();
  });

  return {
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('FaviconAsset', () => {
  it('creates an icon link only for a valid Cloudinary favicon URL', async () => {
    const mounted = await renderWithAssets({
      siteAsset: { favicon: 'https://res.cloudinary.com/demo/favicon.svg' },
    });

    const icon = document.head.querySelector('link[rel~="icon"]');
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('href')).toBe('https://res.cloudinary.com/demo/favicon.svg');

    await mounted.unmount();
  });

  it('does not create or change an icon link for missing or local favicon URLs', async () => {
    const existing = document.createElement('link');
    existing.rel = 'icon';
    existing.href = 'https://example.com/original.svg';
    document.head.append(existing);

    const mounted = await renderWithAssets({
      siteAsset: { favicon: '/favicon.svg' },
    });

    expect(document.head.querySelectorAll('link[rel~="icon"]')).toHaveLength(1);
    expect(document.head.querySelector('link[rel~="icon"]')?.href).toBe('https://example.com/original.svg');

    await mounted.unmount();
  });
});
