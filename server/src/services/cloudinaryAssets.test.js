import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { buildAssetPublicId, uploadAssetBuffer, uploadAssetPath } from './cloudinaryAssets.js';

test('buildAssetPublicId returns versioned filename', () => {
  assert.equal(buildAssetPublicId('upgradeMascot', 'happy', 2), 'happy-v2');
});

test('buildAssetPublicId validates identity and positive integer version', () => {
  assert.throws(() => buildAssetPublicId('upgradeMascot', 'neutral', 1), /Invalid asset category or key/);
  assert.throws(() => buildAssetPublicId('upgradeMascot', 'happy', 0), /positive integer/);
});

test('path upload passes safe Cloudinary options and normalizes result', async () => {
  let capturedPath;
  let capturedOptions;
  const sdk = {
    uploader: {
      async upload(filePath, options) {
        capturedPath = filePath;
        capturedOptions = options;
        return {
          public_id: `${options.folder}/${options.public_id}`,
          secure_url: 'https://res.cloudinary.com/demo/image/upload/Fco-hub/upgrade-mascots/happy-v2.png',
          width: 32,
          height: 48,
          format: 'png',
          bytes: 456,
          api_key: 'fixture-key',
        };
      },
    },
  };

  const result = await uploadAssetPath(sdk, '/tmp/happy.png', {
    category: 'upgradeMascot',
    key: 'happy',
    version: 2,
  });

  assert.equal(capturedPath, '/tmp/happy.png');
  assert.deepEqual(capturedOptions, {
    public_id: 'happy-v2',
    folder: 'Fco-hub/upgrade-mascots',
    overwrite: false,
    resource_type: 'image',
  });
  assert.deepEqual(result, {
    publicId: 'Fco-hub/upgrade-mascots/happy-v2',
    secureUrl: 'https://res.cloudinary.com/demo/image/upload/Fco-hub/upgrade-mascots/happy-v2.png',
    width: 32,
    height: 48,
    format: 'png',
    bytes: 456,
  });
});

test('stream upload ends with provided buffer and normalizes result', async () => {
  const chunks = [];
  let capturedOptions;
  const sdk = {
    uploader: {
      upload_stream(options, callback) {
        capturedOptions = options;
        return new Writable({
          write(chunk, _encoding, done) {
            chunks.push(chunk);
            done();
          },
          final(done) {
            callback(null, {
              public_id: `${options.folder}/${options.public_id}`,
              secure_url: 'https://res.cloudinary.com/demo/image/upload/Fco-hub/general/hero-v1.webp',
              width: 100,
              height: 60,
              format: 'webp',
              bytes: 99,
              signature: 'fixture-signature',
            });
            done();
          },
        });
      },
    },
  };

  const result = await uploadAssetBuffer(sdk, Buffer.from('image-bytes'), {
    category: 'general',
    key: 'hero',
    version: 1,
  });

  assert.deepEqual(capturedOptions, {
    public_id: 'hero-v1',
    folder: 'Fco-hub/general',
    overwrite: false,
    resource_type: 'image',
  });
  assert.equal(Buffer.concat(chunks).toString(), 'image-bytes');
  assert.deepEqual(result, {
    publicId: 'Fco-hub/general/hero-v1',
    secureUrl: 'https://res.cloudinary.com/demo/image/upload/Fco-hub/general/hero-v1.webp',
    width: 100,
    height: 60,
    format: 'webp',
    bytes: 99,
  });
});

test('upload results without HTTPS secure_url are rejected', async () => {
  const sdk = {
    uploader: {
      async upload() {
        return {
          public_id: 'fco/general/hero-v1',
          secure_url: 'http://example.test/image.png',
        };
      },
    },
  };

  await assert.rejects(
    () => uploadAssetPath(sdk, '/tmp/hero.png', { category: 'general', key: 'hero', version: 1 }),
    /secure URL/
  );
});

test('SDK errors reject without adding serialized environment values', async () => {
  const sdk = {
    uploader: {
      upload_stream(_options, callback) {
        return new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
          final(done) {
            callback(new Error('Cloudinary upload failed'));
            done();
          },
        });
      },
    },
  };

  await assert.rejects(
    () => uploadAssetBuffer(sdk, Buffer.from('x'), { category: 'general', key: 'hero', version: 1 }),
    (error) => error.message === 'Cloudinary upload failed' && !String(error).includes('fixture-secret')
  );
});
