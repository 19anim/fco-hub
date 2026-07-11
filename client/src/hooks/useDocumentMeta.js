import { useEffect } from 'react';

const DEFAULT_TITLE = 'FCO Đá Phím';
const DEFAULT_DESCRIPTION = 'FCO Đá Phím - Nơi bạn có thể tìm kiếm tất cả những thứ liên quan đến FCOnline';
const DEFAULT_OG_IMAGE = 'https://res.cloudinary.com/dk6nhyxaq/image/upload/v1783688033/Fco-hub/site-assets/favicon-v3.png';
const SITE_ORIGIN = 'https://fcodaphim.netlify.app';

function setMetaContent(selector, content) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute('content', content);
}

function setLinkHref(selector, href) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute('href', href);
}

export function useDocumentMeta({ title, description, image, path } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${DEFAULT_TITLE}` : DEFAULT_TITLE;
    const fullDescription = description || DEFAULT_DESCRIPTION;
    const fullImage = image || DEFAULT_OG_IMAGE;
    const url = path ? `${SITE_ORIGIN}${path}` : SITE_ORIGIN;

    document.title = fullTitle;
    setMetaContent('meta[name="description"]', fullDescription);
    setLinkHref('link[rel="canonical"]', url);
    setMetaContent('meta[property="og:title"]', fullTitle);
    setMetaContent('meta[property="og:description"]', fullDescription);
    setMetaContent('meta[property="og:url"]', url);
    setMetaContent('meta[property="og:image"]', fullImage);

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaContent('meta[name="description"]', DEFAULT_DESCRIPTION);
      setLinkHref('link[rel="canonical"]', SITE_ORIGIN);
      setMetaContent('meta[property="og:title"]', DEFAULT_TITLE);
      setMetaContent('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      setMetaContent('meta[property="og:url"]', SITE_ORIGIN);
      setMetaContent('meta[property="og:image"]', DEFAULT_OG_IMAGE);
    };
  }, [title, description, image, path]);
}
