import express from 'express';
import { getMetaUsage, lookupNexonOuid, syncMetaUsage } from '../controllers/usage.controller.js';
import { requireAdminSync } from '../middleware/adminSync.js';

const router = express.Router();

router.get('/meta', getMetaUsage);
router.post('/sync', requireAdminSync, syncMetaUsage);
router.get('/ouid', lookupNexonOuid);

export default router;
