export function isSafeRedirectUrl(value) {
  try {
    const url = new URL(String(value));
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function sanitizeAffiliateLinks(links = []) {
  return links.map(({ label, imageUrl }) => ({ label, imageUrl }));
}
