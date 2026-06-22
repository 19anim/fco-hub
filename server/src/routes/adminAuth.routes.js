import express from 'express';
import { login, logout, getMe, changePassword } from '../controllers/adminAuth.controller.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', adminAuth, getMe);
router.post('/change-password', adminAuth, changePassword);

export default router;
