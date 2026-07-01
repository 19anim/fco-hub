import { expect, it } from 'vitest';
import { applyYoutubeUrl } from './youtubeContent.js';

it('applyYoutubeUrl updates video id and default thumbnail when thumbnail is empty', () => {
  const content = applyYoutubeUrl(
    { youtubeVideoId: 'dQw4w9WgXcQ', thumbnailUrl: '' },
    'https://www.youtube.com/watch?v=Yhdynz53Spw'
  );

  expect(content.youtubeUrl).toBe('https://www.youtube.com/watch?v=Yhdynz53Spw');
  expect(content.youtubeVideoId).toBe('Yhdynz53Spw');
  expect(content.thumbnailUrl).toBe('https://img.youtube.com/vi/Yhdynz53Spw/hqdefault.jpg');
});

it('applyYoutubeUrl preserves custom thumbnail', () => {
  const content = applyYoutubeUrl(
    { youtubeVideoId: 'dQw4w9WgXcQ', thumbnailUrl: 'https://cdn.example.test/custom.jpg' },
    'https://www.youtube.com/watch?v=Yhdynz53Spw'
  );

  expect(content.youtubeVideoId).toBe('Yhdynz53Spw');
  expect(content.thumbnailUrl).toBe('https://cdn.example.test/custom.jpg');
});
