import multer from 'multer';

export const DEFAULT_ASSET_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = Object.freeze({
  'image/png': new Set(['.png']),
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/webp': new Set(['.webp']),
  'image/gif': new Set(['.gif']),
  'image/svg+xml': new Set(['.svg']),
  'image/avif': new Set(['.avif']),
});

function parseUploadLimit(env = process.env) {
  const value = Number.parseInt(env.ASSET_UPLOAD_MAX_BYTES, 10);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_ASSET_UPLOAD_MAX_BYTES;
}

function extensionFor(filename = '') {
  const match = String(filename).toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? '';
}

export function validateAssetUploadFile(file) {
  const extensions = IMAGE_TYPES[file?.mimetype];
  if (!extensions) {
    const error = new Error('Unsupported asset file type');
    error.statusCode = 400;
    throw error;
  }

  if (!extensions.has(extensionFor(file.originalname))) {
    const error = new Error('Asset file extension does not match MIME type');
    error.statusCode = 400;
    throw error;
  }
}

export function createAssetUploadMiddleware({ maxBytes = parseUploadLimit() } = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter(req, file, callback) {
      try {
        validateAssetUploadFile(file);
        callback(null, true);
      } catch (error) {
        callback(error);
      }
    },
  });
}
