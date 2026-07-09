import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { uploadAssetBuffer } from '../services/cloudinaryAssets.js';
import {
  archiveAsset,
  createAssetUpload,
  getAssetDetail,
  getPublicAssetMap,
  listAssets,
  replaceAssetUpload,
  rollbackAssetVersion,
} from '../services/assetService.js';

const DEFAULT_SERVICES = Object.freeze({
  getPublicAssetMap,
  listAssets,
  getAssetDetail,
  createAssetUpload,
  replaceAssetUpload,
  rollbackAssetVersion,
  archiveAsset,
});

function canonicalJson(value) {
  return JSON.stringify(value);
}

function buildEtag(payload) {
  return `"${crypto.createHash('sha256').update(canonicalJson(payload)).digest('hex')}"`;
}

function normalizeError(error) {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: 'Asset upload exceeds the maximum allowed size' };
  }

  return {
    status: error.statusCode || error.status || 500,
    message: error.statusCode || error.status ? error.message : 'Asset request failed',
    errors: error.errors ?? (error.orphanPublicId ? { orphanPublicId: error.orphanPublicId } : undefined),
  };
}

function sendError(res, error) {
  const normalized = normalizeError(error);
  const body = { success: false, message: normalized.message };
  if (normalized.errors) {
    body.errors = normalized.errors;
  }
  res.status(normalized.status).json(body);
}

function parseListQuery(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 24));
  return {
    page,
    limit,
    status: query.status,
    category: query.category,
    search: query.search,
  };
}

function validateUploadBody(body, file) {
  const errors = {};
  if (!body.category) errors.category = 'Asset category is required';
  if (!body.key) errors.key = 'Asset key is required';
  if (!file) {
    const error = new Error('Asset upload file is required');
    error.statusCode = 400;
    throw error;
  }
  if (body.url || body.remoteUrl || body.remoteURL) {
    const error = new Error('Remote URL uploads are not supported');
    error.statusCode = 400;
    throw error;
  }
  if (Object.keys(errors).length) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }
}

function buildUploader() {
  return ({ buffer, category, key, version }) => uploadAssetBuffer(cloudinary, buffer, { category, key, version });
}

function uploadInput(req) {
  validateUploadBody(req.body, req.file);
  return {
    category: req.body.category,
    key: req.body.key,
    label: req.body.label,
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    uploadedBy: req.session?.adminUserId ?? null,
    source: 'admin',
    uploader: buildUploader(),
  };
}

export function createAssetsController({ services = DEFAULT_SERVICES } = {}) {
  return {
    async publicMap(req, res) {
      try {
        const { data, updatedAt } = await services.getPublicAssetMap();
        const payload = { data, updatedAt };
        const etag = buildEtag(payload);

        res.set('Cache-Control', 'public, max-age=60, must-revalidate');
        res.set('ETag', etag);
        if (req.headers['if-none-match'] === etag) {
          res.status(304).end();
          return;
        }

        res.json({ success: true, data, updatedAt });
      } catch (error) {
        sendError(res, error);
      }
    },

    async list(req, res) {
      try {
        const data = await services.listAssets(parseListQuery(req.query));
        res.json({ success: true, data });
      } catch (error) {
        sendError(res, error);
      }
    },

    async detail(req, res) {
      try {
        const data = await services.getAssetDetail({ id: req.params.id });
        res.json({ success: true, data });
      } catch (error) {
        sendError(res, error);
      }
    },

    async createUpload(req, res) {
      try {
        const input = uploadInput(req);
        const data = await services.createAssetUpload(input, { uploader: input.uploader });
        res.status(201).json({ success: true, data });
      } catch (error) {
        sendError(res, error);
      }
    },

    async replaceUpload(req, res) {
      try {
        const input = { ...uploadInput(req), id: req.params.id };
        const data = await services.replaceAssetUpload(input, { uploader: input.uploader });
        res.json({ success: true, data });
      } catch (error) {
        sendError(res, error);
      }
    },

    async rollback(req, res) {
      try {
        const version = Number(req.body?.version);
        if (!Number.isInteger(version) || version < 1) {
          const error = new Error('Asset version is required');
          error.statusCode = 400;
          throw error;
        }
        const data = await services.rollbackAssetVersion({ id: req.params.id, version });
        res.json({ success: true, data });
      } catch (error) {
        sendError(res, error);
      }
    },

    async archive(req, res) {
      try {
        const data = await services.archiveAsset({ id: req.params.id });
        res.json({ success: true, data });
      } catch (error) {
        sendError(res, error);
      }
    },

    error(error, req, res, next) {
      if (res.headersSent) {
        next(error);
        return;
      }
      sendError(res, error);
    },
  };
}

export const assetsController = createAssetsController();
