import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const router = Router();
const ctrl = new AuditController();

router.use(authMiddleware, tenantMiddleware);

router.get('/resources', requirePermission('audit', 'read'), (req, res, next) => ctrl.getResources(req, res, next));
router.get('/', requirePermission('audit', 'read'), (req, res, next) => ctrl.findAll(req, res, next));

export { router as auditRoutes };
