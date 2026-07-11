const API_ORIGIN = 'https://fco-hub.onrender.com';
const SITE_ORIGIN = 'https://fcodaphim.netlify.app';
const DEFAULT_IMAGE = 'https://res.cloudinary.com/dk6nhyxaq/image/upload/v1783688033/Fco-hub/site-assets/favicon-v3.png';
const FETCH_TIMEOUT_MS = 2000;

const BOT_UA_PATTERN = /facebookexternalhit|Facebot|Twitterbot|Discordbot|TelegramBot|WhatsApp|Slackbot|LinkedInBot|Zalo|Googlebot|bingbot/i;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function setMetaTag(html, selectorAttrs, content) {
  const pattern = new RegExp(`(<meta[^>]*${selectorAttrs}[^>]*content=")[^"]*(")`, 'i');
  return html.replace(pattern, `$1${escapeHtml(content)}$2`);
}

export default async function handler(request, context) {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  console.log(`[player-preview] hit path=${url.pathname} ua=${userAgent}`);

  if (!BOT_UA_PATTERN.test(userAgent)) {
    return context.next();
  }

  const match = url.pathname.match(/^\/players\/([^/]+)\/?$/);
  if (!match) {
    return context.next();
  }
  const id = decodeURIComponent(match[1]);

  const response = await context.next();
  const html = await response.text();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const apiRes = await fetch(`${API_ORIGIN}/api/players/${encodeURIComponent(id)}/detail`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!apiRes.ok) return new Response(html, response);

    const body = await apiRes.json();
    const player = body?.data?.player;
    if (!player?.name) return new Response(html, response);

    const title = `${player.name}${player.club ? ` (${player.club})` : ''} · FCO Đá Phím`;
    const description = `Chỉ số, giá thị trường và thông tin nâng cấp của ${player.name} trong FCOnline.`;
    const image = player.imageUrl || DEFAULT_IMAGE;
    const pageUrl = `${SITE_ORIGIN}/players/${encodeURIComponent(id)}`;

    let rewritten = html;
    rewritten = rewritten.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    rewritten = setMetaTag(rewritten, 'name="description"', description);
    rewritten = setMetaTag(rewritten, 'property="og:title"', title);
    rewritten = setMetaTag(rewritten, 'property="og:description"', description);
    rewritten = setMetaTag(rewritten, 'property="og:image"', image);
    rewritten = setMetaTag(rewritten, 'property="og:url"', pageUrl);
    rewritten = setMetaTag(rewritten, 'name="twitter:title"', title);
    rewritten = setMetaTag(rewritten, 'name="twitter:description"', description);
    rewritten = setMetaTag(rewritten, 'name="twitter:image"', image);

    return new Response(rewritten, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    });
  } catch {
    return new Response(html, response);
  }
}

export const config = {
  path: '/players/*',
};
