import { prisma } from '../../config/database';

export class DocumentVersionsRepository {
  async findByDocument(documentId: string, companyId: string) {
    return prisma.documentVersion.findMany({
      where: { documentId, companyId },
      orderBy: { versionNumber: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        fileObjects: {
          select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true },
        },
      },
    });
  }

  async findLatest(documentId: string) {
    return prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async getHistory(documentId: string, companyId: string) {
    return prisma.documentStatusHistory.findMany({
      where: { documentId, companyId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }
}
