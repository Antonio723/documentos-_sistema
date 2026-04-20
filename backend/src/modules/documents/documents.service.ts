import crypto from 'crypto';
import { DocumentStatus } from '@prisma/client';
import { DocumentsRepository } from './documents.repository';
import { DocumentTypesRepository } from '../document-types/document-types.repository';
import { CreateDocumentDto, UpdateDocumentDto, ChangeStatusDto, DocumentFiltersDto } from './dto/document.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { AppError, NotFoundError, ForbiddenError } from '../../shared/errors/AppError';
import { uploadFile, getPresignedUrl, deleteFile } from '../../config/minio';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger/logger';

const ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  draft: ['review', 'cancelled'],
  review: ['approval', 'draft', 'cancelled'],
  approval: ['published', 'review', 'cancelled'],
  published: ['obsolete'],
  obsolete: [],
  cancelled: [],
};

const repo = new DocumentsRepository();
const dtRepo = new DocumentTypesRepository();

export class DocumentsService {
  async findAll(companyId: string, filters: DocumentFiltersDto) {
    const { data, total } = await repo.findAll(companyId, filters);
    return buildPaginatedResult(data, total, filters.page, filters.limit);
  }

  async findById(id: string, companyId: string) {
    const doc = await repo.findById(id, companyId);
    if (!doc) throw new NotFoundError('Document');
    return doc;
  }

  async create(companyId: string, ownerId: string, dto: CreateDocumentDto) {
    const docType = await dtRepo.findById(dto.documentTypeId, companyId);
    if (!docType) throw new NotFoundError('Document type');
    if (!docType.isActive) throw new AppError('Document type is inactive', 422, 'INACTIVE_TYPE');

    const code = await repo.getNextCode(companyId, docType.id, docType.prefix);

    const doc = await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          companyId,
          code,
          title: dto.title,
          description: dto.description,
          documentTypeId: dto.documentTypeId,
          area: dto.area,
          process: dto.process,
          product: dto.product,
          confidentiality: dto.confidentiality,
          validityStart: dto.validityStart,
          validityEnd: dto.validityEnd,
          tags: dto.tags,
          ownerId,
          status: 'draft',
          currentVersion: 'Rev.00',
        },
        include: {
          documentType: { select: { id: true, name: true, code: true, prefix: true } },
          owner: { select: { id: true, name: true, email: true } },
          fileObjects: { take: 1 },
          _count: { select: { versions: true, fileObjects: true } },
        },
      });

      await tx.documentStatusHistory.create({
        data: { documentId: document.id, companyId, userId: ownerId, toStatus: 'draft', comment: 'Document created' },
      });

      await tx.documentVersion.create({
        data: {
          documentId: document.id,
          companyId,
          versionCode: 'Rev.00',
          versionNumber: 0,
          reason: 'Initial version',
          status: 'draft',
          createdById: ownerId,
          snapshotData: {
            title: document.title,
            description: document.description,
            area: document.area,
            process: document.process,
            product: document.product,
            confidentiality: document.confidentiality,
          },
        },
      });

      return document;
    });

    logger.info({ msg: 'Document created', documentId: doc.id, code, companyId });
    return doc;
  }

  async update(id: string, companyId: string, _userId: string, dto: UpdateDocumentDto) {
    const doc = await this.findById(id, companyId);
    if (doc.status === 'published' || doc.status === 'obsolete' || doc.status === 'cancelled') {
      throw new ForbiddenError(`Cannot edit a document with status "${doc.status}"`);
    }
    return repo.update(id, dto as Record<string, unknown>);
  }

  async changeStatus(id: string, companyId: string, userId: string, dto: ChangeStatusDto) {
    const doc = await this.findById(id, companyId);
    const allowed = ALLOWED_TRANSITIONS[doc.status];
    if (!allowed.includes(dto.status)) {
      throw new AppError(
        `Cannot transition from "${doc.status}" to "${dto.status}"`,
        422,
        'INVALID_STATUS_TRANSITION',
      );
    }

    const updated = await repo.update(id, { status: dto.status });
    await repo.addStatusHistory(id, companyId, userId, doc.status, dto.status, dto.comment);

    logger.info({ msg: 'Document status changed', documentId: id, from: doc.status, to: dto.status, userId });
    return updated;
  }

  async delete(id: string, companyId: string) {
    const doc = await this.findById(id, companyId);
    if (doc.status !== 'draft' && doc.status !== 'cancelled') {
      throw new ForbiddenError('Only draft or cancelled documents can be deleted');
    }
    for (const file of doc.fileObjects) {
      await deleteFile(file.storagePath).catch((err) =>
        logger.warn({ msg: 'Failed to delete MinIO object', path: file.storagePath, err }),
      );
    }
    await repo.delete(id);
    logger.info({ msg: 'Document deleted', documentId: id, companyId });
  }

  async uploadFile(documentId: string, companyId: string, userId: string, file: Express.Multer.File) {
    const doc = await this.findById(documentId, companyId);
    if (doc.status === 'published' || doc.status === 'obsolete' || doc.status === 'cancelled') {
      throw new ForbiddenError('Cannot upload file to a finalized document');
    }

    const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const storagePath = `${companyId}/documents/${documentId}/${Date.now()}-${checksum}.${ext}`;

    await uploadFile(storagePath, file.buffer, file.mimetype);

    const fileObj = await prisma.fileObject.create({
      data: {
        companyId,
        documentId,
        originalName: file.originalname,
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        checksum,
        uploadedBy: userId,
      },
    });

    logger.info({ msg: 'File uploaded', documentId, fileId: fileObj.id, size: file.size });
    return { ...fileObj, sizeBytes: Number(fileObj.sizeBytes) };
  }

  async getFileUrl(documentId: string, companyId: string, fileId: string) {
    const doc = await this.findById(documentId, companyId);
    const fileObj = doc.fileObjects.find((f: { id: string }) => f.id === fileId);
    if (!fileObj) throw new NotFoundError('File');
    const url = await getPresignedUrl((fileObj as unknown as { storagePath: string }).storagePath);
    return { url, expiresIn: 3600 };
  }
}
