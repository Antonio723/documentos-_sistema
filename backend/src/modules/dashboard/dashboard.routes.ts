import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { DashboardController } from './dashboard.controller';

const router = Router();
const ctrl = new DashboardController();

router.use(authMiddleware, tenantMiddleware);

router.get('/kpis',                (req, res, next) => ctrl.getKpis(req, res, next));
router.get('/document-trend',      (req, res, next) => ctrl.getDocumentTrend(req, res, next));
router.get('/training-compliance', (req, res, next) => ctrl.getTrainingCompliance(req, res, next));

export { router as dashboardRoutes };
