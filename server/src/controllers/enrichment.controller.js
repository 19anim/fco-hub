import {
  getFifaAddictStatus,
  isBulkSyncRunning,
  isBulkDetailRunning,
  isClubCareerBackfillRunning,
  isUicBackfillRunning,
  isDiscoverRunning,
  discoverAllPlayers,
  isDiscoverV2Running,
  discoverAllPlayersV2,
  isDiscoverBySeasonRunning,
  discoverAllPlayersBySeasonTable,
  isPidDiscoveryRunning,
  discoverFifaAddictByPidGraph,
  isSyncFullRunning,
  syncFullPipeline,
  bulkScrapeDetails,
  backfillClubCareer,
  backfillFifaAddictUic,
  resyncFifaAddictRecord,
  syncFifaAddict,
  syncFifaAddictAll,
  isHybridDiscoveryRunning,
  discoverFifaAddictHybridGraph,
} from '../services/fifaAddictSource.js';
import { scrapeFifaAddictWithPlaywright, isPlaywrightRunning } from '../services/fifaAddictPlaywrightScraper.js';
import { scrapeFifaAddictSeasons, isScrapeSeasonsRunning } from '../services/fifaAddictSeasonScraper.js';
import { collectAndRegisterFifaAddictCardBackgrounds, isCardBackgroundCollectionRunning } from '../services/fifaAddictCardBackgroundCollector.js';
import FifaAddictSeason from '../models/FifaAddictSeason.js';

// POST /api/enrichment/fifaaddict/discover
// Page through the FIFAAddict list API to (re)populate the player list.
// Body: { delayMs?: number, maxPages?: number (default 200) }
export const discoverFifaAddict = async (req, res) => {
  try {
    if (isDiscoverRunning()) {
      return res.status(409).json({ success: false, message: 'Discovery đang chạy. Theo dõi /api/enrichment/status.' });
    }
    const result = await discoverAllPlayers({
      delayMs: req.body?.delayMs,
      maxPages: req.body?.maxPages || 200
    });
    res.status(202).json({ success: true, message: 'Discovery started', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting discovery', error: error.message });
  }
};

// POST /api/enrichment/fifaaddict/sync-full
// 1 nút: quét danh sách rồi tự động lấy 34 chỉ số chi tiết (chạy nền tuần tự).
export const syncFullFifaAddict = async (req, res) => {
  try {
    if (isSyncFullRunning() || isDiscoverRunning() || isDiscoverBySeasonRunning() || isBulkDetailRunning()) {
      return res.status(409).json({ success: false, message: 'Một tác vụ đồng bộ đang chạy. Theo dõi /api/enrichment/status.' });
    }
    const result = await syncFullPipeline({ delayMs: req.body?.delayMs, detailDelayMs: req.body?.detailDelayMs });
    res.status(202).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting full sync', error: error.message });
  }
};

export const syncFifaAddictEnrichment = async (req, res) => {
  try {
    const result = await syncFifaAddict({
      limit: req.body?.limit,
      delayMs: req.body?.delayMs,
    });

    res.json({
      success: true,
      message: 'FIFAAddict enrichment synced',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error syncing FIFAAddict enrichment',
      error: error.message,
    });
  }
};

// POST /api/enrichment/fifaaddict/sync-all - Bulk sync every player record.
// Body: { limit?: number (names per run), delayMs?: number, onlyMissing?: boolean }
export const syncAllFifaAddictEnrichment = async (req, res) => {
  try {
    if (isBulkSyncRunning()) {
      return res.status(409).json({
        success: false,
        message: 'A bulk sync is already running. Poll /api/enrichment/status for progress.',
      });
    }

    const result = await syncFifaAddictAll({
      limit: req.body?.limit,
      delayMs: req.body?.delayMs,
      onlyMissing: req.body?.onlyMissing !== false,
    });

    res.status(202).json({
      success: true,
      message: 'FIFAAddict bulk sync started in the background',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting FIFAAddict bulk sync',
      error: error.message,
    });
  }
};

export const getEnrichmentStatus = async (req, res) => {
  try {
    const status = await getFifaAddictStatus();
    res.json({ success: true, data: { ...status, scrapeSeasonsRunning: isScrapeSeasonsRunning(), clubCareerBackfillRunning: isClubCareerBackfillRunning(), uicBackfillRunning: isUicBackfillRunning(), cardBackgroundCollectionRunning: isCardBackgroundCollectionRunning() } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrichment status',
      error: error.message,
    });
  }
};

// POST /api/enrichment/fifaaddict/bulk-detail
// Scrape detailedStats + group stats for all enrichments missing rawDescription
// Body: { batchSize?: number, delayMs?: number, limit?: number }
export const bulkScrapeDetailEnrichment = async (req, res) => {
  try {
    if (isBulkDetailRunning()) {
      return res.status(409).json({
        success: false,
        message: 'Bulk detail scrape already running. Poll /api/enrichment/status for progress.',
      });
    }

    const result = await bulkScrapeDetails({
      batchSize: req.body?.batchSize,
      delayMs: req.body?.delayMs,
      limit: req.body?.limit || 0,
    });

    res.status(202).json({
      success: true,
      message: 'Bulk detail scrape started in background',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting bulk detail scrape',
      error: error.message,
    });
  }
};

export const backfillFifaAddictClubCareer = async (req, res) => {
  try {
    if (isBulkDetailRunning()) {
      return res.status(409).json({
        success: false,
        message: 'Bulk detail scrape đang chạy. Hãy đợi xong rồi backfill club career.',
      });
    }

    const result = await backfillClubCareer({
      batchSize: req.body?.batchSize ?? 50,
      delayMs: req.body?.delayMs ?? 600,
      limit: req.body?.limit ?? 500,
      onlyMissing: req.body?.onlyMissing !== false,
    });

    res.status(202).json({
      success: true,
      message: 'Club career backfill started in background',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting club career backfill',
      error: error.message,
    });
  }
};

export const backfillFifaAddictUicController = async (req, res) => {
  try {
    if (isUicBackfillRunning()) {
      return res.status(409).json({ success: false, message: 'UIC backfill đang chạy. Theo dõi /api/enrichment/status.' });
    }

    const result = await backfillFifaAddictUic({
      limit: Number(req.body?.limit) || 0,
      delayMs: req.body?.delayMs,
    });
    res.status(202).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting uic backfill', error: error.message });
  }
};

export const resyncFifaAddictEnrichment = async (req, res) => {
  try {
    const data = await resyncFifaAddictRecord({
      enrichmentId: req.body?.enrichmentId,
      playerId: req.body?.playerId,
      force: req.body?.force !== false,
    });

    res.json({
      success: true,
      message: 'FIFAAddict record re-synced',
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error re-syncing FIFAAddict record',
      error: error.message,
    });
  }
};

// POST /api/enrichment/fifaaddict/discover-v2
// Discovery V2: Fetch ALL players without season filter
// Body: { delayMs?: number, maxPages?: number (default 500) }
export const discoverFifaAddictV2 = async (req, res) => {
  try {
    if (isDiscoverV2Running() || isDiscoverRunning() || isDiscoverBySeasonRunning()) {
      return res.status(409).json({ success: false, message: 'Discovery đang chạy. Theo dõi /api/enrichment/status.' });
    }
    const result = await discoverAllPlayersV2({
      delayMs: req.body?.delayMs,
      maxPages: req.body?.maxPages || 500
    });
    res.status(202).json({ success: true, message: 'Discovery V2 started (no season filter)', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting discovery V2', error: error.message });
  }
};

// POST /api/enrichment/fifaaddict/scrape-playwright
// Scrape ALL players using Playwright browser automation (bypass anti-bot)
// Body: { delayMs?: number, maxPages?: number (default 1000), headless?: boolean }
export const scrapeFifaAddictPlaywright = async (req, res) => {
  try {
    if (isPlaywrightRunning() || isDiscoverRunning() || isDiscoverV2Running()) {
      return res.status(409).json({ success: false, message: 'A scraper is already running. Theo dõi /api/enrichment/status.' });
    }
    const result = await scrapeFifaAddictWithPlaywright({
      delayMs: req.body?.delayMs || 2000,
      maxPages: req.body?.maxPages || 1000,
      headless: req.body?.headless !== false
    });
    res.status(202).json({ success: true, message: 'Playwright scraper started (browser automation)', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting Playwright scraper', error: error.message });
  }
};

export const discoverFifaAddictPids = async (req, res) => {
  try {
    if (isPidDiscoveryRunning() || isDiscoverRunning() || isDiscoverV2Running()) {
      return res.status(409).json({ success: false, message: 'A discovery job is already running. Poll /api/enrichment/status.' });
    }

    const result = await discoverFifaAddictByPidGraph({
      initialUids: Array.isArray(req.body?.initialUids) ? req.body.initialUids : [],
      includeExistingSeeds: req.body?.includeExistingSeeds !== false,
      includeNexonSearchSeeds: req.body?.includeNexonSearchSeeds === true,
      nexonSearchLimit: req.body?.nexonSearchLimit || 200,
      maxVisits: req.body?.maxVisits || 5000,
      delayMs: req.body?.delayMs || 600,
    });

    res.status(202).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting PID discovery', error: error.message });
  }
};

export const discoverFifaAddictHybrid = async (req, res) => {
  try {
    if (isHybridDiscoveryRunning() || isPidDiscoveryRunning() || isDiscoverRunning() || isDiscoverV2Running()) {
      return res.status(409).json({ success: false, message: 'A discovery job is already running. Poll /api/enrichment/status.' });
    }

    const result = await discoverFifaAddictHybridGraph({
      includeExistingSeeds: req.body?.includeExistingSeeds !== false,
      includeNexonSearchSeeds: req.body?.includeNexonSearchSeeds !== false,
      nexonUniqueLimit: req.body?.nexonUniqueLimit || 1000,
      searchVariantLimit: req.body?.searchVariantLimit || 2,
      maxVisits: req.body?.maxVisits || 10000,
      delayMs: req.body?.delayMs || 600,
    });

    res.status(202).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting hybrid discovery', error: error.message });
  }
};

// POST /api/enrichment/fifaaddict/scrape-seasons
// Quét trang fo4db để lấy toàn bộ season (server chứa "vn") và lưu vào bảng FifaAddictSeason.
export const scrapeSeasons = async (req, res) => {
  try {
    if (isScrapeSeasonsRunning()) {
      return res.status(409).json({ success: false, message: 'Season scraper đang chạy.' });
    }
    const result = await scrapeFifaAddictSeasons({ headless: req.body?.headless !== false });
    res.json({ success: true, message: `Đã lưu ${result.scraped} season.`, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error scraping seasons', error: error.message });
  }
};

// POST /api/enrichment/fifaaddict/scrape-card-themes
// Quét squadmaker FIFAAddict để tải card background PNG cho từng season và
// tự merge kết quả vào client/src/fco/cardThemeRegistry.json.
export const scrapeCardThemes = async (req, res) => {
  try {
    if (isCardBackgroundCollectionRunning()) {
      return res.status(409).json({ success: false, message: 'Card background collector đang chạy.' });
    }
    const result = await collectAndRegisterFifaAddictCardBackgrounds({ headless: req.body?.headless !== false });
    res.json({
      success: true,
      message: `Đã map ${result.mappedSeasons}/${result.totalSeasons} season. Mới: ${result.added.length}, cập nhật: ${result.updated.length}.`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error scraping card themes', error: error.message });
  }
};

// GET /api/enrichment/fifaaddict/seasons
export const listSeasons = async (req, res) => {
  try {
    const onlyActive = req.query?.all !== 'true';
    const query = onlyActive ? { isActive: true } : {};
    const seasons = await FifaAddictSeason.find(query).sort({ value: 1 }).lean();
    res.json({ success: true, count: seasons.length, data: seasons });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching seasons', error: error.message });
  }
};

// POST /api/enrichment/fifaaddict/discover-by-season
// Body: { delayMs?: number, maxRoundsPerSeason?: number (default 50) }
export const discoverFifaAddictBySeason = async (req, res) => {
  try {
    if (
      isDiscoverBySeasonRunning() ||
      isDiscoverRunning() ||
      isDiscoverV2Running() ||
      isHybridDiscoveryRunning() ||
      isPidDiscoveryRunning()
    ) {
      return res.status(409).json({ success: false, message: 'A discovery job is already running. Poll /api/enrichment/status.' });
    }

    const result = await discoverAllPlayersBySeasonTable({
      delayMs: req.body?.delayMs,
      maxRoundsPerSeason: req.body?.maxRoundsPerSeason || 50,
    });

    res.status(202).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error starting discovery by season', error: error.message });
  }
};
