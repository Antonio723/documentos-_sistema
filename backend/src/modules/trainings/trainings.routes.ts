import { Router } from 'express';
import { TrainingsController } from './trainings.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const router = Router();
const ctrl = new TrainingsController();

router.use(authMiddleware, tenantMiddleware);

// My assignments
router.get('/my', (req, res, next) => ctrl.findMyAssignments(req, res, next));

// Categories
router.get('/categories', requirePermission('trainings', 'read'), (req, res, next) => ctrl.getCategories(req, res, next));

// CRUD
router.get('/',    requirePermission('trainings', 'read'),   (req, res, next) => ctrl.findAll(req, res, next));
router.post('/',   requirePermission('trainings', 'create'), (req, res, next) => ctrl.create(req, res, next));
router.get('/:id', requirePermission('trainings', 'read'),   (req, res, next) => ctrl.findById(req, res, next));
router.patch('/:id', requirePermission('trainings', 'update'), (req, res, next) => ctrl.update(req, res, next));
router.delete('/:id', requirePermission('trainings', 'delete'), (req, res, next) => ctrl.delete(req, res, next));

// Assignments
router.post('/:id/assign', requirePermission('trainings', 'create'), (req, res, next) => ctrl.assignUsers(req, res, next));

// Record completion
router.post('/assignments/:assignmentId/complete', requirePermission('trainings', 'update'), (req, res, next) => ctrl.recordCompletion(req, res, next));

export { router as trainingsRoutes };
