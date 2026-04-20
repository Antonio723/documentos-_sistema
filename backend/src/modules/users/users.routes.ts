import { Router } from 'express';
import { UsersController } from './users.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const router = Router();
const controller = new UsersController();

router.use(authMiddleware, tenantMiddleware);

router.get('/', requirePermission('users', 'read'), (req, res, next) =>
  controller.findAll(req, res, next),
);

router.get('/:id', requirePermission('users', 'read'), (req, res, next) =>
  controller.findById(req, res, next),
);

router.post('/', requirePermission('users', 'create'), (req, res, next) =>
  controller.create(req, res, next),
);

router.patch('/:id', requirePermission('users', 'update'), (req, res, next) =>
  controller.update(req, res, next),
);

router.delete('/:id', requirePermission('users', 'delete'), (req, res, next) =>
  controller.delete(req, res, next),
);

export { router as usersRoutes };
