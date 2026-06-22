import express from 'express';
import PlayerEnrichment from '../models/PlayerEnrichment.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { buildAdminPlayerSearchQuery, toLinkedPlayerResult } from '../services/adminPlayerSearch.js';

const router = express.Router();
router.use(adminAuth);

router.get('/players', async (req, res) => {
  try {
    const { q, season, position, limit = 20 } = req.query;
    const filter = buildAdminPlayerSearchQuery({ q, season, position });

    const players = await PlayerEnrichment.find(filter)
      .select('_id sourceUid displayNameVi displayNameEn bestPosition positions overall seasonName seasonCode imageUrl')
      .sort({ overall: -1, syncedAt: -1 })
      .limit(Math.min(Number(limit), 50))
      .lean();

    res.json({ success: true, data: { players: players.map(toLinkedPlayerResult) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed', error: err.message });
  }
});

export default router;
