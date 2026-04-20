import { Router } from 'express';
import { DocumentVersionsController } from './document-versions.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const router = Router({ mergeParams: true });
const ctrl = new DocumentVersionsController();

router.use(authMiddleware, tenantMiddleware);

router.get('/', requirePermission('documents', 'read'), (req, res, next) => ctrl.findByDocument(req, res, next));
router.get('/history', requirePermission('documents', 'read'), (req, res, next) => ctrl.getHistory(req, res, next));
router.post('/new-version', requirePermission('documents', 'update'), (req, res, next) => ctrl.createNewVersion(req, res, next));

export { router as documentVersionsRoutes };
