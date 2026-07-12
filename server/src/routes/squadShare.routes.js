import express from 'express';
import { createSquadShare, getSquadShareById, listSquadShares } from '../controllers/squadShare.controller.js';

const router = express.Router();

// POST /api/squad-shares - Create a new squad share
router.post('/', createSquadShare);

// GET /api/squad-shares - List squad shares
router.get('/', listSquadShares);

// GET /api/squad-shares/:id - Get a squad share by id
router.get('/:id', getSquadShareById);

export default router;
