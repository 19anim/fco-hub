function extractYoutubeVideoId(url = '') {
  return String(url).match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || '';
}

function defaultThumbnailUrl(videoId) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
}

function isYoutubeDefaultThumbnail(url = '') {
  return /^https:\/\/img\.youtube\.com\/vi\/[A-Za-z0-9_-]{11}\/hqdefault\.jpg$/.test(String(url));
}

export function applyYoutubeUrl(content = {}, youtubeUrl) {
  const youtubeVideoId = extractYoutubeVideoId(youtubeUrl);
  const shouldRefreshThumbnail = youtubeVideoId && (!content.thumbnailUrl || isYoutubeDefaultThumbnail(content.thumbnailUrl));

  return {
    ...content,
    youtubeUrl,
    youtubeVideoId,
    thumbnailUrl: shouldRefreshThumbnail ? defaultThumbnailUrl(youtubeVideoId) : content.thumbnailUrl,
  };
}
