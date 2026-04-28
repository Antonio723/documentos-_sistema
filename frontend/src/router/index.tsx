import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { DocumentsListPage } from '@/pages/documents/DocumentsListPage';
import { DocumentCreatePage } from '@/pages/documents/DocumentCreatePage';
import { DocumentEditPage } from '@/pages/documents/DocumentEditPage';
import { DocumentViewPage } from '@/pages/documents/DocumentViewPage';
import { DocumentVersionsPage } from '@/pages/documents/DocumentVersionsPage';
import { WorkflowsPage } from '@/pages/workflows/WorkflowsPage';
import { WorkflowFormPage } from '@/pages/workflows/WorkflowFormPage';
import { ApprovalsPage } from '@/pages/approvals/ApprovalsPage';
import { ApprovalDetailPage } from '@/pages/approvals/ApprovalDetailPage';
import { MyReadingsPage } from '@/pages/distributions/MyReadingsPage';
import { AuditPage } from '@/pages/audit/AuditPage';
import { TrainingsPage } from '@/pages/trainings/TrainingsPage';
import { TrainingDetailPage } from '@/pages/trainings/TrainingDetailPage';
import { MyTrainingsPage } from '@/pages/trainings/MyTrainingsPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { RolesPage } from '@/pages/roles/RolesPage';
import { DocumentTypesPage } from '@/pages/document-types/DocumentTypesPage';
import { CompaniesPage } from '@/pages/companies/CompaniesPage';

export const router = createBrowserRouter([
  { path: '/login', element: import.meta.env.VITE_AUTH_DISABLED === 'true' ? <Navigate to="/dashboard" replace /> : <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'documents', element: <DocumentsListPage /> },
          { path: 'documents/new', element: <DocumentCreatePage /> },
          { path: 'documents/:id', element: <DocumentViewPage /> },
          { path: 'documents/:id/edit', element: <DocumentEditPage /> },
          { path: 'documents/:id/versions', element: <DocumentVersionsPage /> },
          { path: 'workflows', element: <WorkflowsPage /> },
          { path: 'workflows/new', element: <WorkflowFormPage /> },
          { path: 'workflows/:id/edit', element: <WorkflowFormPage /> },
          { path: 'approvals', element: <ApprovalsPage /> },
          { path: 'approvals/:id', element: <ApprovalDetailPage /> },
          { path: 'my-readings', element: <MyReadingsPage /> },
          { path: 'audit', element: <AuditPage /> },
          { path: 'trainings', element: <TrainingsPage /> },
          { path: 'trainings/:id', element: <TrainingDetailPage /> },
          { path: 'my-trainings', element: <MyTrainingsPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'document-types', element: <DocumentTypesPage /> },
          { path: 'companies', element: <CompaniesPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
