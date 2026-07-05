import express from 'express';
import { evaluateTeamColor } from '../controllers/teamColorEvaluation.controller.js';

const router = express.Router();

router.post('/evaluate', evaluateTeamColor);

export default router;
