import { chromium } from 'playwright';
import PlayerEnrichment from '../models/PlayerEnrichment.js';
import SyncRun from '../models/SyncRun.js';

const BASE_URL = 'https://vn.fifaaddict.com';
const DEFAULT_DELAY_MS = 2000; // Longer delay to mimic human
const IMAGE_BASE_URL = 'https://s1.fifaaddict.com/fo4/players';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function toNumber(value) {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function absoluteUrl(value) {
  if (!value) return '';
  if (String(value).startsWith('//')) return `https:${value}`;
  if (String(value).startsWith('http')) return value;
  return `${BASE_URL}${value}`;
}

function parsePrice(value = '') {
  const text = normalizeText(value);
  if (!text || text === '0') return { price: null, priceText: text || '' };
  const numeric = toNumber(text);
  if (numeric === null) return { price: null, priceText: text };
  if (text.includes('T')) return { price: numeric * 1000000000000, priceText: text };
  if (text.includes('B')) return { price: numeric * 1000000000, priceText: text };
  if (text.includes('M')) return { price: numeric * 1000000, priceText: text };
  return { price: numeric, priceText: text };
}

// Parse rows from page content
function parsePlayersFromPage(content) {
  const players = [];

  // Handle different response structures
  let rows = null;

  if (content && content.db && Array.isArray(content.db)) {
    rows = content.db;
  } else if (content && content.data && content.data.db && Array.isArray(content.data.db)) {
    rows = content.data.db;
  } else if (content && Array.isArray(content.data)) {
    rows = content.data;
  } else if (content && content.players && Array.isArray(content.players)) {
    rows = content.players;
  }

  if (!rows || !Array.isArray(rows)) {
    console.log('[Playwright] Cannot find player array in response. Content keys:', content ? Object.keys(content).join(', ') : 'null');
    return players;
  }

  console.log('[Playwright] Parsing', rows.length, 'rows...');

  for (const row of rows) {
    if (!row || !row.uid) continue;

    const sourceUid = String(row.uid);
    const positions = [];

    for (const index of [1, 2, 3, 4]) {
      const position = normalizeText(String(row[`pos${index}`] || ''));
      if (!position) continue;
      const overall = toNumber(row[`pos${index}val`]);
      positions.push({ position, overall });
    }

    const { price, priceText } = parsePrice(String(row.pricekr ?? ''));
    const salary = toNumber(row.attrA);
    const overall = toNumber(row.attrB);
    const stamina = toNumber(row.attrC);
    const stats = stamina !== null ? [{ key: 'stamina', labelVi: 'Thể lực', value: stamina }] : [];

    players.push({
      sourceUid,
      sourceUrl: `${BASE_URL}/fo4db/pid${sourceUid}`,
      displayNameVi: normalizeText(row.name || ''),
      displayNameEn: normalizeText(row.name || ''),
      seasonCode: String(row.year ?? ''),
      seasonName: normalizeText(row.year_short || ''),
      seasonImg: absoluteUrl(row.year_icon || row.seasonImg || ''),
      imageUrl: `${IMAGE_BASE_URL}/${sourceUid}.png`,
      positions,
      bestPosition: normalizeText(row.pos || '') || positions[0]?.position || '',
      ovrByPosition: Object.fromEntries(
        positions.filter((item) => item.position).map((item) => [item.position, item.overall])
      ),
      overall,
      salary,
      fp: salary,
      price,
      priceText,
      stats,
      keyStats: stats,
      skillMoves: toNumber(row.skill_level),
      club: normalizeText(row.team_name || ''),
      raw: row,
      syncedAt: new Date(),
      source: 'fifaaddict-vn',
    });
  }

  return players;
}

let playwrightRunning = false;

export function isPlaywrightRunning() {
  return playwrightRunning;
}

export async function scrapeFifaAddictWithPlaywright({
  delayMs = DEFAULT_DELAY_MS,
  maxPages = 1000,
  headless = true
} = {}) {
  if (playwrightRunning) {
    throw new Error('Playwright scraper already running.');
  }

  playwrightRunning = true;

  const run = await SyncRun.create({
    source: 'fifaaddict-vn',
    status: 'running',
    message: 'Playwright Scraper: Starting browser automation...',
  });

  let browser = null;

  (async () => {
    try {
      console.log('[Playwright] Launching Chromium browser...');

      browser = await chromium.launch({
        headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
        ],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'vi-VN',
      });

      const page = await context.newPage();

      // Intercept ALL requests to find the right endpoint
      const apiResponses = [];
      const allRequests = [];

      page.on('request', request => {
        const url = request.url();
        const type = request.resourceType();
        if (type === 'xhr' || type === 'fetch') {
          allRequests.push({ method: request.method(), url });
          console.log('[Playwright] XHR/Fetch:', request.method(), url.substring(0, 120));
        }
      });

      page.on('response', async (response) => {
        const url = response.url();
        const type = response.request().resourceType();

        if ((type === 'xhr' || type === 'fetch') && response.status() === 200) {
          console.log('[Playwright] Response:', response.status(), url.substring(0, 120));

          // Try to parse as JSON
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              const json = await response.json();

              // Check if it looks like player data
              if (json.db || json.players || json.data || json.success) {
                apiResponses.push(json);
                console.log('[Playwright] ✓✓✓ Found player data! Keys:', Object.keys(json).join(', '));
                if (json.db) console.log('[Playwright] DB rows:', json.db.length);
                if (json.data) {
                  if (Array.isArray(json.data)) {
                    console.log('[Playwright] Data array length:', json.data.length);
                  } else if (json.data.db) {
                    console.log('[Playwright] Data.db rows:', json.data.db.length);
                  } else {
                    console.log('[Playwright] Data keys:', Object.keys(json.data).join(', '));
                  }
                }
              }
            }
          } catch (err) {
            // Not JSON
          }
        }
      });

      console.log('[Playwright] Navigating to fo4db...');
      await page.goto(`${BASE_URL}/fo4db`, { waitUntil: 'domcontentloaded', timeout: 90000 });

      console.log('[Playwright] Page loaded, waiting for data...');
      await sleep(5000); // Wait for initial data load

      const seenKeys = new Set();
      let totalUpserted = 0;
      let totalFailed = 0;
      let consecutiveDuplicatePages = 0;

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        await SyncRun.findByIdAndUpdate(run._id, {
          $set: {
            message: `Playwright: Trang ${pageNum}... (${totalUpserted} players inserted)`,
            processed: totalUpserted,
            requested: 15000,
          },
        }).catch(() => {});

        console.log(`[Playwright] Processing page ${pageNum}...`);

        // Clear previous responses
        apiResponses.length = 0;

        if (pageNum > 1) {
          // Navigate to next page (simulate clicking or entering page number)
          // FIFAAddict uses infinite scroll or pagination buttons
          try {
            // Try to find and click "next" button or input page number
            const nextButton = await page.locator('button:has-text("Next"), a:has-text("Next"), .pagination .next').first();
            if (await nextButton.isVisible({ timeout: 2000 })) {
              await nextButton.click();
              console.log('[Playwright] Clicked next button');
            } else {
              // Try scrolling to trigger infinite scroll
              await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
              console.log('[Playwright] Scrolled to bottom');
            }

            await sleep(delayMs); // Wait for API call
            await page.waitForLoadState('networkidle', { timeout: 30000 });
          } catch (err) {
            console.log('[Playwright] Navigation failed:', err.message);
            break;
          }
        }

        // Wait for API response
        await sleep(2000);

        if (apiResponses.length === 0) {
          console.log('[Playwright] No API response captured, page might be last');
          break;
        }

        // Process last response
        const lastResponse = apiResponses[apiResponses.length - 1];
        const players = parsePlayersFromPage(lastResponse);

        if (players.length === 0) {
          console.log('[Playwright] No players found on this page');
          break;
        }

        let newInPage = 0;
        let skippedInPage = 0;

        for (const player of players) {
          const key = `${player.sourceUid}-${player.seasonCode}`;

          if (seenKeys.has(key)) {
            skippedInPage++;
            continue;
          }

          const exists = await PlayerEnrichment.findOne({
            source: 'fifaaddict-vn',
            sourceUid: player.sourceUid,
            seasonCode: player.seasonCode,
          }).lean();

          if (!exists) {
            seenKeys.add(key);
            newInPage++;
            try {
              await PlayerEnrichment.findOneAndUpdate(
                { source: 'fifaaddict-vn', sourceUid: player.sourceUid, seasonCode: player.seasonCode },
                { $set: player },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
              totalUpserted++;
            } catch (err) {
              console.error(`[Playwright] Failed to upsert ${player.sourceUid}:`, err.message);
              totalFailed++;
            }
          } else {
            seenKeys.add(key);
            skippedInPage++;
          }
        }

        console.log(`[Playwright] Page ${pageNum}: ${newInPage} new, ${skippedInPage} skipped, total: ${totalUpserted}`);

        if (newInPage === 0) {
          consecutiveDuplicatePages++;
          if (consecutiveDuplicatePages >= 10) {
            console.log('[Playwright] 10 consecutive duplicate pages, ending');
            break;
          }
        } else {
          consecutiveDuplicatePages = 0;
        }

        // Human-like delay
        await sleep(delayMs);
      }

      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: 'success',
          finishedAt: new Date(),
          processed: totalUpserted,
          updated: totalUpserted,
          failed: totalFailed,
          message: `✓ Playwright scraper hoàn tất: ${totalUpserted} players mới.`,
        },
      });

      console.log('[Playwright] Scraping completed successfully');
    } catch (error) {
      console.error('[Playwright] Error:', error);
      await SyncRun.findByIdAndUpdate(run._id, {
        $set: {
          status: 'failed',
          finishedAt: new Date(),
          message: `Lỗi Playwright: ${error.message}`,
        },
      }).catch(() => {});
    } finally {
      if (browser) {
        await browser.close();
        console.log('[Playwright] Browser closed');
      }
      playwrightRunning = false;
    }
  })().catch(() => {
    playwrightRunning = false;
  });

  return { runId: run._id, message: 'Playwright scraper đang chạy nền với browser automation.' };
}
