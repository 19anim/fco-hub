/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

vi.mock('../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({ user: null }),
}));

vi.mock('../api.js', () => ({
  fetchMeta: vi.fn(() => Promise.resolve({})),
}));

vi.mock('./assetApi.js', () => ({
  fetchPublicAssetMap: vi.fn(),
}));

vi.mock('../views/DatabaseView.jsx', () => ({
  default: () => <div>Database view</div>,
}));

vi.mock('../views/EventsView.jsx', () => ({
  default: () => <div>Events view</div>,
}));

vi.mock('../views/VideosView.jsx', () => ({
  default: () => <div>Videos view</div>,
}));

vi.mock('../views/UpgradeView.jsx', () => ({
  default: () => <div>Upgrade view</div>,
}));

vi.mock('../views/SquadView.jsx', () => ({
  default: () => <div>Squad view</div>,
}));

vi.mock('../views/DetailView.jsx', () => ({
  default: () => <div>Detail view</div>,
}));

vi.mock('../views/CompareView.jsx', () => ({
  default: () => <div>Compare view</div>,
}));

vi.mock('../views/WatchlistView.jsx', () => ({
  default: () => <div>Watchlist view</div>,
}));

function deferred() {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

async function renderApp() {
  const { default: FcoApp } = await import('../FcoApp.jsx');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<FcoApp />);
  });

  return { container, root };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/players');
  document.body.replaceChildren();
});

describe('FcoApp asset provider mount', () => {
  it('renders the app while the asset map is loading and fetches once across internal route changes', async () => {
    const { fetchPublicAssetMap } = await import('./assetApi.js');
    const request = deferred();
    fetchPublicAssetMap.mockReturnValue(request.promise);
    window.history.replaceState(null, '', '/players');

    const { container, root } = await renderApp();

    expect(container.textContent).toContain('Database view');
    expect(fetchPublicAssetMap).toHaveBeenCalledTimes(1);

    const upgradeLink = [...container.querySelectorAll('a')].find((link) => link.getAttribute('href') === '/upgrade');
    await act(async () => {
      upgradeLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Upgrade view');
    expect(fetchPublicAssetMap).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve({ map: {}, updatedAt: null });
      await request.promise;
    });

    await act(async () => {
      root.unmount();
    });
  });

  it('keeps rendering the app when the asset map request fails', async () => {
    const { fetchPublicAssetMap } = await import('./assetApi.js');
    fetchPublicAssetMap.mockRejectedValue(new Error('HTTP 500'));
    window.history.replaceState(null, '', '/players');

    const { container, root } = await renderApp();

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Database view');
    expect(fetchPublicAssetMap).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });
});
