import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createAssetsController } from './assets.controller.js';
import { createAdminAssetsRouter } from '../routes/adminAssets.routes.js';
import { createPublicAssetsRouter } from '../routes/publicAssets.routes.js';
import { createAssetUploadMiddleware, DEFAULT_ASSET_UPLOAD_MAX_BYTES } from '../middleware/assetUpload.js';

function asset(overrides = {}) {
  return {
    id: 'asset-1',
    _id: 'internal-id',
    category: 'general',
    key: 'hero',
    label: 'Hero',
    sourcePath: '/hero.png',
    status: 'active',
    activeVersion: 1,
    active: { secureUrl: 'https://cdn.example.com/hero.png', width: 120, height: 80, format: 'png', bytes: 1024 },
    versionCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    versions: [
      {
        version: 1,
        cloudinaryPublicId: 'fco/general/hero-v1',
        secureUrl: 'https://cdn.example.com/hero.png',
        width: 120,
        height: 80,
        format: 'png',
        bytes: 1024,
        uploadedBy: 'admin-1',
        uploadedAt: '2026-01-01T00:00:00.000Z',
        source: 'admin',
      },
    ],
    ...overrides,
  };
}

function makeServices(overrides = {}) {
  const calls = [];
  return {
    calls,
    async getPublicAssetMap() {
      calls.push({ method: 'getPublicAssetMap' });
      return {
        data: {
          general: {
            hero: {
              url: 'https://cdn.example.com/hero.png',
              width: 120,
              height: 80,
              format: 'png',
              bytes: 1024,
              label: 'Hero',
            },
          },
        },
        updatedAt: '2026-01-02T00:00:00.000Z',
      };
    },
    async listAssets(query) {
      calls.push({ method: 'listAssets', query });
      return { data: [asset()], pagination: { page: 2, limit: 100, total: 1, pages: 1 } };
    },
    async getAssetDetail(input) {
      calls.push({ method: 'getAssetDetail', input });
      return asset();
    },
    async createAssetUpload(input) {
      calls.push({ method: 'createAssetUpload', input: { ...input, buffer: Buffer.isBuffer(input.buffer) ? '<buffer>' : input.buffer } });
      return asset({ id: 'created-1' });
    },
    async replaceAssetUpload(input) {
      calls.push({ method: 'replaceAssetUpload', input: { ...input, buffer: Buffer.isBuffer(input.buffer) ? '<buffer>' : input.buffer } });
      return asset({ id: input.id, activeVersion: 2 });
    },
    async rollbackAssetVersion(input) {
      calls.push({ method: 'rollbackAssetVersion', input });
      return asset({ id: input.id, activeVersion: input.version });
    },
    async archiveAsset(input) {
      calls.push({ method: 'archiveAsset', input });
      return asset({ id: input.id, status: 'archived' });
    },
    ...overrides,
  };
}

async function withServer({ services = makeServices(), user = { id: 'admin-1', role: 'owner', permissions: [] }, uploadOptions } = {}, fn) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    if (user) {
      req.session = { adminUserId: user.id, adminUser: user };
    } else {
      req.session = {};
    }
    next();
  });

  const controller = createAssetsController({ services });
  app.use('/api/assets', createPublicAssetsRouter(controller));
  app.use('/api/admin/assets', createAdminAssetsRouter(controller, createAssetUploadMiddleware(uploadOptions)));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Something went wrong', errors: error.errors });
  });

  const server = createServer(app);
  server.listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(baseUrl, services);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

async function json(response) {
  return response.json();
}

function imageForm({ name = 'hero.png', type = 'image/png', file = new Blob(['png'], { type }), fields = {} } = {}) {
  const form = new FormData();
  form.set('category', 'general');
  form.set('key', 'hero');
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  if (file) {
    form.set('file', file, name);
  }
  return form;
}

test('asset upload middleware defaults to a 10 MiB file size limit', () => {
  assert.equal(DEFAULT_ASSET_UPLOAD_MAX_BYTES, 10 * 1024 * 1024);
  const upload = createAssetUploadMiddleware();
  assert.equal(upload.limits.fileSize, DEFAULT_ASSET_UPLOAD_MAX_BYTES);
});

test('public asset map returns exact shape, cache header, quoted etag, and no internal metadata', async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/assets/public-map`);
    const body = await json(response);
    const serialized = JSON.stringify(body);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=60, must-revalidate');
    assert.match(response.headers.get('etag'), /^"[a-f0-9]{64}"$/);
    assert.deepEqual(Object.keys(body), ['success', 'data', 'updatedAt']);
    assert.equal(body.success, true);
    assert.equal(body.updatedAt, '2026-01-02T00:00:00.000Z');
    assert.equal(body.data.general.hero.url, 'https://cdn.example.com/hero.png');
    for (const forbidden of ['sourcePath', '_id', 'internal-id', 'cloudinaryPublicId', 'uploadedBy', 'admin-1', 'CLOUDINARY_API_SECRET']) {
      assert.equal(serialized.includes(forbidden), false, forbidden);
    }

    const cached = await fetch(`${baseUrl}/api/assets/public-map`, { headers: { 'If-None-Match': response.headers.get('etag') } });
    assert.equal(cached.status, 304);
    assert.equal(await cached.text(), '');
    assert.equal(cached.headers.get('etag'), response.headers.get('etag'));
  });
});

test('admin routes require the expected permissions', async () => {
  const user = { id: 'admin-1', role: 'manager', permissions: [] };
  await withServer({ user }, async (baseUrl) => {
    const expectations = [
      ['GET', '/api/admin/assets', 'assets.view'],
      ['GET', '/api/admin/assets/asset-1', 'assets.view'],
      ['POST', '/api/admin/assets/upload', 'assets.create'],
      ['POST', '/api/admin/assets/asset-1/upload', 'assets.edit'],
      ['PATCH', '/api/admin/assets/asset-1/active-version', 'assets.edit'],
      ['PATCH', '/api/admin/assets/asset-1/archive', 'assets.archive'],
    ];

    for (const [method, path, permission] of expectations) {
      const init = { method };
      if (method === 'POST') init.body = imageForm();
      if (method === 'PATCH' && path.endsWith('/active-version')) {
        init.headers = { 'content-type': 'application/json' };
        init.body = JSON.stringify({ version: 1 });
      }
      const response = await fetch(`${baseUrl}${path}`, init);
      const body = await json(response);
      assert.equal(response.status, 403, `${method} ${path}`);
      assert.equal(body.message, `Permission required: ${permission}`);
    }
  });
});

test('admin list parses page and limit query params through the controller', async () => {
  const services = makeServices();
  await withServer({ services, user: { id: 'admin-1', role: 'manager', permissions: ['assets.view'] } }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/admin/assets?page=2&limit=500&status=active&category=general&search=hero`);
    const body = await json(response);

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(services.calls[0], {
      method: 'listAssets',
      query: { page: 2, limit: 100, status: 'active', category: 'general', search: 'hero' },
    });
  });
});

test('admin upload uses multipart field file and passes file buffer metadata to create service', async () => {
  const services = makeServices();
  await withServer({ services, user: { id: 'admin-1', role: 'manager', permissions: ['assets.create'] } }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/admin/assets/upload`, { method: 'POST', body: imageForm({ fields: { label: 'Hero' } }) });
    const body = await json(response);

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(services.calls[0].method, 'createAssetUpload');
    assert.equal(services.calls[0].input.buffer, '<buffer>');
    assert.equal(services.calls[0].input.originalName, 'hero.png');
    assert.equal(services.calls[0].input.mimeType, 'image/png');
    assert.equal(services.calls[0].input.uploadedBy, 'admin-1');
    assert.equal(services.calls[0].input.source, 'admin');
  });
});

test('admin replace route is not shadowed by /:id and calls replace service', async () => {
  const services = makeServices();
  await withServer({ services, user: { id: 'admin-1', role: 'manager', permissions: ['assets.edit'] } }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/admin/assets/asset-1/upload`, { method: 'POST', body: imageForm() });
    const body = await json(response);

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(services.calls[0].method, 'replaceAssetUpload');
    assert.equal(services.calls[0].input.id, 'asset-1');
  });
});

test('admin upload rejects missing file, remote URLs, non-images, and mismatched extensions', async () => {
  await withServer({ user: { id: 'admin-1', role: 'manager', permissions: ['assets.create'] } }, async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/admin/assets/upload`, { method: 'POST', body: imageForm({ file: null }) });
    assert.equal(missing.status, 400);
    assert.equal((await json(missing)).message, 'Asset upload file is required');

    const remote = await fetch(`${baseUrl}/api/admin/assets/upload`, { method: 'POST', body: imageForm({ fields: { url: 'https://example.com/x.png' } }) });
    assert.equal(remote.status, 400);
    assert.equal((await json(remote)).message, 'Remote URL uploads are not supported');

    const nonImage = await fetch(`${baseUrl}/api/admin/assets/upload`, { method: 'POST', body: imageForm({ name: 'hero.txt', type: 'text/plain' }) });
    assert.equal(nonImage.status, 400);
    assert.equal((await json(nonImage)).message, 'Unsupported asset file type');

    const mismatch = await fetch(`${baseUrl}/api/admin/assets/upload`, { method: 'POST', body: imageForm({ name: 'hero.jpg', type: 'image/png' }) });
    assert.equal(mismatch.status, 400);
    assert.equal((await json(mismatch)).message, 'Asset file extension does not match MIME type');
  });
});

test('admin upload reports missing category or key as validation errors', async () => {
  await withServer({ user: { id: 'admin-1', role: 'manager', permissions: ['assets.create'] } }, async (baseUrl) => {
    const form = new FormData();
    form.set('category', 'general');
    form.set('file', new Blob(['png'], { type: 'image/png' }), 'hero.png');

    const response = await fetch(`${baseUrl}/api/admin/assets/upload`, { method: 'POST', body: form });
    const body = await json(response);

    assert.equal(response.status, 400);
    assert.equal(body.message, 'Validation failed');
    assert.deepEqual(body.errors, { key: 'Asset key is required' });
  });
});

test('admin routes translate service 404, 409, and multer size errors consistently', async () => {
  const notFound = new Error('Asset not found');
  notFound.statusCode = 404;
  const conflict = new Error('Asset already exists');
  conflict.statusCode = 409;
  conflict.orphanPublicId = 'fco/general/hero-v2';
  const services = makeServices({
    async getAssetDetail() { throw notFound; },
    async createAssetUpload() { throw conflict; },
  });

  await withServer({ services, user: { id: 'admin-1', role: 'owner' }, uploadOptions: { maxBytes: 1 } }, async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/admin/assets/missing`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await json(missing), { success: false, message: 'Asset not found' });

    const upload = await fetch(`${baseUrl}/api/admin/assets/upload`, { method: 'POST', body: imageForm({ file: new Blob(['x'], { type: 'image/png' }) }) });
    assert.equal(upload.status, 413);
    assert.equal((await json(upload)).message, 'Asset upload exceeds the maximum allowed size');
  });

  await withServer({ services, user: { id: 'admin-1', role: 'owner' } }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/admin/assets/upload`, { method: 'POST', body: imageForm() });
    const body = await json(response);
    assert.equal(response.status, 409);
    assert.equal(body.message, 'Asset already exists');
    assert.deepEqual(body.errors, { orphanPublicId: 'fco/general/hero-v2' });
  });
});
