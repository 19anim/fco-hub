import express from 'express';
import {
  getPlayers,
  getPlayerById,
  getPlayerDetail,
  getPlayerBySlug,
  getPlayerMeta,
  syncPlayersFromNexon,
  createPlayer,
  updatePlayer,
  cleanupData,
} from '../controllers/player.controller.js';
import { requireAdminSync } from '../middleware/adminSync.js';

const router = express.Router();

// GET /api/players - List & search players
router.get('/', getPlayers);

// GET /api/players/meta - Filter metadata
router.get('/meta', getPlayerMeta);

// POST /api/players/sync-nexon - Import Nexon metadata
router.post('/sync-nexon', requireAdminSync, syncPlayersFromNexon);

// GET /api/players/slug/:slug - Get player by slug
router.get('/slug/:slug', getPlayerBySlug);

// GET /api/players/:id/detail - Get player detail
router.get('/:id/detail', getPlayerDetail);

// GET /api/players/:id - Get player by ID
router.get('/:id', getPlayerById);

// POST /api/players - Create player
router.post('/', createPlayer);

// PUT /api/players/:id - Update player
router.put('/:id', updatePlayer);

// POST /api/players/cleanup - Admin cleanup
router.post('/cleanup', requireAdminSync, cleanupData);

export default router;
