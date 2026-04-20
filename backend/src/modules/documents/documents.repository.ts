import { Prisma, DocumentStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { DocumentFiltersDto } from './dto/document.dto';

const DOCUMENT_INCLUDE = {
  documentType: { select: { id: true, name: true, code: true, prefix: true } },
  owner: { select: { id: true, name: true, email: true } },
  fileObjects: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
  },
  _count: { select: { versions: true, fileObjects: true } },
} satisfies Prisma.DocumentInclude;

export class DocumentsRepository {
  async findAll(companyId: string, filters: DocumentFiltersDto) {
    const { page, limit, search, status, documentTypeId, area, confidentiality, ownerId, expiringDays, sortBy, sortOrder } = filters;

    const where: Prisma.DocumentWhereInput = {
      companyId,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { area: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      }),
      ...(status && { status }),
      ...(documentTypeId && { documentTypeId }),
      ...(area && { area: { contains: area, mode: 'insensitive' } }),
      ...(confidentiality && { confidentiality }),
      ...(ownerId && { ownerId }),
      ...(expiringDays && {
        validityEnd: {
          gte: new Date(),
          lte: new Date(Date.now() + expiringDays * 24 * 60 * 60 * 1000),
        },
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.document.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: DOCUMENT_INCLUDE,
      }),
      prisma.document.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, companyId: string) {
    return prisma.document.findFirst({
      where: { id, companyId },
      include: {
        ...DOCUMENT_INCLUDE,
        fileObjects: { orderBy: { createdAt: 'desc' } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  async create(data: Prisma.DocumentUncheckedCreateInput) {
    return prisma.document.create({ data, include: DOCUMENT_INCLUDE });
  }

  async update(id: string, data: Prisma.DocumentUncheckedUpdateInput) {
    return prisma.document.update({ where: { id }, data, include: DOCUMENT_INCLUDE });
  }

  async delete(id: string) {
    return prisma.document.delete({ where: { id } });
  }

  async getNextCode(companyId: string, documentTypeId: string, prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await prisma.documentCodeSequence.upsert({
      where: { companyId_documentTypeId_year: { companyId, documentTypeId, year } },
      update: { lastSequence: { increment: 1 } },
      create: { companyId, documentTypeId, year, lastSequence: 1 },
    });
    return `${prefix}-${year}-${String(seq.lastSequence).padStart(4, '0')}`;
  }

  async addStatusHistory(
    documentId: string,
    companyId: string,
    userId: string,
    fromStatus: DocumentStatus | null,
    toStatus: DocumentStatus,
    comment?: string,
  ) {
    return prisma.documentStatusHistory.create({
      data: { documentId, companyId, userId, fromStatus: fromStatus ?? undefined, toStatus, comment },
    });
  }
}
