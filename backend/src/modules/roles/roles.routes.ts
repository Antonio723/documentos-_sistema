import { Router } from 'express';
import { RolesController } from './roles.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const router = Router();
const controller = new RolesController();

router.use(authMiddleware, tenantMiddleware);

router.get('/permissions', requirePermission('roles', 'read'), (req, res, next) =>
  controller.findAllPermissions(req, res, next),
);

router.get('/', requirePermission('roles', 'read'), (req, res, next) =>
  controller.findAll(req, res, next),
);

router.get('/:id', requirePermission('roles', 'read'), (req, res, next) =>
  controller.findById(req, res, next),
);

router.post('/', requirePermission('roles', 'create'), (req, res, next) =>
  controller.create(req, res, next),
);

router.patch('/:id', requirePermission('roles', 'update'), (req, res, next) =>
  controller.update(req, res, next),
);

router.delete('/:id', requirePermission('roles', 'delete'), (req, res, next) =>
  controller.delete(req, res, next),
);

export { router as rolesRoutes };
