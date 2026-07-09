import { ASSET_CATEGORIES, normalizeAssetIdentity } from './assetService.js';

function normalizeUploadResult(result) {
  if (!result?.secure_url || !String(result.secure_url).startsWith('https://')) {
    throw new Error('Cloudinary upload did not return a secure URL');
  }

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

export function buildAssetPublicId(category, key, version) {
  const identity = normalizeAssetIdentity(category, key);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('Asset version must be a positive integer');
  }

  return `${identity.key}-v${version}`;
}

function buildUploadOptions(category, key, version) {
  const identity = normalizeAssetIdentity(category, key);
  return {
    public_id: buildAssetPublicId(identity.category, identity.key, version),
    folder: `Fco-hub/${ASSET_CATEGORIES[identity.category].folder}`,
    overwrite: false,
    resource_type: 'image',
  };
}

export async function uploadAssetPath(sdk, filePath, { category, key, version }) {
  const result = await sdk.uploader.upload(filePath, buildUploadOptions(category, key, version));
  return normalizeUploadResult(result);
}

export async function uploadAssetBuffer(sdk, buffer, { category, key, version }) {
  const result = await new Promise((resolve, reject) => {
    const stream = sdk.uploader.upload_stream(
      buildUploadOptions(category, key, version),
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return normalizeUploadResult(result);
}
