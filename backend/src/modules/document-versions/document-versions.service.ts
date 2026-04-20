import { prisma } from '../../config/database';
import { DocumentVersionsRepository } from './document-versions.repository';
import { DocumentsRepository } from '../documents/documents.repository';
import { CreateVersionDto } from './dto/version.dto';
import { NotFoundError, AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';

const repo = new DocumentVersionsRepository();
const docsRepo = new DocumentsRepository();

export class DocumentVersionsService {
  async findByDocument(documentId: string, companyId: string) {
    const doc = await docsRepo.findById(documentId, companyId);
    if (!doc) throw new NotFoundError('Document');
    return repo.findByDocument(documentId, companyId);
  }

  async getHistory(documentId: string, companyId: string) {
    const doc = await docsRepo.findById(documentId, companyId);
    if (!doc) throw new NotFoundError('Document');
    return repo.getHistory(documentId, companyId);
  }

  async createNewVersion(documentId: string, companyId: string, userId: string, dto: CreateVersionDto) {
    const doc = await docsRepo.findById(documentId, companyId);
    if (!doc) throw new NotFoundError('Document');

    if (doc.status !== 'published') {
      throw new AppError(
        'Only published documents can have a new revision created',
        422,
        'INVALID_STATUS_FOR_REVISION',
      );
    }

    const latest = await repo.findLatest(documentId);
    const nextNumber = (latest?.versionNumber ?? 0) + 1;
    const nextCode = `Rev.${String(nextNumber).padStart(2, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      // Mark current published version obsolete
      await tx.document.update({
        where: { id: documentId },
        data: { status: 'obsolete' },
      });

      await tx.documentStatusHistory.create({
        data: {
          documentId,
          companyId,
          userId,
          fromStatus: 'published',
          toStatus: 'obsolete',
          comment: `Superseded by ${nextCode}: ${dto.reason}`,
        },
      });

      // Create new document entry (same code, new version) — actually update the same document
      const updated = await tx.document.update({
        where: { id: documentId },
        data: {
          status: 'draft',
          currentVersion: nextCode,
        },
      });

      await tx.documentStatusHistory.create({
        data: {
          documentId,
          companyId,
          userId,
          fromStatus: 'obsolete',
          toStatus: 'draft',
          comment: `New revision ${nextCode} started. Reason: ${dto.reason}`,
        },
      });

      const snapshot = {
        title: doc.title,
        description: doc.description,
        area: doc.area,
        process: doc.process,
        product: doc.product,
        confidentiality: doc.confidentiality,
        validityStart: doc.validityStart,
        validityEnd: doc.validityEnd,
      };

      const version = await tx.documentVersion.create({
        data: {
          documentId,
          companyId,
          versionCode: nextCode,
          versionNumber: nextNumber,
          reason: dto.reason,
          status: 'draft',
          createdById: userId,
          snapshotData: snapshot,
        },
      });

      return { document: updated, version };
    });

    logger.info({ msg: 'New document version created', documentId, version: nextCode, userId });
    return result;
  }
}
