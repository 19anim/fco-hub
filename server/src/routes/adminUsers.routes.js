import express from 'express';
import { listUsers, getUser, createUser, updateUser, resetPassword } from '../controllers/adminUsers.controller.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';

const router = express.Router();

router.use(adminAuth);

router.get('/', requirePermission('users.view'), listUsers);
router.get('/:id', requirePermission('users.view'), getUser);
router.post('/', requirePermission('users.create'), createUser);
router.patch('/:id', requirePermission('users.edit'), updateUser);
router.post('/:id/reset-password', requirePermission('users.edit'), resetPassword);

export default router;
