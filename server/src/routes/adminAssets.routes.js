import express from 'express';
import { assetsController } from '../controllers/assets.controller.js';
import { adminAuth, requirePermission } from '../middleware/adminAuth.js';
import { createAssetUploadMiddleware } from '../middleware/assetUpload.js';

export function createAdminAssetsRouter(controller = assetsController, upload = createAssetUploadMiddleware()) {
  const router = express.Router();
  router.use(adminAuth);

  router.get('/', requirePermission('assets.view'), controller.list);
  router.post('/upload', requirePermission('assets.create'), upload.single('file'), controller.createUpload);
  router.post('/:id/upload', requirePermission('assets.edit'), upload.single('file'), controller.replaceUpload);
  router.get('/:id', requirePermission('assets.view'), controller.detail);
  router.patch('/:id/active-version', requirePermission('assets.edit'), controller.rollback);
  router.patch('/:id/archive', requirePermission('assets.archive'), controller.archive);
  router.delete('/:id', requirePermission('assets.delete'), controller.delete);

  router.use(controller.error);

  return router;
}

export default createAdminAssetsRouter();
