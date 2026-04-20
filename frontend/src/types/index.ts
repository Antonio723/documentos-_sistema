export type DocumentStatus = 'draft' | 'review' | 'approval' | 'published' | 'obsolete' | 'cancelled';
export type Confidentiality = 'public_internal' | 'restricted' | 'confidential' | 'critical';
export type ApprovalStatus = 'in_progress' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalActionType = 'approve' | 'reject' | 'request_changes';

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean };
}

export interface ApiResponse<T> { success: boolean; data: T; message?: string }

export interface Company {
  id: string; name: string; cnpj?: string; email?: string; phone?: string;
  plan: string; isActive: boolean; createdAt: string; updatedAt: string;
  _count?: { users: number; documents: number };
}

export interface Permission {
  id: string; resource: string; action: string; description?: string;
}

export interface Role {
  id: string; name: string; description?: string; isSystem?: boolean;
  permissions?: Permission[];
  _count?: { users: number };
}

export interface User {
  id: string; name: string; email: string; isMaster: boolean; isActive: boolean; companyId: string;
  company: { id: string; name: string };
  roles: { id: string; name: string }[];
}

export interface DocumentType {
  id: string; companyId: string; name: string; code: string; prefix: string;
  description?: string; retentionYears?: number; isActive: boolean; createdAt: string;
  _count?: { documents: number };
}

export interface FileObject {
  id: string; originalName: string; mimeType: string; sizeBytes: number; createdAt: string;
}

export interface Document {
  id: string; companyId: string; code: string; title: string; description?: string;
  documentType: { id: string; name: string; code: string; prefix: string };
  area?: string; process?: string; product?: string;
  owner: { id: string; name: string; email: string };
  status: DocumentStatus; currentVersion: string; confidentiality: Confidentiality;
  validityStart?: string; validityEnd?: string; tags: string[]; createdAt: string; updatedAt: string;
  fileObjects: FileObject[];
  _count?: { versions: number; fileObjects: number };
}

export interface DocumentVersion {
  id: string; documentId: string; versionCode: string; versionNumber: number; reason: string;
  status: DocumentStatus; snapshotData: Record<string, unknown>;
  createdBy: { id: string; name: string; email: string }; createdAt: string; fileObjects: FileObject[];
}

export interface StatusHistory {
  id: string; fromStatus?: DocumentStatus; toStatus: DocumentStatus; comment?: string;
  user: { id: string; name: string; email: string }; createdAt: string;
}

export interface WorkflowStep {
  id: string; order: number; name: string; description?: string;
  approverUserId?: string; approverRoleId?: string;
  approverUser?: { id: string; name: string; email: string };
  approverRole?: { id: string; name: string };
  slaHours?: number; isRequired: boolean;
}

export interface WorkflowTemplate {
  id: string; companyId: string; name: string; description?: string;
  documentTypeId?: string;
  documentType?: { id: string; name: string; code: string };
  isActive: boolean; createdAt: string; updatedAt: string;
  steps: WorkflowStep[];
  _count?: { requests: number };
}

export interface ApprovalAction {
  id: string; stepOrder: number; stepName: string; action: ApprovalActionType;
  comment?: string; userName: string; userEmail: string; ip?: string;
  signature: string; createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface ApprovalRequest {
  id: string; companyId: string; documentId: string;
  document: { id: string; code: string; title: string; status: DocumentStatus; currentVersion: string; documentTypeId: string };
  workflowTemplate: WorkflowTemplate;
  currentStep: number; totalSteps: number; status: ApprovalStatus;
  requestedBy: { id: string; name: string; email: string };
  completedAt?: string; createdAt: string; updatedAt: string;
  actions: ApprovalAction[];
}

export type TrainingStatus   = 'draft' | 'active' | 'archived';
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export interface TrainingCompletion {
  id: string; score?: number; passed: boolean; notes?: string;
  completedAt: string; expiresAt?: string; signature: string;
  recordedBy: { id: string; name: string; email: string };
}

export interface TrainingAssignment {
  id: string; companyId: string; trainingId: string; userId: string;
  status: AssignmentStatus; dueDate?: string; notes?: string;
  createdAt: string; updatedAt: string;
  training: Training & { document?: { id: string; code: string; title: string } };
  user:       { id: string; name: string; email: string };
  assignedBy: { id: string; name: string; email: string };
  completion?: TrainingCompletion;
}

export interface Training {
  id: string; companyId: string; title: string; description?: string;
  documentId?: string; category?: string; durationHours?: number;
  validityMonths?: number; passingScore?: number;
  status: TrainingStatus; createdAt: string; updatedAt: string;
  document?:  { id: string; code: string; title: string };
  createdBy:  { id: string; name: string; email: string };
  assignments?: TrainingAssignment[];
  _count?: { assignments: number };
}

export type CopyType = 'controlled' | 'uncontrolled';

export interface ReadConfirmation {
  id: string; confirmedAt: string; signature: string;
}

export interface AuditLog {
  id: string; companyId: string; userId?: string; userName?: string; userEmail?: string;
  action: string; resource: string; resourceId?: string;
  details?: Record<string, unknown>; ip?: string; userAgent?: string; createdAt: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertNotification {
  id: string; companyId: string; userId: string;
  type: string; severity: AlertSeverity; title: string; message: string;
  resourceId?: string; resourceType?: string; isRead: boolean; createdAt: string;
}

export interface DocumentDistribution {
  id: string; companyId: string; documentId: string; version: string;
  copyType: CopyType; copyNumber?: number;
  dueDate?: string; notes?: string; isActive: boolean; createdAt: string;
  document: { id: string; code: string; title: string; currentVersion: string; status: DocumentStatus; documentTypeId: string };
  user: { id: string; name: string; email: string };
  sentBy: { id: string; name: string; email: string };
  confirmation?: ReadConfirmation;
}
