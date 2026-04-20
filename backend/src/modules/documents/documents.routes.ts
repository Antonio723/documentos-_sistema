import { Router } from 'express';
import { DocumentsController } from './documents.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { uploadMiddleware } from '../../middlewares/upload.middleware';

const router = Router();
const ctrl = new DocumentsController();

router.use(authMiddleware, tenantMiddleware);

router.get('/', requirePermission('documents', 'read'), (req, res, next) => ctrl.findAll(req, res, next));
router.get('/:id', requirePermission('documents', 'read'), (req, res, next) => ctrl.findById(req, res, next));
router.post('/', requirePermission('documents', 'create'), (req, res, next) => ctrl.create(req, res, next));
router.patch('/:id', requirePermission('documents', 'update'), (req, res, next) => ctrl.update(req, res, next));
router.patch('/:id/status', requirePermission('documents', 'update'), (req, res, next) => ctrl.changeStatus(req, res, next));
router.delete('/:id', requirePermission('documents', 'delete'), (req, res, next) => ctrl.delete(req, res, next));

router.post(
  '/:id/upload',
  requirePermission('documents', 'update'),
  uploadMiddleware.single('file'),
  (req, res, next) => ctrl.uploadFile(req, res, next),
);
router.get('/:id/files/:fileId/url', requirePermission('documents', 'download'), (req, res, next) => ctrl.getFileUrl(req, res, next));

export { router as documentsRoutes };
