import express from 'express';
import { getSummary } from '../controllers/adminAnalytics.controller.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth);
router.get('/summary', requirePermission('analytics.view'), getSummary);

export default router;
