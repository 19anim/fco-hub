/** @vitest-environment jsdom */
import React, { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AssetProvider, useAssets } from './AssetProvider.jsx';
import { resetAssetDiagnosticsForTest } from './assetMap.js';
import { createTestQueryClient } from '../../testUtils/queryClient.js';

function withQueryClient(element) {
  return <QueryClientProvider client={createTestQueryClient()}>{element}</QueryClientProvider>;
}

async function waitFor(predicate, { timeout = 1000, interval = 10 } = {}) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('waitFor timed out');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

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

    const mounted = await render(withQueryClient(
      <AssetProvider loadAssetMap={loadAssetMap}>
        <AssetStateProbe onState={(state) => states.push(state)} />
      </AssetProvider>,
    ));

    expect(loadAssetMap).toHaveBeenCalledTimes(1);
    expect(mounted.container.textContent).toContain('loading');
    expect(states.at(-1)).toMatchObject({ loading: true, error: null, map: {}, updatedAt: null, cardThemeUrl: null });

    await act(async () => {
      request.resolve({
        map: { cardTheme: { 865: 'https://res.cloudinary.com/demo/card-theme.png' } },
        updatedAt: '2026-07-07T00:00:00.000Z',
      });
      await request.promise;
      await waitFor(() => states.at(-1)?.loading === false);
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
    const queryClient = createTestQueryClient();

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <AssetProvider loadAssetMap={loadAssetMap}>
            <AssetStateProbe onState={(state) => states.push(state)} />
          </AssetProvider>
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <AssetProvider loadAssetMap={loadAssetMap}>
            <AssetStateProbe onState={(state) => states.push(state)} />
            <span>route changed</span>
          </AssetProvider>
        </QueryClientProvider>,
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

    const mounted = await render(withQueryClient(
      <AssetProvider loadAssetMap={loadAssetMap}>
        <AssetStateProbe onState={(state) => states.push(state)} />
      </AssetProvider>,
    ));

    await act(async () => {
      await waitFor(() => states.at(-1)?.loading === false);
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
