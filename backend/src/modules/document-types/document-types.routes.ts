import { Router } from 'express';
import { DocumentTypesController } from './document-types.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const router = Router();
const ctrl = new DocumentTypesController();

router.use(authMiddleware, tenantMiddleware);

router.get('/active', requirePermission('documents', 'read'), (req, res, next) => ctrl.findAllActive(req, res, next));
router.get('/', requirePermission('documents', 'read'), (req, res, next) => ctrl.findAll(req, res, next));
router.get('/:id', requirePermission('documents', 'read'), (req, res, next) => ctrl.findById(req, res, next));
router.post('/', requirePermission('documents', 'create'), (req, res, next) => ctrl.create(req, res, next));
router.patch('/:id', requirePermission('documents', 'update'), (req, res, next) => ctrl.update(req, res, next));
router.delete('/:id', requirePermission('documents', 'delete'), (req, res, next) => ctrl.delete(req, res, next));

export { router as documentTypesRoutes };
