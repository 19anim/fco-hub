import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

const OFFICIAL_ROOT = 'fconline.garena.vn';

const CATEGORY_PAGES = [
  'https://fconline.garena.vn/tin-tuc/su-kien/',
  'https://fconline.garena.vn/tin-tuc/su-kien/?paged=2',
  'https://fconline.garena.vn/tin-tuc/su-kien/?paged=3',
];

const EXCLUDED_HOSTS = [
  'dc.fconline.garena.vn',
  'hocvien.fconline.garena.vn',
  'hotrofconline.garena.vn',
  'ranking.fconline.garena.vn',
  'fconline.member.garena.vn',
  'resetpass.fconline.garena.vn',
  'coupon.fconline.garena.vn',
  'khoatk.fconline.garena.vn',
  'giaidau.fconline.garena.vn',
  'epl.fconline.garena.vn',
];

const UTILITY_PATH_PARTS = [
  '/tin-tuc/',
  '/category/',
  '/author/',
  '/wp-content/',
  '/wp-includes/',
  '/wp-json/',
  '/xmlrpc.php',
];

const REJECT_TITLE_PATTERNS = [
  'luat thi dau',
  'quy dinh',
  'quyen so huu',
  'cong bo',
  'hop tac',
  'chao don',
  'creator championship',
  'vietnam pro league',
  'fvpl',
  'giai dau',
  'tong ket',
  'thong bao',
  'huong dan tai',
];

const ACCEPT_PATTERNS = [
  'su kien',
  'nap',
  'tich luy',
  'bi lac',
  'thanh sieu pham',
  'vong quay',
  'so tay',
  'hang tuan',
  'khuyen mai',
  'monthly',
  'tcss',
  'sinh nhat',
  "the world's game",
  "world's game",
  'world\u2019s game',
  'worlds game',
  'qua',
];

class FCOCrawler {
  constructor() {
    this.httpClient = axios.create({
      timeout: 24000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  }

  async getEvents(today = new Date()) {
    const articleUrls = new Set();

    // Crawl category pages to get article URLs
    for (const page of CATEGORY_PAGES) {
      try {
        const html = await this.getString(page);
        const urls = this.getArticleUrlsFromCategory(html);
        urls.forEach((url) => articleUrls.add(url));
      } catch (error) {
        console.error(`Error crawling ${page}:`, error.message);
      }
    }

    const results = [];

    // Process each article
    for (const articleUrl of articleUrls) {
      try {
        const html = await this.getString(articleUrl);
        if (!html) continue;

        const title = this.getPageTitle(html, articleUrl);
        const foundUrls = this.getOfficialUrlsFromText(html);
        const launchUrl = this.getPreferredLaunchUrl(articleUrl, foundUrls);
        const readable = this.toReadableText(html);

        if (!this.isLikelyUsableEvent(title, readable, launchUrl)) {
          continue;
        }

        const articleRanges = this.getDateRanges(this.getArticleTimingText(readable));
        const launchRanges = await this.getLaunchDateRanges(articleUrl, launchUrl);
        const ranges = this.isSubdomain(launchUrl) && launchRanges.length > 0
          ? launchRanges
          : articleRanges;

        if (ranges.length === 0) {
          results.push({
            title,
            sourceUrl: articleUrl,
            launchUrl,
            dateLabel: 'No public end date found',
            status: 'Unknown',
            sortDate: new Date('2099-12-31'),
            isSubdomain: this.isSubdomain(launchUrl),
            isNewsPage: this.isNewsPage(launchUrl),
          });
          continue;
        }

        for (const range of ranges) {
          const todayDate = new Date(today).setHours(0, 0, 0, 0);
          const startDate = new Date(range.start).setHours(0, 0, 0, 0);
          const endDate = new Date(range.end).setHours(0, 0, 0, 0);

          if (todayDate < startDate || todayDate > endDate) {
            continue;
          }

          results.push({
            title,
            sourceUrl: articleUrl,
            launchUrl,
            dateLabel: range.label,
            status: 'Active',
            startDate: range.start,
            endDate: range.end,
            sortDate: range.end,
            isSubdomain: this.isSubdomain(launchUrl),
            isNewsPage: this.isNewsPage(launchUrl),
          });
        }
      } catch (error) {
        console.error(`Error processing ${articleUrl}:`, error.message);
      }
    }

    return this.deduplicate(results);
  }

  async getString(url) {
    if (!this.isOfficialUrl(url)) return '';
    try {
      const response = await this.httpClient.get(url);
      return response.data;
    } catch (error) {
      return '';
    }
  }

  getArticleUrlsFromCategory(html) {
    const urls = [];
    if (!html) return urls;

    const $ = cheerio.load(html);
    $('a.st-news__post').each((_, element) => {
      const href = $(element).attr('href');
      if (href && href.startsWith('https://fconline.garena.vn/') && !this.isExcludedUrl(href)) {
        urls.push(href.trim());
      }
    });

    return urls;
  }

  getOfficialUrlsFromText(text) {
    const urls = new Set();
    if (!text) return Array.from(urls);

    const pattern = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)*fconline\.garena\.vn(?:\/[^\s"<>)]*)?/gi;
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      const normalized = this.normalizeFcoUrl(match[0]);
      if (normalized) {
        urls.add(normalized);
      }
    }

    return Array.from(urls);
  }

  normalizeFcoUrl(value) {
    if (!value) return null;
    
    let clean = value.trim().replace(/["',)\]}\.;]+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }

    try {
      const url = new URL(clean);
      return this.isOfficialUrl(url.href) ? url.href : null;
    } catch {
      return null;
    }
  }

  getPreferredLaunchUrl(sourceUrl, foundUrls) {
    const preferred = foundUrls
      .filter((url) => this.isOfficialUrl(url))
      .filter((url) => !this.isExcludedUrl(url))
      .filter((url) => {
        try {
          const urlObj = new URL(url);
          return urlObj.hostname !== OFFICIAL_ROOT;
        } catch {
          return false;
        }
      })
      .sort((a, b) => a.length - b.length)[0];

    return preferred || sourceUrl;
  }

  isLikelyUsableEvent(title, readableText, launchUrl) {
    const titleOnly = this.removeDiacritics(title).toLowerCase();

    if (REJECT_TITLE_PATTERNS.some((pattern) => titleOnly.includes(pattern))) {
      return false;
    }

    if (ACCEPT_PATTERNS.some((pattern) => titleOnly.includes(pattern))) {
      return true;
    }

    try {
      const urlObj = new URL(launchUrl);
      return (
        urlObj.hostname.endsWith(`.${OFFICIAL_ROOT}`) &&
        urlObj.hostname !== OFFICIAL_ROOT &&
        !EXCLUDED_HOSTS.includes(urlObj.hostname.toLowerCase())
      );
    } catch {
      return false;
    }
  }

  async getLaunchDateRanges(articleUrl, launchUrl) {
    if (!launchUrl || launchUrl === articleUrl || !this.isOfficialUrl(launchUrl)) {
      return [];
    }

    const html = await this.getString(launchUrl);
    if (!html) return [];

    const staticRanges = this.getDateRanges(this.getGuidanceModalText(html));
    if (staticRanges.length > 0) return this.getPreferredEventRanges(staticRanges);

    const renderedText = await this.getRenderedGuidanceText(launchUrl);
    return this.getPreferredEventRanges(this.getDateRanges(renderedText));
  }

  getPreferredEventRanges(ranges) {
    if (ranges.length <= 1) return ranges;

    return [ranges.toSorted((a, b) => {
      const durationA = new Date(a.end).getTime() - new Date(a.start).getTime();
      const durationB = new Date(b.end).getTime() - new Date(b.start).getTime();
      return durationB - durationA;
    })[0]];
  }

  async getRenderedGuidanceText(url) {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(1000);

      const guidance = page.getByText(/Hướng dẫn|Thể lệ/i).first();
      if (await guidance.count()) {
        await guidance.click({ timeout: 3000 }).catch(() => null);
        await page.waitForTimeout(500);
      }

      return await page.locator('body').innerText({ timeout: 5000 });
    } catch {
      return '';
    } finally {
      await browser?.close().catch(() => null);
    }
  }

  getDateRanges(text) {
    if (!text) return [];

    const normalized = this.removeArticleTrailingContent(this.removeDiacritics(text));
    const patterns = [
      /Bat dau\s*:?.{0,60}?(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?).{0,120}?Ket thuc\s*:?.{0,60}?(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)/gi,
      /(?:Tu ngay|Tu|Dien ra tu|Thoi gian(?: dien ra)?\s*:?)\s*(?:\d{1,2}h\d{0,2}\s*ngay\s*)?(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)\s*(?:den|toi|[-\u2013\u2014])\s*(?:\d{1,2}h\d{0,2}\s*ngay\s*)?(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)/gi,
      /(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)\s*[-\u2013\u2014]\s*(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)/g,
    ];

    const seen = new Set();
    const ranges = [];

    for (const pattern of patterns) {
      const matches = normalized.matchAll(pattern);
      for (const match of matches) {
        const fallbackYear = this.getYearFromDateText(`${match[1]} ${match[2]}`);
        const start = this.convertFcoDate(match[1], fallbackYear);
        const end = this.convertFcoDate(match[2], fallbackYear);

        if (!start || !end) continue;

        let startDate = new Date(start);
        let endDate = new Date(end);

        if (endDate < startDate) {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const key = `${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
        if (!seen.has(key)) {
          seen.add(key);
          ranges.push({
            start: startDate,
            end: endDate,
            label: `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
          });
        }
      }
    }

    return ranges;
  }

  convertFcoDate(raw, fallbackYear) {
    const match = raw.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    let year = fallbackYear;

    if (match[3]) {
      year = parseInt(match[3], 10);
      if (year < 100) {
        year += 2000;
      }
    }

    try {
      return new Date(year, month - 1, day);
    } catch {
      return null;
    }
  }

  getYearFromDateText(text) {
    const match = text.match(/\d{1,2}[./-]\d{1,2}[./-](\d{4})/);
    return match ? parseInt(match[1], 10) : new Date().getFullYear();
  }

  removeArticleTrailingContent(text) {
    return text.split(/\bCAC TIN LIEN QUAN\b/i)[0];
  }

  getArticleTimingText(text) {
    const body = this.removeArticleTrailingContent(text);
    const normalized = this.removeDiacritics(body).toLowerCase();
    const headingMarkers = ['thoi gian dien ra', 'thoi gian', 'bat dau', 'ket thuc'];
    const fallbackMarkers = ['tu ngay', 'dien ra tu'];
    const headingIndexes = headingMarkers
      .map((marker) => normalized.indexOf(marker))
      .filter((index) => index !== -1);
    const fallbackIndexes = fallbackMarkers
      .map((marker) => normalized.indexOf(marker))
      .filter((index) => index !== -1);
    const indexes = headingIndexes.length ? headingIndexes : fallbackIndexes;
    const index = indexes.length ? Math.min(...indexes) : -1;
    return index === -1 ? body : body.slice(index);
  }

  getGuidanceModalText(html) {
    const $ = cheerio.load(html);
    const candidates = [];

    $('[class*="modal"], [class*="popup"], [role="dialog"]').each((_, element) => {
      const text = this.toReadableText($.html(element));
      const normalized = this.removeDiacritics(text);
      if (/\b(Huong dan|The le|Thoi gian|Dien ra tu)\b/i.test(normalized)) {
        candidates.push(text);
      }
    });

    return candidates.join(' ');
  }

  toReadableText(text) {
    if (!text) return '';

    let decoded = this.decodeHtml(text);
    decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
    decoded = decoded.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    decoded = decoded.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    decoded = decoded.replace(/<[^>]+>/g, ' ');
    decoded = decoded.replace(/\s+/g, ' ');
    return decoded;
  }

  decodeHtml(text) {
    const named = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&#39;': "'",
      '&nbsp;': ' ',
    };
    return text.replace(/&#x([0-9a-fA-F]+);|&#(\d+);|&[a-z]+;/gi, (match, hex, dec) => {
      if (hex) return String.fromCharCode(parseInt(hex, 16));
      if (dec) return String.fromCharCode(parseInt(dec, 10));
      return named[match] || match;
    });
  }

  getPageTitle(html, fallbackUrl) {
    const $ = cheerio.load(html);
    
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) return this.decodeHtml(ogTitle).trim();

    const title = $('title').text();
    if (title) return this.decodeHtml(title).trim();

    try {
      return new URL(fallbackUrl).hostname;
    } catch {
      return fallbackUrl;
    }
  }

  removeDiacritics(text) {
    if (!text) return '';
    
    // Handle Vietnamese đ/Đ
    text = text.replace(/đ/g, 'd').replace(/Đ/g, 'D');
    
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .normalize('NFC');
  }

  isOfficialUrl(url) {
    try {
      const urlObj = new URL(url);
      return (
        (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') &&
        (urlObj.hostname === OFFICIAL_ROOT || urlObj.hostname.endsWith(`.${OFFICIAL_ROOT}`))
      );
    } catch {
      return false;
    }
  }

  isExcludedUrl(url) {
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();

      if (EXCLUDED_HOSTS.includes(host)) return true;
      if (/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|map|mp4|mp3|pdf)$/i.test(path)) return true;
      if (UTILITY_PATH_PARTS.some((part) => path.includes(part))) return true;

      return false;
    } catch {
      return true;
    }
  }

  isSubdomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.endsWith(`.${OFFICIAL_ROOT}`) && urlObj.hostname !== OFFICIAL_ROOT;
    } catch {
      return false;
    }
  }

  isNewsPage(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === OFFICIAL_ROOT;
    } catch {
      return false;
    }
  }

  deduplicate(items) {
    const dedup = new Map();

    for (const item of items) {
      const key = item.launchUrl.replace(/\/$/, '');
      const existing = dedup.get(key);

      if (!existing) {
        dedup.set(key, item);
        continue;
      }

      if (item.status === 'Active' && existing.status !== 'Active') {
        dedup.set(key, item);
      } else if (item.status === existing.status && new Date(item.sortDate) < new Date(existing.sortDate)) {
        dedup.set(key, item);
      }
    }

    return Array.from(dedup.values()).sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'Active' ? -1 : 1;
      }
      return new Date(a.sortDate) - new Date(b.sortDate);
    });
  }

  formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }
}

export default FCOCrawler;