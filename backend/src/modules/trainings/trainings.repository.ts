import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { TrainingsFilterDto, MyAssignmentsFilterDto } from './dto/training.dto';

const TRAINING_INCLUDE = {
  document:  { select: { id: true, code: true, title: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  _count:    { select: { assignments: true } },
} satisfies Prisma.TrainingInclude;

const ASSIGNMENT_INCLUDE = {
  training:   { include: { document: { select: { id: true, code: true, title: true } } } },
  user:       { select: { id: true, name: true, email: true } },
  assignedBy: { select: { id: true, name: true, email: true } },
  completion: true,
} satisfies Prisma.TrainingAssignmentInclude;

export class TrainingsRepository {
  async create(data: Prisma.TrainingCreateInput) {
    return prisma.training.create({ data, include: TRAINING_INCLUDE });
  }

  async findAll(companyId: string, filters: TrainingsFilterDto) {
    const where: Prisma.TrainingWhereInput = {
      companyId,
      ...(filters.status   ? { status: filters.status }     : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.search
        ? { OR: [{ title: { contains: filters.search, mode: 'insensitive' } }, { description: { contains: filters.search, mode: 'insensitive' } }] }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.training.findMany({
        where, include: TRAINING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.training.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string, companyId: string) {
    return prisma.training.findFirst({
      where: { id, companyId },
      include: {
        ...TRAINING_INCLUDE,
        assignments: { include: ASSIGNMENT_INCLUDE, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async update(id: string, data: Prisma.TrainingUpdateInput) {
    return prisma.training.update({ where: { id }, data, include: TRAINING_INCLUDE });
  }

  async delete(id: string) {
    return prisma.training.delete({ where: { id } });
  }

  async createAssignment(data: Prisma.TrainingAssignmentCreateInput) {
    return prisma.trainingAssignment.create({ data, include: ASSIGNMENT_INCLUDE });
  }

  async findAssignment(id: string, companyId: string) {
    return prisma.trainingAssignment.findFirst({ where: { id, companyId }, include: ASSIGNMENT_INCLUDE });
  }

  async findAssignmentByTrainingAndUser(trainingId: string, userId: string) {
    return prisma.trainingAssignment.findUnique({ where: { trainingId_userId: { trainingId, userId } } });
  }

  async updateAssignment(id: string, data: Prisma.TrainingAssignmentUpdateInput) {
    return prisma.trainingAssignment.update({ where: { id }, data, include: ASSIGNMENT_INCLUDE });
  }

  async findMyAssignments(userId: string, companyId: string, filters: MyAssignmentsFilterDto) {
    const where: Prisma.TrainingAssignmentWhereInput = {
      userId, companyId,
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.trainingAssignment.findMany({
        where, include: ASSIGNMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.trainingAssignment.count({ where }),
    ]);
    return { data, total };
  }

  async createCompletion(data: Prisma.TrainingCompletionCreateInput) {
    return prisma.trainingCompletion.create({ data });
  }

  async getCategories(companyId: string): Promise<string[]> {
    const rows = await prisma.training.findMany({
      where: { companyId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });
    return rows.map(r => r.category!);
  }
}
