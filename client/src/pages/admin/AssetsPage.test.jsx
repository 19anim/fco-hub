/** @vitest-environment jsdom */
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import AssetsPage from './AssetsPage.jsx';
import AdminSidebar from '../../components/admin/AdminSidebar.jsx';
import { API_BASE } from '../../config/api';

const { apiMock, axiosCreateMock } = vi.hoisted(() => {
  const mock = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  };
  return {
    apiMock: mock,
    axiosCreateMock: vi.fn(() => mock),
  };
});

vi.mock('axios', () => ({
  default: {
    create: axiosCreateMock,
  },
}));

vi.mock('../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => globalThis.__adminAuthMock,
}));

const activeAsset = {
  id: 'asset-1',
  _id: 'asset-1',
  category: 'cardTheme',
  key: '865',
  label: 'Card theme 865',
  status: 'active',
  sourcePath: '/fco/card-themes/card-theme-865.png',
  activeVersion: 2,
  versionCount: 2,
  active: {
    secureUrl: 'https://res.cloudinary.com/demo/card-865-v2.png',
    width: 300,
    height: 420,
    format: 'png',
    bytes: 2048,
    uploadedAt: '2026-07-07T00:00:00.000Z',
    source: 'admin',
  },
  versions: [
    {
      version: 1,
      cloudinaryPublicId: 'fco/card-themes/865-v1',
      secureUrl: 'https://res.cloudinary.com/demo/card-865-v1.png',
      width: 300,
      height: 420,
      format: 'png',
      bytes: 1024,
      uploadedBy: 'manager-1',
      uploadedAt: '2026-07-06T00:00:00.000Z',
      source: 'migration',
    },
    {
      version: 2,
      cloudinaryPublicId: 'fco/card-themes/865-v2',
      secureUrl: 'https://res.cloudinary.com/demo/card-865-v2.png',
      width: 300,
      height: 420,
      format: 'png',
      bytes: 2048,
      uploadedBy: 'manager-2',
      uploadedAt: '2026-07-07T00:00:00.000Z',
      source: 'admin',
    },
  ],
  createdAt: '2026-07-06T00:00:00.000Z',
  updatedAt: '2026-07-07T00:00:00.000Z',
};

function makeService(overrides = {}) {
  return {
    list: vi.fn(async () => ({ success: true, data: { data: [activeAsset], pagination: { page: 1, limit: 24, total: 1, pages: 1 } } })),
    getById: vi.fn(async () => ({ success: true, data: activeAsset })),
    upload: vi.fn(async () => ({ success: true, data: { ...activeAsset, id: 'asset-2', _id: 'asset-2', category: 'general', key: 'new-asset' } })),
    replace: vi.fn(async () => ({ success: true, data: { ...activeAsset, activeVersion: 3, versionCount: 3 } })),
    setActiveVersion: vi.fn(async () => ({ success: true, data: { ...activeAsset, activeVersion: 1 } })),
    archive: vi.fn(async () => ({ success: true, data: { ...activeAsset, status: 'archived' } })),
    ...overrides,
  };
}

async function render(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(element));
  await act(async () => Promise.resolve());
  return {
    container,
    root,
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

function file(name = 'replacement.png') {
  return new File(['image'], name, { type: 'image/png' });
}

async function change(element, value) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function chooseFile(input, nextFile) {
  Object.defineProperty(input, 'files', { configurable: true, value: [nextFile] });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
}

async function click(element) {
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await act(async () => Promise.resolve());
}

beforeEach(() => {
  globalThis.__adminAuthMock = { user: { role: 'manager', permissions: ['assets.view'] }, logout: vi.fn() };
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-preview');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  apiMock.get.mockReset();
  apiMock.post.mockReset();
  apiMock.patch.mockReset();
  vi.restoreAllMocks();
  document.body.replaceChildren();
  delete globalThis.__adminAuthMock;
});

describe('adminAssetsService', () => {
  it('maps list, detail, upload, rollback, and archive endpoints without multipart content-type override', async () => {
    vi.resetModules();
    const formData = new FormData();
    apiMock.get.mockResolvedValue({ data: { success: true } });
    apiMock.post.mockResolvedValue({ data: { success: true } });
    apiMock.patch.mockResolvedValue({ data: { success: true } });
    const { adminAssetsService } = await import('../../services/adminAssets');

    await adminAssetsService.list({ status: 'active' });
    await adminAssetsService.getById('asset-1');
    await adminAssetsService.upload(formData);
    await adminAssetsService.replace('asset-1', formData);
    await adminAssetsService.setActiveVersion('asset-1', 1);
    await adminAssetsService.archive('asset-1');

    expect(axios.create).toHaveBeenCalledWith({ baseURL: `${API_BASE}/admin/assets`, withCredentials: true });
    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/', { params: { status: 'active' } });
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/asset-1');
    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/upload', formData);
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/asset-1/upload', formData);
    expect(apiMock.patch).toHaveBeenNthCalledWith(1, '/asset-1/active-version', { version: 1 });
    expect(apiMock.patch).toHaveBeenNthCalledWith(2, '/asset-1/archive');
  });
});

describe('Admin asset navigation', () => {
  it('shows the Assets nav item only when assets.view is allowed', async () => {
    const allowed = await render(<MemoryRouter><AdminSidebar isOpen={false} onClose={() => {}} /></MemoryRouter>);
    expect(allowed.container.textContent).toContain('Assets');
    await allowed.unmount();

    globalThis.__adminAuthMock = { user: { role: 'manager', permissions: [] }, logout: vi.fn() };
    const denied = await render(<MemoryRouter><AdminSidebar isOpen={false} onClose={() => {}} /></MemoryRouter>);
    expect(denied.container.textContent).not.toContain('Assets');
    await denied.unmount();
  });
});

describe('AssetsPage', () => {
  it('loads a paginated active list, filters by category/status/search, and shows detail metadata/history', async () => {
    const service = makeService();
    const mounted = await render(<AssetsPage service={service} />);

    expect(service.list).toHaveBeenCalledWith({ page: 1, limit: 24, status: 'active' });
    expect(mounted.container.textContent).toContain('Card theme 865');
    expect(mounted.container.textContent).toContain('Active version v2');
    expect(mounted.container.textContent).toContain('Rollback to v1');
    expect(mounted.container.querySelector('img')?.getAttribute('src')).toContain('https://res.cloudinary.com/demo/card-865-v2.png');

    const search = mounted.container.querySelector('input[placeholder="Key, label, source, public ID"]');
    await change(search, '865');
    const selects = mounted.container.querySelectorAll('select');
    await change(selects[0], 'cardTheme');
    await change(selects[1], 'all');

    expect(service.list).toHaveBeenLastCalledWith({ page: 1, limit: 24, category: 'cardTheme', search: '865' });
    await mounted.unmount();
  });

  it('creates a general asset with editable generated slug and multipart form data', async () => {
    const service = makeService({ list: vi.fn(async () => ({ success: true, data: { data: [], pagination: { page: 1, limit: 24, total: 0, pages: 0 } } })) });
    const mounted = await render(<AssetsPage service={service} />);

    const selects = mounted.container.querySelectorAll('select');
    await change(selects[2], 'general');
    const labelInput = mounted.container.querySelector('input[placeholder="Human-readable label"]');
    await change(labelInput, 'Hero Banner');
    const keyInput = mounted.container.querySelector('input[placeholder="asset-slug"]');
    expect(keyInput.value).toBe('hero-banner');
    await change(keyInput, 'editable-banner');
    await chooseFile(mounted.container.querySelector('input[type="file"]'), file('hero.png'));

    expect(mounted.container.textContent).toContain('Create asset');
    await click(mounted.container.querySelector('button[type="submit"]'));

    const formData = service.upload.mock.calls[0][0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('category')).toBe('general');
    expect(formData.get('key')).toBe('editable-banner');
    expect(formData.get('label')).toBe('Hero Banner');
    expect(formData.get('file').name).toBe('hero.png');
    expect(URL.createObjectURL).toHaveBeenCalled();

    await mounted.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview');
  });

  it('replaces an existing asset with old and new previews without setting multipart content-type manually', async () => {
    const service = makeService();
    const mounted = await render(<AssetsPage service={service} />);
    await chooseFile(mounted.container.querySelector('input[type="file"]'), file());

    expect(mounted.container.textContent).toContain('Current active');
    expect(mounted.container.textContent).toContain('New local preview');
    expect(mounted.container.textContent).toContain('Replace with new version');
    await click(mounted.container.querySelector('button[type="submit"]'));

    expect(service.replace).toHaveBeenCalledWith('asset-1', expect.any(FormData));
    expect(service.upload).not.toHaveBeenCalled();
    await mounted.unmount();
  });

  it('creates instead of replacing when the upload identity does not match the selected detail', async () => {
    const service = makeService();
    const mounted = await render(<AssetsPage service={service} />);

    const selects = mounted.container.querySelectorAll('select');
    await change(selects[2], 'general');
    const labelInput = mounted.container.querySelector('input[placeholder="Human-readable label"]');
    await change(labelInput, 'Standalone Banner');
    await chooseFile(mounted.container.querySelector('input[type="file"]'), file('standalone.png'));

    expect(mounted.container.textContent).toContain('Create asset');
    await click(mounted.container.querySelector('button[type="submit"]'));

    expect(service.upload).toHaveBeenCalledWith(expect.any(FormData));
    expect(service.replace).not.toHaveBeenCalled();
    await mounted.unmount();
  });

  it('rolls back inactive versions and keeps later history visible after success', async () => {
    const service = makeService();
    const mounted = await render(<AssetsPage service={service} />);

    expect(mounted.container.textContent).not.toContain('Rollback to v2');
    await click([...mounted.container.querySelectorAll('button')].find((button) => button.textContent.includes('Rollback to v1')));

    expect(window.confirm).toHaveBeenCalledWith('Rollback cardTheme/865 to version 1?');
    expect(service.setActiveVersion).toHaveBeenCalledWith('asset-1', 1);
    expect(mounted.container.textContent).toContain('Later versions remain in history');
    await mounted.unmount();
  });

  it('archives after confirmation and reloads the default active filter', async () => {
    const service = makeService();
    const mounted = await render(<AssetsPage service={service} />);

    await click([...mounted.container.querySelectorAll('button')].find((button) => button.textContent.includes('Archive')));

    expect(window.confirm).toHaveBeenCalledWith('Archive cardTheme/865? It will disappear from the default active public map.');
    expect(service.archive).toHaveBeenCalledWith('asset-1');
    expect(service.list).toHaveBeenCalledWith({ page: 1, limit: 24, status: 'active' });
    expect(mounted.container.textContent).toContain('removed from the active library and public map');
    await mounted.unmount();
  });

  it('keeps current detail/preview on failed rollback and shows actionable server messages', async () => {
    const failure = Object.assign(new Error('Conflict'), { response: { status: 409, data: { message: 'Asset was modified during replacement' } } });
    const service = makeService({ setActiveVersion: vi.fn(async () => { throw failure; }) });
    const mounted = await render(<AssetsPage service={service} />);

    await click([...mounted.container.querySelectorAll('button')].find((button) => button.textContent.includes('Rollback to v1')));

    expect(mounted.container.textContent).toContain('Asset was modified during replacement');
    expect(mounted.container.textContent).toContain('Refresh and retry');
    expect(mounted.container.textContent).toContain('Active version v2');
    await mounted.unmount();
  });

  it('keeps current detail/preview on failed archive and explains authorization and upload errors', async () => {
    const failure = Object.assign(new Error('Forbidden'), { response: { status: 403, data: { message: 'Permission required: assets.archive' } } });
    const service = makeService({ archive: vi.fn(async () => { throw failure; }) });
    const mounted = await render(<AssetsPage service={service} />);

    await click([...mounted.container.querySelectorAll('button')].find((button) => button.textContent.includes('Archive')));

    expect(mounted.container.textContent).toContain('Permission required: assets.archive');
    expect(mounted.container.textContent).toContain('missing the required asset permission');
    expect(mounted.container.textContent).toContain('Active version v2');
    await mounted.unmount();
  });
});
