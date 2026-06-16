import { chromium } from 'playwright';
import FifaAddictSeason from '../models/FifaAddictSeason.js';

const BASE_URL = 'https://vn.fifaaddict.com';

// Lấy toàn bộ season checkbox (name="season") trên trang fo4db, chỉ giữ những
// season mà attribute `server` (trên <label server="..."> bao quanh checkbox)
// có chứa "vn".
async function extractVnSeasonsFromPage(page) {
  return page.evaluate(() => {
    const seasons = Array.from(document.querySelectorAll('input[name="season"]'));
    const result = [];
    for (const input of seasons) {
      const label = input.closest('label');
      const serverAttr = label ? label.getAttribute('server') || '' : '';
      const servers = serverAttr.split(/\s+/).filter(Boolean);
      if (!servers.includes('vn')) continue;

      const img = label ? label.querySelector('img.badgedss') : null;
      const style = img ? window.getComputedStyle(img) : null;
      const backgroundImage = style ? style.backgroundImage : '';
      const spriteMatch = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);

      result.push({
        value: input.getAttribute('value') || '',
        title: label ? label.getAttribute('title') || '' : '',
        servers,
        className: img ? img.className : '',
        spriteUrl: spriteMatch ? spriteMatch[1] : '',
        backgroundPosition: style ? style.backgroundPosition : '',
        backgroundSize: style ? style.backgroundSize : '',
        width: img ? Math.round(img.getBoundingClientRect().width) : null,
        height: img ? Math.round(img.getBoundingClientRect().height) : null,
      });
    }
    return result;
  });
}

let scrapeSeasonsRunning = false;

export function isScrapeSeasonsRunning() {
  return scrapeSeasonsRunning;
}

// Quét trang fo4db để lấy toàn bộ season có phục vụ server "vn" và upsert
// vào bảng FifaAddictSeason. Season nào không còn xuất hiện trong lần quét
// mới nhất sẽ bị đánh dấu isActive=false (không xóa, giữ lịch sử).
export async function scrapeFifaAddictSeasons({ headless = true } = {}) {
  if (scrapeSeasonsRunning) {
    throw new Error('Season scraper đang chạy.');
  }
  scrapeSeasonsRunning = true;

  let browser = null;
  try {
    browser = await chromium.launch({
      headless,
      args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--no-sandbox'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'vi-VN',
    });

    const page = await context.newPage();
    await page.goto(`${BASE_URL}/fo4db`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    // Season checkboxes are visually hidden (custom checkbox UI), so wait for
    // them to be attached to the DOM rather than visible.
    await page.waitForSelector('input[name="season"]', { state: 'attached', timeout: 30000 });

    const seasons = await extractVnSeasonsFromPage(page);
    if (!seasons.length) {
      throw new Error('Không tìm thấy season nào trên trang (có thể cấu trúc DOM đã đổi).');
    }

    // Lấy URL ảnh sprite từ CSS của trang
    const spriteUrl = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      for (const sheet of styles) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('.badgedss') && rule.style.backgroundImage) {
              const match = rule.style.backgroundImage.match(/url\(["']?([^"']+)["']?\)/);
              if (match) return match[1];
            }
          }
        } catch (e) {
          // Bỏ qua lỗi CORS khi truy cập stylesheet từ domain khác
        }
      }
      return 'https://vn.fifaaddict.com/ffaddv2/img/f14371f.png'; // Fallback nếu không tìm thấy
    });

    const seenValues = new Set();
    for (const season of seasons) {
      if (!season.value || seenValues.has(season.value)) continue;
      seenValues.add(season.value);
      await FifaAddictSeason.findOneAndUpdate(
        { value: season.value },
        {
          $set: {
            title: season.title,
            servers: season.servers,
            className: season.className,
            spriteUrl: season.spriteUrl || spriteUrl,
            backgroundPosition: season.backgroundPosition,
            backgroundSize: season.backgroundSize,
            width: season.width,
            height: season.height,
            isActive: true
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const deactivateResult = await FifaAddictSeason.updateMany(
      { value: { $nin: [...seenValues] }, isActive: true },
      { $set: { isActive: false } }
    );

    return {
      scraped: seenValues.size,
      deactivated: deactivateResult.modifiedCount,
      spriteUrl,
      seasons,
    };
  } finally {
    if (browser) await browser.close();
    scrapeSeasonsRunning = false;
  }
}
