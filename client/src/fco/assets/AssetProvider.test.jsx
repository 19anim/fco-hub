/** @vitest-environment jsdom */
import React, { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { AssetProvider, useAssets } from './AssetProvider.jsx';
import { resetAssetDiagnosticsForTest } from './assetMap.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

async function render(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function AssetStateProbe({ onState }) {
  const assets = useAssets();

  useEffect(() => {
    onState({
      loading: assets.loading,
      error: assets.error,
      map: assets.map,
      updatedAt: assets.updatedAt,
      cardThemeUrl: assets.getAssetUrl('cardTheme', '865'),
    });
  }, [assets, onState]);

  return <span data-testid="asset-state">{assets.loading ? 'loading' : 'ready'}</span>;
}

afterEach(() => {
  resetAssetDiagnosticsForTest();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('AssetProvider', () => {
  it('renders children while loading and exposes loaded asset state', async () => {
    const request = deferred();
    const loadAssetMap = vi.fn(() => request.promise);
    const states = [];

    const mounted = await render(
      <AssetProvider loadAssetMap={loadAssetMap}>
        <AssetStateProbe onState={(state) => states.push(state)} />
      </AssetProvider>,
    );

    expect(loadAssetMap).toHaveBeenCalledTimes(1);
    expect(mounted.container.textContent).toContain('loading');
    expect(states.at(-1)).toMatchObject({ loading: true, error: null, map: {}, updatedAt: null, cardThemeUrl: null });

    await act(async () => {
      request.resolve({
        map: { cardTheme: { 865: 'https://res.cloudinary.com/demo/card-theme.png' } },
        updatedAt: '2026-07-07T00:00:00.000Z',
      });
      await request.promise;
    });

    expect(mounted.container.textContent).toContain('ready');
    expect(states.at(-1)).toMatchObject({
      loading: false,
      error: null,
      map: { cardTheme: { 865: 'https://res.cloudinary.com/demo/card-theme.png' } },
      updatedAt: '2026-07-07T00:00:00.000Z',
      cardThemeUrl: 'https://res.cloudinary.com/demo/card-theme.png',
    });

    await mounted.unmount();
  });

  it('keeps a single request when children rerender under the same mount', async () => {
    const loadAssetMap = vi.fn().mockResolvedValue({ map: {}, updatedAt: null });
    const states = [];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AssetProvider loadAssetMap={loadAssetMap}>
          <AssetStateProbe onState={(state) => states.push(state)} />
        </AssetProvider>,
      );
    });

    await act(async () => {
      root.render(
        <AssetProvider loadAssetMap={loadAssetMap}>
          <AssetStateProbe onState={(state) => states.push(state)} />
          <span>route changed</span>
        </AssetProvider>,
      );
    });

    expect(loadAssetMap).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders children after failure and resolves lookups to null', async () => {
    const failure = new Error('HTTP 500');
    const loadAssetMap = vi.fn().mockRejectedValue(failure);
    const states = [];

    const mounted = await render(
      <AssetProvider loadAssetMap={loadAssetMap}>
        <AssetStateProbe onState={(state) => states.push(state)} />
      </AssetProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.container.textContent).toContain('ready');
    expect(states.at(-1)).toMatchObject({
      loading: false,
      error: failure,
      map: {},
      updatedAt: null,
      cardThemeUrl: null,
    });

    await mounted.unmount();
  });
});
