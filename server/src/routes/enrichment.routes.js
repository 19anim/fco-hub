import express from 'express';
import {
  getEnrichmentStatus,
  resyncFifaAddictEnrichment,
  syncAllFifaAddictEnrichment,
  syncFifaAddictEnrichment,
  bulkScrapeDetailEnrichment,
  backfillFifaAddictClubCareer,
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
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';
import { createAuditLog } from '../services/auditLog.js';

const dataOps = [adminAuth, requirePermission('dataOps.run')];

async function withAudit(req, res, next) {
  await createAuditLog({
    actorUserId: req.session?.adminUser?.id,
    actorEmail:  req.session?.adminUser?.email,
    action: 'dataOps.run',
    resourceType: 'DataOps',
    after: { endpoint: req.path, body: req.body },
    req,
  });
  next();
}

const router = express.Router();

router.get('/status', getEnrichmentStatus);
router.post('/fifaaddict/discover',         ...dataOps, withAudit, discoverFifaAddict);
router.post('/fifaaddict/discover-v2',      ...dataOps, withAudit, discoverFifaAddictV2);
router.post('/fifaaddict/discover-pids',    ...dataOps, withAudit, discoverFifaAddictPids);
router.post('/fifaaddict/discover-hybrid',  ...dataOps, withAudit, discoverFifaAddictHybrid);
router.post('/fifaaddict/discover-by-season', ...dataOps, withAudit, discoverFifaAddictBySeason);
router.post('/fifaaddict/scrape-playwright', ...dataOps, withAudit, scrapeFifaAddictPlaywright);
router.post('/fifaaddict/scrape-seasons',   ...dataOps, withAudit, scrapeSeasons);
router.get('/fifaaddict/seasons', listSeasons);
router.post('/fifaaddict/sync-full',        ...dataOps, withAudit, syncFullFifaAddict);
router.post('/fifaaddict/sync',             ...dataOps, withAudit, syncFifaAddictEnrichment);
router.post('/fifaaddict/sync-all',         ...dataOps, withAudit, syncAllFifaAddictEnrichment);
router.post('/fifaaddict/resync',           ...dataOps, withAudit, resyncFifaAddictEnrichment);
router.post('/fifaaddict/bulk-detail',      ...dataOps, withAudit, bulkScrapeDetailEnrichment);
router.post('/fifaaddict/backfill-club-career', ...dataOps, withAudit, backfillFifaAddictClubCareer);

export default router;
