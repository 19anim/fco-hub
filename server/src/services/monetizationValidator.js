export function validateMonetizationItem(data) {
  const errors = [];
  const { type, title, placementIds, content = {} } = data;

  if (!type) errors.push('type is required');
  if (!title) errors.push('title is required');
  if (!placementIds || placementIds.length === 0) errors.push('At least one placementId is required');

  switch (type) {
    case 'youtube_video':
      if (!content.youtubeUrl && !content.youtubeVideoId) {
        errors.push('content.youtubeUrl or content.youtubeVideoId is required');
      }
      break;
    case 'affiliate_link':
      if (!content.targetUrl) errors.push('content.targetUrl is required');
      if (!content.ctaLabel) errors.push('content.ctaLabel is required');
      if (!data.platform) errors.push('platform is required');
      break;
    case 'sponsor_banner':
      if (!content.imageUrl) errors.push('content.imageUrl is required');
      if (!content.targetUrl) errors.push('content.targetUrl is required');
      break;
    case 'ad_slot':
      if (!content.providerConfig?.provider) errors.push('content.providerConfig.provider is required');
      if (!content.providerConfig?.slotId) errors.push('content.providerConfig.slotId is required');
      break;
    case 'custom_cta':
      if (!content.ctaLabel) errors.push('content.ctaLabel required');
      if (!content.targetUrl) errors.push('content.targetUrl is required');
      break;
  }

  if (type === 'youtube_video' && content.youtubeUrl && !content.youtubeVideoId) {
    const match = content.youtubeUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (!match) errors.push('content.youtubeUrl does not contain a valid YouTube video ID');
  }

  return { valid: errors.length === 0, errors };
}
