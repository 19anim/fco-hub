import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const FIFAADDICT_SQUADMAKER_URL = 'https://fifaaddict.com/vn/fco-squadmaker/';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../../../client/public/fco/card-themes');

export function extractThemeId(className = '') {
  const match = String(className).match(/(?:^|\s)card-theme-([a-z0-9_-]+)(?:\s|$)/i);
  return match ? match[1].toLowerCase() : '';
}

export function toLocalCardThemePath(themeId) {
  return `/fco/card-themes/card-theme-${themeId}.png`;
}

export function normalizeFifaAddictSeasonOption(raw = {}) {
  const value = String(raw.value || raw.seasonCode || raw.season || '').trim();
  const title = String(raw.title || raw.label || '').trim();
  const className = String(raw.className || '').trim();
  const seasonCode = String(value || title.replace(/^\[\s*([^\]]+)\].*$/, '$1')).trim().toUpperCase();

  return {
    seasonCode,
    value,
    title,
    className,
  };
}

async function downloadFile(url, outputFile) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, buffer);
}

export async function discoverFifaAddictSquadmakerSeasons(page) {
  await page.goto(FIFAADDICT_SQUADMAKER_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForSelector('.search-season-option', { state: 'attached', timeout: 30000 });

  const options = await page.evaluate(() => Array.from(document.querySelectorAll('.search-season-option')).map((node) => {
    const label = node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '';
    const badgeClassName = node.querySelector('.search-season-option__badge')?.className || '';
    const className = `${node.className || ''} ${badgeClassName}`.trim();
    const classSeason = String(className).match(/(?:^|\s)y([a-z0-9_-]+)(?:\s|$)/i)?.[1] || '';
    return {
      value: node.getAttribute('data-value') || node.getAttribute('value') || classSeason,
      title: label,
      className,
    };
  }));

  const seen = new Set();
  return options
    .map(normalizeFifaAddictSeasonOption)
    .filter((season) => season.seasonCode && !seen.has(season.seasonCode) && seen.add(season.seasonCode))
    .sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));
}

async function clearSquad(page) {
  await page.evaluate(async () => {
    const clearButton = document.querySelector('#clearSquadBtn, .clearSquadBtn, [data-action="clear-squad"]');
    if (!clearButton) return;

    clearButton.click();
    await new Promise((resolve) => setTimeout(resolve, 300));

    const confirmButton = document.querySelector('#sharedSquadDialogConfirm, .sharedSquadDialogConfirm');
    if (confirmButton) {
      confirmButton.click();
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  });
}

async function selectRepresentativePlayer(page, season) {
  await page.goto(FIFAADDICT_SQUADMAKER_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await clearSquad(page);

  const targetCardId = await page.locator('.player-card:not(.has-player)').first().getAttribute('id');
  if (!targetCardId) return { ok: false, reason: 'empty squad slot not found' };
  await page.locator(`#${targetCardId} .card-icon`).click();
  await page.waitForSelector('.search-season-option', { timeout: 15000 });

  const selected = await page.evaluate(async ({ className, value, title, targetCardId }) => {
    const normalize = (text) => String(text || '').trim().toLowerCase();
    const wantedClass = String(className || '').match(/(?:^|\s)y([a-z0-9_-]+)(?:\s|$)/i)?.[1];
    const wantedValue = normalize(value);
    const titleText = normalize(title).replace(/^\[\s*[^\]]+\]\s*/, '');

    const reset = document.querySelector('.searchReset, #searchReset, [data-search-reset]');
    if (reset) {
      reset.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const findOption = () => {
      const options = Array.from(document.querySelectorAll('.search-season-option'));
      return options.find((node) => wantedClass && node.querySelector(`.y${CSS.escape(wantedClass)}`))
        || options.find((node) => normalize(node.getAttribute('aria-label') || node.getAttribute('title')) === titleText)
        || options.find((node) => normalize(node.getAttribute('aria-label') || node.getAttribute('title')).includes(wantedValue));
    };
    const option = findOption();

    if (!option) return { ok: false, reason: 'season filter not found' };

    option.click();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const activeOption = findOption();
    if (activeOption?.getAttribute('aria-pressed') !== 'true') return { ok: false, reason: 'season filter did not activate' };

    const submit = Array.from(document.querySelectorAll('.search-submit')).find((node) => node.offsetWidth || node.offsetHeight || node.getClientRects().length)
      || document.querySelector('.search-submit');
    if (!submit) return { ok: false, reason: 'search submit not found' };
    submit.click();
    await new Promise((resolve) => setTimeout(resolve, 1800));

    const rows = Array.from(document.querySelectorAll('.search-results .sr-row'));
    const representativeRow = rows[0];
    if (!representativeRow) return { ok: false, reason: 'no representative player' };

    const addButton = representativeRow.querySelector('.sr-row__add');
    if (!addButton) return { ok: false, reason: 'no representative player' };
    addButton.click();
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { ok: true, targetCardId };
  }, { className: season.className, value: season.value, title: season.title, targetCardId });

  return selected;
}

async function readRenderedCard(page, targetCardId) {
  const selector = targetCardId ? `#${targetCardId}.has-player` : '.player-card.has-player.fc-card';
  await page.waitForSelector(selector, { timeout: 15000 });
  return page.evaluate((cardSelector) => {
    const card = document.querySelector(cardSelector);
    const bg = card?.querySelector('img.card-bg-img.fc-bg');
    return {
      className: card?.className || '',
      backgroundImage: bg?.getAttribute('src') || '',
    };
  }, selector);
}

export async function collectFifaAddictCardBackgrounds({ headless = true, seasons, outputDir = DEFAULT_OUTPUT_DIR, limit, onProgress } = {}) {
  const records = [];
  const downloadedThemeIds = new Set();
  let browser = null;
  let fifaAddictSeasons = [];

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
    fifaAddictSeasons = seasons || await discoverFifaAddictSquadmakerSeasons(page);
    const crawlSeasons = Number.isFinite(limit) && limit > 0 ? fifaAddictSeasons.slice(0, limit) : fifaAddictSeasons;

    for (const [index, season] of crawlSeasons.entries()) {
      const seasonCode = String(season.value || season.seasonCode || '').trim().toUpperCase();
      if (!seasonCode) continue;

      const progressBase = {
        index: index + 1,
        total: crawlSeasons.length,
        seasonCode,
        title: season.title || '',
      };
      onProgress?.({ ...progressBase, status: 'start' });

      try {
        const selected = await selectRepresentativePlayer(page, season);
        if (!selected.ok) {
          records.push({ seasonCode, title: season.title || '', reason: selected.reason });
          onProgress?.({ ...progressBase, status: 'unresolved', reason: selected.reason });
          continue;
        }

        const rendered = await readRenderedCard(page, selected.targetCardId);
        const themeId = extractThemeId(rendered.className);
        if (!themeId) {
          const reason = 'missing rendered theme class';
          records.push({ seasonCode, title: season.title || '', className: rendered.className, reason });
          onProgress?.({ ...progressBase, status: 'unresolved', reason });
          continue;
        }
        if (!rendered.backgroundImage) {
          const reason = 'missing card background image';
          records.push({ seasonCode, title: season.title || '', themeId, className: rendered.className, reason });
          onProgress?.({ ...progressBase, status: 'unresolved', themeId, reason });
          continue;
        }

        const localPath = toLocalCardThemePath(themeId);
        const downloaded = !downloadedThemeIds.has(themeId);
        if (downloaded) {
          const outputFile = path.join(outputDir, `card-theme-${themeId}.png`);
          await downloadFile(new URL(rendered.backgroundImage, FIFAADDICT_SQUADMAKER_URL).href, outputFile);
          downloadedThemeIds.add(themeId);
        }

        records.push({
          seasonCode,
          title: season.title || '',
          themeId,
          className: `card-theme-${themeId}`,
          backgroundImage: rendered.backgroundImage,
          localPath,
          downloaded: true,
        });
        onProgress?.({ ...progressBase, status: downloaded ? 'downloaded' : 'mapped', themeId, localPath });
      } catch (error) {
        records.push({ seasonCode, title: season.title || '', reason: error.message });
        onProgress?.({ ...progressBase, status: 'error', reason: error.message });
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  return { total: fifaAddictSeasons.length, fifaAddictSeasons, records };
}
