import { Router } from 'express';
import { ApprovalsController } from './approvals.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const router = Router();
const ctrl = new ApprovalsController();

router.use(authMiddleware, tenantMiddleware);

// My pending approvals
router.get('/my-pending', requirePermission('documents', 'approve'), (req, res, next) => ctrl.getMyPending(req, res, next));

// List / get approval requests
router.get('/', requirePermission('documents', 'read'), (req, res, next) => ctrl.findAll(req, res, next));
router.get('/:id', requirePermission('documents', 'read'), (req, res, next) => ctrl.findById(req, res, next));

// Create approval request for a document
router.post('/documents/:documentId', requirePermission('documents', 'approve'), (req, res, next) => ctrl.create(req, res, next));

// Act on an approval (approve/reject/request_changes)
router.post('/:id/act', requirePermission('documents', 'approve'), (req, res, next) => ctrl.act(req, res, next));

// Cancel
router.post('/:id/cancel', requirePermission('documents', 'approve'), (req, res, next) => ctrl.cancel(req, res, next));

export { router as approvalsRoutes };
