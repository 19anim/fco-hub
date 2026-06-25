import express from 'express';
import {
  getPlayers,
  getPlayerById,
  getPlayerDetail,
  getPlayerBySlug,
  getPlayerMeta,
  getClubsByLeague,
  syncPlayersFromNexon,
  createPlayer,
  updatePlayer,
  cleanupData,
} from '../controllers/player.controller.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const dataOps = [adminAuth, requirePermission('dataOps.run')];

const router = express.Router();

router.get('/',           getPlayers);
router.get('/meta',       getPlayerMeta);
router.get('/clubs',      getClubsByLeague);
router.post('/sync-nexon', ...dataOps, syncPlayersFromNexon);
router.get('/slug/:slug', getPlayerBySlug);
router.get('/:id/detail', getPlayerDetail);
router.get('/:id([0-9a-fA-F]{24})', getPlayerById);
router.post('/',          createPlayer);
router.put('/:id',        updatePlayer);
router.post('/cleanup',   ...dataOps, cleanupData);

export default router;
