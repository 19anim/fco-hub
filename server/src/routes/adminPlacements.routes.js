import express from 'express';
import MonetizationPlacement from '../models/MonetizationPlacement.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth);

router.get('/', requirePermission('placements.view'), async (req, res) => {
  try {
    const placements = await MonetizationPlacement.find({}).sort({ page: 1, key: 1 });
    res.json({ success: true, data: { placements } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching placements', error: err.message });
  }
});

router.patch('/:id', requirePermission('placements.edit'), async (req, res) => {
  try {
    const { label, enabled, defaultLimit, description, supportedTypes } = req.body;
    const placement = await MonetizationPlacement.findById(req.params.id);
    if (!placement) return res.status(404).json({ success: false, message: 'Placement not found' });

    if (label !== undefined) placement.label = label;
    if (enabled !== undefined) placement.enabled = enabled;
    if (defaultLimit !== undefined) placement.defaultLimit = defaultLimit;
    if (description !== undefined) placement.description = description;
    if (supportedTypes !== undefined) placement.supportedTypes = supportedTypes;

    await placement.save();
    res.json({ success: true, data: { placement } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating placement', error: err.message });
  }
});

export default router;
