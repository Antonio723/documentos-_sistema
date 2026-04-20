import crypto from 'crypto';
import { DistributionsRepository } from './distributions.repository';
import { DocumentsRepository } from '../documents/documents.repository';
import { CreateDistributionDto, DistributionFilterDto } from './dto/distribution.dto';
import { buildPaginatedResult } from '../../shared/utils/pagination';
import { AppError, NotFoundError, ForbiddenError } from '../../shared/errors/AppError';
import { getFileBuffer } from '../../config/minio';
import { env } from '../../config/env';
import { addWatermarkToPdf } from './watermark';

const repo = new DistributionsRepository();
const docsRepo = new DocumentsRepository();

function buildReadSignature(userId: string, distributionId: string, timestamp: string): string {
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${userId}|${distributionId}|read|${timestamp}`)
    .digest('hex');
}

export class DistributionsService {
  async distribute(documentId: string, companyId: string, sentById: string, dto: CreateDistributionDto) {
    const doc = await docsRepo.findById(documentId, companyId);
    if (!doc) throw new NotFoundError('Document');
    if (doc.status !== 'published') {
      throw new AppError('Apenas documentos publicados podem ser distribuídos', 422, 'INVALID_STATUS');
    }

    const results = [];
    for (const userId of dto.userIds) {
      const existing = await repo.findExisting(documentId, userId, doc.currentVersion);
      if (existing) continue;

      let copyNumber: number | undefined;
      if (dto.copyType === 'controlled') {
        copyNumber = await repo.getNextCopyNumber(documentId);
      }

      const dist = await repo.create({
        company: { connect: { id: companyId } },
        document: { connect: { id: documentId } },
        user: { connect: { id: userId } },
        sentBy: { connect: { id: sentById } },
        copyType: dto.copyType,
        copyNumber,
        version: doc.currentVersion,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
      });
      results.push(dist);
    }

    return results;
  }

  async findByDocument(documentId: string, companyId: string) {
    const doc = await docsRepo.findById(documentId, companyId);
    if (!doc) throw new NotFoundError('Document');
    return repo.findByDocument(documentId, companyId);
  }

  async findMine(userId: string, companyId: string, filters: DistributionFilterDto) {
    const { data, total } = await repo.findMine(userId, companyId, filters);
    return buildPaginatedResult(data, total, filters.page, filters.limit);
  }

  async findMyPending(userId: string, companyId: string) {
    return repo.findMyPending(userId, companyId);
  }

  async findById(id: string, companyId: string) {
    const dist = await repo.findById(id, companyId);
    if (!dist) throw new NotFoundError('Distribution');
    return dist;
  }

  async confirmReading(id: string, companyId: string, userId: string, ip: string, userAgent: string) {
    const dist = await repo.findById(id, companyId);
    if (!dist) throw new NotFoundError('Distribution');
    if (dist.userId !== userId) throw new ForbiddenError('Não é sua distribuição');

    const existing = await repo.findConfirmation(id);
    if (existing) throw new AppError('Leitura já confirmada', 409, 'ALREADY_CONFIRMED');

    const timestamp = new Date().toISOString();
    const signature = buildReadSignature(userId, id, timestamp);

    const confirmation = await repo.createConfirmation({
      distribution: { connect: { id } },
      companyId,
      user: { connect: { id: userId } },
      ip,
      userAgent,
      signature,
    });

    return confirmation;
  }

  async downloadWithWatermark(id: string, companyId: string, userId: string) {
    const dist = await repo.findById(id, companyId);
    if (!dist) throw new NotFoundError('Distribution');
    if (dist.userId !== userId) throw new ForbiddenError('Não é sua distribuição');

    const doc = await docsRepo.findById(dist.documentId, companyId);
    if (!doc) throw new NotFoundError('Document');

    const pdfFile = doc.fileObjects.find(f => f.mimeType === 'application/pdf');
    if (!pdfFile) throw new AppError('Nenhum arquivo PDF encontrado', 404, 'NO_PDF');

    const pdfBuffer = await getFileBuffer((pdfFile as any).storagePath);

    const watermarkText = [
      dist.copyType === 'controlled'
        ? `CÓPIA CONTROLADA Nº ${dist.copyNumber ?? '?'}`
        : 'CÓPIA NÃO CONTROLADA',
      `Destinatário: ${dist.user.name}`,
      `Documento: ${doc.code} — ${dist.version}`,
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
    ].join('\n');

    const watermarked = await addWatermarkToPdf(pdfBuffer, watermarkText);

    return {
      buffer: watermarked,
      filename: `${doc.code}_${dist.version}_${dist.copyType}.pdf`,
    };
  }
}
