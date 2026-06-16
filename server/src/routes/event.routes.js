import express from 'express';
import { getEvents, scanEvents, getEventById } from '../controllers/event.controller.js';

const router = express.Router();

// GET /api/events - Get all events (with optional filters)
router.get('/', getEvents);

// POST /api/events/scan - Trigger event scan
router.post('/scan', scanEvents);

// GET /api/events/:id - Get single event by ID
router.get('/:id', getEventById);

export default router;