import test from 'node:test';
import assert from 'node:assert/strict';
import { applyYoutubeUrl } from './youtubeContent.js';

test('applyYoutubeUrl updates video id and default thumbnail when thumbnail is empty', () => {
  const content = applyYoutubeUrl(
    { youtubeVideoId: 'dQw4w9WgXcQ', thumbnailUrl: '' },
    'https://www.youtube.com/watch?v=Yhdynz53Spw'
  );

  assert.equal(content.youtubeUrl, 'https://www.youtube.com/watch?v=Yhdynz53Spw');
  assert.equal(content.youtubeVideoId, 'Yhdynz53Spw');
  assert.equal(content.thumbnailUrl, 'https://img.youtube.com/vi/Yhdynz53Spw/hqdefault.jpg');
});

test('applyYoutubeUrl preserves custom thumbnail', () => {
  const content = applyYoutubeUrl(
    { youtubeVideoId: 'dQw4w9WgXcQ', thumbnailUrl: 'https://cdn.example.test/custom.jpg' },
    'https://www.youtube.com/watch?v=Yhdynz53Spw'
  );

  assert.equal(content.youtubeVideoId, 'Yhdynz53Spw');
  assert.equal(content.thumbnailUrl, 'https://cdn.example.test/custom.jpg');
});
