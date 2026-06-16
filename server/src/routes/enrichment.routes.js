import express from 'express';
import {
  getEnrichmentStatus,
  resyncFifaAddictEnrichment,
  syncAllFifaAddictEnrichment,
  syncFifaAddictEnrichment,
  bulkScrapeDetailEnrichment,
  discoverFifaAddict,
  discoverFifaAddictV2,
  discoverFifaAddictPids,
  discoverFifaAddictHybrid,
  scrapeFifaAddictPlaywright,
  syncFullFifaAddict,
  scrapeSeasons,
  listSeasons,
  discoverFifaAddictBySeason,
} from '../controllers/enrichment.controller.js';
import { requireAdminSync } from '../middleware/adminSync.js';

const router = express.Router();

router.get('/status', getEnrichmentStatus);
router.post('/fifaaddict/discover', requireAdminSync, discoverFifaAddict);
router.post('/fifaaddict/discover-v2', requireAdminSync, discoverFifaAddictV2);
router.post('/fifaaddict/discover-pids', requireAdminSync, discoverFifaAddictPids);
router.post('/fifaaddict/discover-hybrid', requireAdminSync, discoverFifaAddictHybrid);
router.post('/fifaaddict/discover-by-season', requireAdminSync, discoverFifaAddictBySeason);
router.post('/fifaaddict/scrape-playwright', requireAdminSync, scrapeFifaAddictPlaywright);
router.post('/fifaaddict/scrape-seasons', requireAdminSync, scrapeSeasons);
router.get('/fifaaddict/seasons', listSeasons);
router.post('/fifaaddict/sync-full', requireAdminSync, syncFullFifaAddict);
router.post('/fifaaddict/sync', requireAdminSync, syncFifaAddictEnrichment);
router.post('/fifaaddict/sync-all', requireAdminSync, syncAllFifaAddictEnrichment);
router.post('/fifaaddict/resync', requireAdminSync, resyncFifaAddictEnrichment);
router.post('/fifaaddict/bulk-detail', requireAdminSync, bulkScrapeDetailEnrichment);

export default router;
