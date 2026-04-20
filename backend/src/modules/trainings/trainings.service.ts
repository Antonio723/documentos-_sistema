import crypto from 'crypto';
import { TrainingsRepository } from './trainings.repository';
import {
  CreateTrainingDto, UpdateTrainingDto, AssignUsersDto,
  RecordCompletionDto, TrainingsFilterDto, MyAssignmentsFilterDto,
} from './dto/training.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { logAudit } from '../../shared/audit/audit.service';
import { env } from '../../config/env';

const repo = new TrainingsRepository();

function buildCompletionSignature(userId: string, assignmentId: string, timestamp: string): string {
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${userId}|${assignmentId}|completed|${timestamp}`)
    .digest('hex');
}

export class TrainingsService {
  async findAll(companyId: string, filters: TrainingsFilterDto) {
    const { data, total } = await repo.findAll(companyId, filters);
    return buildPaginatedResult(data, total, filters.page, filters.limit);
  }

  async findById(id: string, companyId: string) {
    const training = await repo.findById(id, companyId);
    if (!training) throw new NotFoundError('Training');
    return training;
  }

  async create(companyId: string, userId: string, dto: CreateTrainingDto) {
    const training = await repo.create({
      company:    { connect: { id: companyId } },
      createdBy:  { connect: { id: userId } },
      title:      dto.title,
      description: dto.description,
      category:   dto.category,
      durationHours: dto.durationHours,
      validityMonths: dto.validityMonths,
      passingScore: dto.passingScore,
      status:     dto.status,
      ...(dto.documentId ? { document: { connect: { id: dto.documentId } } } : {}),
    });
    void logAudit({ companyId, userId }, { action: 'create', resource: 'training', resourceId: training.id });
    return training;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateTrainingDto) {
    await this.findById(id, companyId);
    const training = await repo.update(id, {
      title:       dto.title,
      description: dto.description,
      category:    dto.category,
      durationHours: dto.durationHours,
      validityMonths: dto.validityMonths,
      passingScore: dto.passingScore,
      status:      dto.status,
      ...(dto.documentId !== undefined
        ? { document: dto.documentId ? { connect: { id: dto.documentId } } : { disconnect: true } }
        : {}),
    });
    void logAudit({ companyId, userId }, { action: 'update', resource: 'training', resourceId: id });
    return training;
  }

  async delete(id: string, companyId: string, userId: string) {
    const training = await this.findById(id, companyId);
    if (training._count.assignments > 0) {
      throw new AppError('Não é possível excluir treinamento com atribuições', 409, 'HAS_ASSIGNMENTS');
    }
    await repo.delete(id);
    void logAudit({ companyId, userId }, { action: 'delete', resource: 'training', resourceId: id });
  }

  async assignUsers(trainingId: string, companyId: string, assignedById: string, dto: AssignUsersDto) {
    const training = await this.findById(trainingId, companyId);
    if (training.status !== 'active') {
      throw new AppError('Treinamento deve estar ativo para receber atribuições', 422, 'INVALID_STATUS');
    }

    const results = [];
    for (const userId of dto.userIds) {
      const existing = await repo.findAssignmentByTrainingAndUser(trainingId, userId);
      if (existing) continue;

      const assignment = await repo.createAssignment({
        company:    { connect: { id: companyId } },
        training:   { connect: { id: trainingId } },
        user:       { connect: { id: userId } },
        assignedBy: { connect: { id: assignedById } },
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        status: 'pending',
      });
      results.push(assignment);
    }
    return results;
  }

  async recordCompletion(
    assignmentId: string,
    companyId: string,
    recordedById: string,
    dto: RecordCompletionDto,
  ) {
    const assignment = await repo.findAssignment(assignmentId, companyId);
    if (!assignment) throw new NotFoundError('Assignment');
    if (assignment.completion) throw new AppError('Conclusão já registrada', 409, 'ALREADY_COMPLETED');

    const passingScore = assignment.training.passingScore;
    const passed = dto.score !== undefined && passingScore !== null
      ? dto.score >= passingScore
      : dto.passed;

    const timestamp = new Date().toISOString();
    const signature = buildCompletionSignature(assignment.userId, assignmentId, timestamp);

    const validityMonths = assignment.training.validityMonths;
    const expiresAt = validityMonths
      ? new Date(Date.now() + validityMonths * 30 * 24 * 60 * 60 * 1000)
      : undefined;

    const completion = await repo.createCompletion({
      assignment: { connect: { id: assignmentId } },
      user:       { connect: { id: assignment.userId } },
      recordedBy: { connect: { id: recordedById } },
      companyId,
      score: dto.score,
      passed,
      notes: dto.notes,
      expiresAt,
      signature,
    });

    await repo.updateAssignment(assignmentId, {
      status: passed ? 'completed' : 'in_progress',
    });

    void logAudit(
      { companyId, userId: recordedById },
      { action: 'confirm', resource: 'training', resourceId: assignmentId, details: { passed, score: dto.score } },
    );

    return completion;
  }

  async findMyAssignments(userId: string, companyId: string, filters: MyAssignmentsFilterDto) {
    const now = new Date();
    const { data, total } = await repo.findMyAssignments(userId, companyId, filters);

    // Mark overdue in memory (DB update would run on a cron)
    const enriched = data.map(a => ({
      ...a,
      status: a.status === 'pending' && a.dueDate && new Date(a.dueDate) < now ? 'overdue' : a.status,
    }));

    return buildPaginatedResult(enriched, total, filters.page, filters.limit);
  }

  async getCategories(companyId: string) {
    return repo.getCategories(companyId);
  }
}
