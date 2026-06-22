import express from 'express';
import {
  listItems, getItem, createItem, updateItem,
  publishItem, unpublishItem, archiveItem, duplicateItem, deleteItem,
} from '../controllers/adminMonetization.controller.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();
router.use(adminAuth);

router.get('/', requirePermission('monetization.view'), listItems);
router.get('/:id', requirePermission('monetization.view'), getItem);
router.post('/', requirePermission('monetization.create'), createItem);
router.put('/:id', requirePermission('monetization.edit'), updateItem);
router.patch('/:id/publish', requirePermission('monetization.publish'), publishItem);
router.patch('/:id/unpublish', requirePermission('monetization.publish'), unpublishItem);
router.patch('/:id/archive', requirePermission('monetization.archive'), archiveItem);
router.post('/:id/duplicate', requirePermission('monetization.create'), duplicateItem);
router.delete('/:id', requirePermission('monetization.archive'), deleteItem);

export default router;
