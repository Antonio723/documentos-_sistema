import crypto from 'crypto';
import { ApprovalsRepository } from './approvals.repository';
import { WorkflowsRepository } from '../workflows/workflows.repository';
import { DocumentsRepository } from '../documents/documents.repository';
import { ApprovalActionDto, ApprovalsFilterDto } from './dto/approval.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { AppError, NotFoundError, ForbiddenError } from '../../shared/errors/AppError';
import { scheduleApprovalReminder } from '../../config/queue';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger/logger';
import { env } from '../../config/env';
import { logAudit } from '../../shared/audit/audit.service';

const repo = new ApprovalsRepository();
const wfRepo = new WorkflowsRepository();
const docsRepo = new DocumentsRepository();

function buildSignature(userId: string, documentId: string, action: string, timestamp: string): string {
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${userId}|${documentId}|${action}|${timestamp}`)
    .digest('hex');
}

export class ApprovalsService {
  async findAll(companyId: string, userId: string, filters: ApprovalsFilterDto) {
    const { data, total } = await repo.findAll(companyId, { ...filters, userId });
    return buildPaginatedResult(data, total, filters.page, filters.limit);
  }

  async findById(id: string, companyId: string) {
    const req = await repo.findById(id, companyId);
    if (!req) throw new NotFoundError('Approval request');
    return req;
  }

  async createForDocument(documentId: string, companyId: string, requestedById: string, workflowTemplateId: string) {
    const doc = await docsRepo.findById(documentId, companyId);
    if (!doc) throw new NotFoundError('Document');

    const existing = await repo.findActiveByDocument(documentId);
    if (existing) throw new AppError('Document already has an active approval request', 409, 'CONFLICT');

    const wf = await wfRepo.findById(workflowTemplateId, companyId);
    if (!wf) throw new NotFoundError('Workflow template');
    if (!wf.isActive) throw new AppError('Workflow template is inactive', 422, 'INACTIVE_WORKFLOW');
    if (!wf.steps.length) throw new AppError('Workflow has no steps', 422, 'NO_STEPS');

    const request = await repo.create({
      company: { connect: { id: companyId } },
      document: { connect: { id: documentId } },
      workflowTemplate: { connect: { id: workflowTemplateId } },
      requestedBy: { connect: { id: requestedById } },
      currentStep: 1,
      totalSteps: wf.steps.length,
      status: 'in_progress',
    });

    const firstStep = wf.steps[0];
    const firstStepEmail = firstStep.approverUser?.email;
    await scheduleApprovalReminder({
      approvalRequestId: request.id,
      documentId,
      documentTitle: doc.title,
      stepName: firstStep.name,
      approverEmail: firstStepEmail,
      companyId,
    });

    if (firstStep.slaHours) {
      await scheduleApprovalReminder(
        { approvalRequestId: request.id, documentId, documentTitle: doc.title, stepName: firstStep.name, approverEmail: firstStepEmail, companyId },
        (firstStep.slaHours - 1) * 3600 * 1000,
      );
    }

    logger.info({ msg: 'Approval request created', requestId: request.id, documentId, workflowTemplateId });
    void logAudit(
      { companyId, userId: requestedById },
      { action: 'create', resource: 'approval', resourceId: request.id, details: { documentId, workflowTemplateId } },
    );
    return request;
  }

  async act(id: string, companyId: string, userId: string, ip: string, userAgent: string, dto: ApprovalActionDto) {
    const request = await this.findById(id, companyId);

    if (request.status !== 'in_progress') {
      throw new AppError('This approval request is no longer active', 409, 'ALREADY_RESOLVED');
    }

    const currentStepDef = request.workflowTemplate.steps.find((s) => s.order === request.currentStep);
    if (!currentStepDef) throw new AppError('Current step not found', 500, 'STEP_NOT_FOUND');

    // Verify actor is authorized for this step
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId },
      include: { userRoles: { select: { roleId: true } } },
    });
    if (!user) throw new ForbiddenError();

    const isStepApprover =
      user.isMaster ||
      currentStepDef.approverUserId === userId ||
      (currentStepDef.approverRoleId &&
        user.userRoles.some((ur) => ur.roleId === currentStepDef.approverRoleId));

    if (!isStepApprover) {
      throw new ForbiddenError('You are not authorized to act on this approval step');
    }

    const timestamp = new Date().toISOString();
    const signature = buildSignature(userId, request.documentId, dto.action, timestamp);

    await prisma.approvalAction.create({
      data: {
        approvalRequest: { connect: { id } },
        companyId,
        stepOrder: request.currentStep,
        stepName: currentStepDef.name,
        user: { connect: { id: userId } },
        userName: user.name,
        userEmail: user.email,
        action: dto.action,
        comment: dto.comment,
        ip,
        userAgent,
        signature,
      },
    });

    if (dto.action === 'reject' || dto.action === 'request_changes') {
      const updated = await repo.update(id, {
        status: 'rejected',
        completedAt: new Date(),
      });

      const newStatus = dto.action === 'reject' ? 'review' : 'draft';
      await docsRepo.update(request.documentId, { status: newStatus });
      await docsRepo.addStatusHistory(request.documentId, companyId, userId, 'approval', newStatus, dto.comment);

      logger.info({ msg: `Approval ${dto.action}`, requestId: id, documentId: request.documentId, userId });
      return updated;
    }

    // approve — advance to next step
    const nextStep = request.currentStep + 1;

    if (nextStep > request.totalSteps) {
      // All steps approved → publish document
      const completed = await repo.update(id, { status: 'approved', completedAt: new Date() });
      await docsRepo.update(request.documentId, { status: 'published' });
      await docsRepo.addStatusHistory(request.documentId, companyId, userId, 'approval', 'published', 'All approval steps completed');

      logger.info({ msg: 'Document approved and published', requestId: id, documentId: request.documentId });
      return completed;
    }

    // Advance to next step
    const updated = await repo.update(id, { currentStep: nextStep });

    const nextStepDef = request.workflowTemplate.steps.find((s) => s.order === nextStep);
    if (nextStepDef) {
      await scheduleApprovalReminder({
        approvalRequestId: id,
        documentId: request.documentId,
        documentTitle: request.document.title,
        stepName: nextStepDef.name,
        approverEmail: nextStepDef.approverUser?.email,
        companyId,
      });
    }

    return updated;
  }

  async cancel(id: string, companyId: string, userId: string) {
    const request = await this.findById(id, companyId);
    if (request.status !== 'in_progress') throw new AppError('Cannot cancel a resolved request', 409, 'ALREADY_RESOLVED');

    const updated = await repo.update(id, { status: 'cancelled', completedAt: new Date() });
    await docsRepo.update(request.documentId, { status: 'review' });
    await docsRepo.addStatusHistory(request.documentId, companyId, userId, 'approval', 'review', 'Approval request cancelled');
    return updated;
  }

  async getMyPending(companyId: string, userId: string) {
    const { data } = await repo.findAll(companyId, { page: 1, limit: 50, myPending: true, userId });
    return data;
  }
}
