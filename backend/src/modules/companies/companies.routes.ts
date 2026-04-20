import { Router } from 'express';
import { CompaniesController } from './companies.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const router = Router();
const controller = new CompaniesController();

router.use(authMiddleware);

router.get('/', requirePermission('companies', 'read'), (req, res, next) =>
  controller.findAll(req, res, next),
);

router.get('/:id', requirePermission('companies', 'read'), (req, res, next) =>
  controller.findById(req, res, next),
);

router.post('/', requirePermission('companies', 'create'), (req, res, next) =>
  controller.create(req, res, next),
);

router.patch('/:id', requirePermission('companies', 'update'), (req, res, next) =>
  controller.update(req, res, next),
);

router.delete('/:id', requirePermission('companies', 'delete'), (req, res, next) =>
  controller.delete(req, res, next),
);

export { router as companiesRoutes };
