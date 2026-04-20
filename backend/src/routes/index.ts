import { Router, Request, Response } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { companiesRoutes } from '../modules/companies/companies.routes';
import { usersRoutes } from '../modules/users/users.routes';
import { rolesRoutes } from '../modules/roles/roles.routes';
import { documentTypesRoutes } from '../modules/document-types/document-types.routes';
import { documentsRoutes } from '../modules/documents/documents.routes';
import { documentVersionsRoutes } from '../modules/document-versions/document-versions.routes';
import { workflowsRoutes } from '../modules/workflows/workflows.routes';
import { approvalsRoutes } from '../modules/approvals/approvals.routes';
import { distributionsRoutes, documentDistributionsRoutes } from '../modules/distributions/distributions.routes';
import { auditRoutes } from '../modules/audit/audit.routes';
import { alertsRoutes } from '../modules/alerts/alerts.routes';
import { trainingsRoutes } from '../modules/trainings/trainings.routes';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/companies', companiesRoutes);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/document-types', documentTypesRoutes);
router.use('/documents', documentsRoutes);
router.use('/documents/:id/versions', documentVersionsRoutes);
router.use('/documents/:documentId/distributions', documentDistributionsRoutes);
router.use('/workflows', workflowsRoutes);
router.use('/approvals', approvalsRoutes);
router.use('/distributions', distributionsRoutes);
router.use('/audit', auditRoutes);
router.use('/alerts', alertsRoutes);
router.use('/trainings', trainingsRoutes);
router.use('/dashboard', dashboardRoutes);

export { router as apiRouter };
