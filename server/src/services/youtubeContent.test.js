import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeYoutubeContent } from './youtubeContent.js';

test('youtubeUrl replaces stale youtubeVideoId and default thumbnail', () => {
  const content = normalizeYoutubeContent({
    youtubeUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    youtubeVideoId: 'dQw4w9WgXcQ',
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  });

  assert.equal(content.youtubeVideoId, 'abcdefghijk');
  assert.equal(content.thumbnailUrl, 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg');
});

test('youtubeUrl preserves custom thumbnail', () => {
  const content = normalizeYoutubeContent({
    youtubeUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    youtubeVideoId: 'dQw4w9WgXcQ',
    thumbnailUrl: 'https://cdn.example.test/custom.jpg',
  });

  assert.equal(content.youtubeVideoId, 'abcdefghijk');
  assert.equal(content.thumbnailUrl, 'https://cdn.example.test/custom.jpg');
});
