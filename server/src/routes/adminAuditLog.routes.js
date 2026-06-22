import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth, requirePermission('auditLog.view'));

router.get('/', async (req, res) => {
  try {
    const { action, resourceType, actorId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action)       filter.action = { $regex: action, $options: 'i' };
    if (resourceType) filter.resourceType = resourceType;
    if (actorId)      filter.actorUserId = actorId;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: { logs, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching audit logs', error: err.message });
  }
});

export default router;
