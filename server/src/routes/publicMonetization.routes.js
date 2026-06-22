import express from 'express';
import { getFeed, recordEvent, recordClick } from '../controllers/publicMonetization.controller.js';

const router = express.Router();

router.get('/feed',          getFeed);
router.post('/events',       recordEvent);
router.get('/click/:itemId', recordClick);

export default router;
