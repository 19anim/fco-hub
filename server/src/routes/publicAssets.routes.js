import express from 'express';
import { assetsController } from '../controllers/assets.controller.js';

export function createPublicAssetsRouter(controller = assetsController) {
  const router = express.Router();
  router.get('/public-map', controller.publicMap);
  router.use(controller.error);
  return router;
}

export default createPublicAssetsRouter();
