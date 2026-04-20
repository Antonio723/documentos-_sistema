import { Router } from 'express';
import { AlertsController } from './alerts.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';

const router = Router();
const ctrl = new AlertsController();

router.use(authMiddleware, tenantMiddleware);

router.get('/my', (req, res, next) => ctrl.findMine(req, res, next));
router.get('/unread-count', (req, res, next) => ctrl.countUnread(req, res, next));
router.post('/read-all', (req, res, next) => ctrl.markAllRead(req, res, next));
router.post('/:id/read', (req, res, next) => ctrl.markRead(req, res, next));

export { router as alertsRoutes };
