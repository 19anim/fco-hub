/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { AssetProvider } from '../assets/AssetProvider.jsx';
import { PitchTeamColorList, TeamColorStrip } from './TeamColorStrip.jsx';

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

  it('renders country icons for live team-color country references', async () => {
    const result = {
      groups: {
        relation: {
          active: [{
            tcid: 'country-54',
            name: 'Brazil',
            ref_type: 'country',
            ref_id: '54',
            matched: 3,
            required: 3,
            matched_slots: ['player-1', 'player-2', 'player-3'],
            rewards: { ovr: 1 },
          }],
        },
      },
    };

    const strip = await renderWithAssets(
      <>
        <PitchTeamColorList result={result} />
        <TeamColorStrip result={result} bySlotId={{}} />
      </>,
      {},
    );

    const pitchIcon = strip.container.querySelector('.pitch-teamcolor-badge__icon');
    expect(pitchIcon?.getAttribute('src')).toBe('https://s1.fifaaddict.com/fo4/countries/54.png');

    await act(async () => {
      strip.container.querySelector('#teamColorRelationButton').click();
    });

    const detailIcon = strip.container.querySelector('.team-color-detail-card__icon');
    expect(detailIcon?.getAttribute('src')).toBe('https://s1.fifaaddict.com/fo4/countries/54.png');

    await strip.unmount();
  });
});
