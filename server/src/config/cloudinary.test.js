import test from 'node:test';
import assert from 'node:assert/strict';
import { configureCloudinary, getCloudinaryConfig } from './cloudinary.js';

const fixtureUrl = 'cloudinary://fixture-key:fixture-secret@fixture-cloud';

test('CLOUDINARY_URL is accepted and secure delivery is forced', () => {
  assert.deepEqual(getCloudinaryConfig({ CLOUDINARY_URL: fixtureUrl }), {
    cloudinary_url: fixtureUrl,
    secure: true,
  });
});

test('split Cloudinary variables are accepted and secure delivery is forced', () => {
  assert.deepEqual(
    getCloudinaryConfig({
      CLOUDINARY_CLOUD_NAME: 'fixture-cloud',
      CLOUDINARY_API_KEY: 'fixture-key',
      CLOUDINARY_API_SECRET: 'fixture-secret',
    }),
    {
      cloud_name: 'fixture-cloud',
      api_key: 'fixture-key',
      api_secret: 'fixture-secret',
      secure: true,
    }
  );
});

test('missing and partial config throw a safe error', () => {
  for (const env of [
    {},
    { CLOUDINARY_CLOUD_NAME: 'fixture-cloud' },
    { CLOUDINARY_API_KEY: 'fixture-key', CLOUDINARY_API_SECRET: 'fixture-secret' },
  ]) {
    assert.throws(() => getCloudinaryConfig(env), /^Error: Cloudinary configuration is missing$/);
  }
});

test('configureCloudinary passes parsed config to injected SDK', () => {
  let capturedConfig;
  const sdk = {
    config(config) {
      capturedConfig = config;
    },
  };

  assert.equal(configureCloudinary(sdk, { CLOUDINARY_URL: fixtureUrl }), sdk);
  assert.deepEqual(capturedConfig, { cloudinary_url: fixtureUrl, secure: true });
});

test('configuration errors do not serialize secret fixture values', () => {
  try {
    getCloudinaryConfig({ CLOUDINARY_API_SECRET: 'fixture-secret' });
    assert.fail('expected missing config error');
  } catch (error) {
    assert.equal(error.message, 'Cloudinary configuration is missing');
    assert.equal(String(error).includes('fixture-secret'), false);
  }
});
