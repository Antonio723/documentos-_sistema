import { Router } from 'express';
import { DistributionsController } from './distributions.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const router = Router();
const ctrl = new DistributionsController();

router.use(authMiddleware, tenantMiddleware);

// My distributions (reading list)
router.get('/my', (req, res, next) => ctrl.findMine(req, res, next));
router.get('/my-pending', (req, res, next) => ctrl.findMyPending(req, res, next));

// Single distribution actions
router.get('/:id', (req, res, next) => ctrl.findById(req, res, next));
router.post('/:id/confirm', (req, res, next) => ctrl.confirm(req, res, next));
router.get('/:id/download', (req, res, next) => ctrl.download(req, res, next));

export { router as distributionsRoutes };

// Sub-router for documents/:documentId/distributions
const docRouter = Router({ mergeParams: true });
docRouter.use(authMiddleware, tenantMiddleware);
docRouter.post('/', requirePermission('documents', 'update'), (req, res, next) => ctrl.distribute(req, res, next));
docRouter.get('/', requirePermission('documents', 'read'), (req, res, next) => ctrl.findByDocument(req, res, next));

export { docRouter as documentDistributionsRoutes };
