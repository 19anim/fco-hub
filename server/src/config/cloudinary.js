const MISSING_CONFIG_MESSAGE = 'Cloudinary configuration is missing';

function hasValue(value) {
  return typeof value === 'string' && value.trim() !== '';
}

export function getCloudinaryConfig(env = process.env) {
  if (hasValue(env.CLOUDINARY_URL)) {
    return { cloudinary_url: env.CLOUDINARY_URL.trim(), secure: true };
  }

  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (hasValue(cloudName) && hasValue(apiKey) && hasValue(apiSecret)) {
    return {
      cloud_name: cloudName.trim(),
      api_key: apiKey.trim(),
      api_secret: apiSecret.trim(),
      secure: true,
    };
  }

  if (hasValue(cloudName) || hasValue(apiKey) || hasValue(apiSecret)) {
    throw new Error(MISSING_CONFIG_MESSAGE);
  }

  throw new Error(MISSING_CONFIG_MESSAGE);
}

export function configureCloudinary(sdk, env = process.env) {
  const config = getCloudinaryConfig(env);
  sdk.config(config);
  return sdk;
}
