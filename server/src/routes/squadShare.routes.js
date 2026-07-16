import express from 'express';
import {
  createSquadShare,
  deleteSquadShare,
  getSquadShareById,
  listSquadShares,
  updateSquadShare,
} from '../controllers/squadShare.controller.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

// POST /api/squad-shares - Create a new squad share
router.post('/', adminAuth, requirePermission('squadSharing.create'), createSquadShare);

// GET /api/squad-shares - List squad shares
router.get('/', listSquadShares);

// PUT /api/squad-shares/:id - Update a squad share
router.put('/:id', adminAuth, requirePermission('squadSharing.edit'), updateSquadShare);

// DELETE /api/squad-shares/:id - Delete a squad share
router.delete('/:id', adminAuth, requirePermission('squadSharing.delete'), deleteSquadShare);

// GET /api/squad-shares/:id - Get a squad share by id
router.get('/:id', getSquadShareById);

export default router;
