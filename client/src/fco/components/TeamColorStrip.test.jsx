/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { AssetProvider } from '../assets/AssetProvider.jsx';
import { TeamColorStrip } from './TeamColorStrip.jsx';

async function renderWithAssets(element, map = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <AssetProvider loadAssetMap={() => Promise.resolve({ map, updatedAt: null })}>
        {element}
      </AssetProvider>,
    );
  });

  await act(async () => {
    await Promise.resolve();
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

describe('TeamColorStrip', () => {
  it('resolves strip icons through teamColorIcon identities', async () => {
    const mounted = await renderWithAssets(<TeamColorStrip result={{ groups: {} }} />, {
      teamColorIcon: {
        club: 'https://res.cloudinary.com/demo/club.png',
        grade: 'https://res.cloudinary.com/demo/grade.png',
        relation: 'https://res.cloudinary.com/demo/relation.png',
      },
    });

    expect([...mounted.container.querySelectorAll('img.team-color-item__icon')].map((image) => image.getAttribute('src'))).toEqual([
      'https://res.cloudinary.com/demo/club.png',
      'https://res.cloudinary.com/demo/grade.png',
      'https://res.cloudinary.com/demo/relation.png',
    ]);

    await mounted.unmount();
  });

  it('omits missing strip icon images', async () => {
    const mounted = await renderWithAssets(<TeamColorStrip result={{ groups: {} }} />, {});

    expect(mounted.container.querySelector('img.team-color-item__icon')).toBeNull();
    expect(mounted.container.querySelectorAll('.team-color-item__icon-placeholder')).toHaveLength(3);

    await mounted.unmount();
  });
});
