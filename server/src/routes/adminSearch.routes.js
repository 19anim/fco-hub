import express from 'express';
import Player from '../models/Player.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth);

router.get('/players', async (req, res) => {
  try {
    const { q, season, position, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { searchName: { $regex: q, $options: 'i' } },
      ];
    }
    if (season)   filter.seasonId = Number(season);
    if (position) filter.position = position;

    const players = await Player.find(filter)
      .select('spid name position overall seasonName seasonId imageUrl')
      .sort({ overall: -1 })
      .limit(Math.min(Number(limit), 50));

    res.json({ success: true, data: { players } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed', error: err.message });
  }
});

export default router;
