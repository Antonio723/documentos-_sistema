import * as cron from 'node-cron';
import { logger } from '../shared/logger/logger';
import { prisma } from './database';
import { env } from './env';
import { AlertsRepository } from '../modules/alerts/alerts.repository';
import {
  sendMail,
  approvalReminderTemplate,
  documentExpiryTemplate,
  overdueReadingTemplate,
} from '../shared/email/email.service';

const APP_URL = env.CORS_ORIGINS.split(',')[0].trim();

export type ApprovalReminderPayload = {
  approvalRequestId: string;
  documentId: string;
  documentTitle: string;
  stepName: string;
  approverEmail?: string | string[];
  companyId: string;
};

export function scheduleApprovalReminder(payload: ApprovalReminderPayload, delayMs = 0): void {
  setTimeout(async () => {
    logger.info({
      msg: 'Approval reminder fired',
      approvalRequestId: payload.approvalRequestId,
      documentTitle: payload.documentTitle,
      stepName: payload.stepName,
      approverEmail: payload.approverEmail,
    });

    if (payload.approverEmail) {
      const tpl = approvalReminderTemplate({
        documentTitle: payload.documentTitle,
        stepName: payload.stepName,
        approvalRequestId: payload.approvalRequestId,
        appUrl: APP_URL,
      });
      await sendMail({ to: payload.approverEmail, ...tpl });
    }
  }, delayMs);
}

let documentExpiryCron: cron.ScheduledTask | null = null;
let overdueReadingsCron: cron.ScheduledTask | null = null;

export function startSchedulers(): void {
  const alertsRepo = new AlertsRepository();

  documentExpiryCron = cron.schedule('0 8 * * *', async () => {
    try {
      await checkDocumentExpiry(alertsRepo);
    } catch (err) {
      logger.error({ msg: 'Document expiry check failed', err });
    }
  });

  overdueReadingsCron = cron.schedule('0 9 * * *', async () => {
    try {
      await checkOverdueReadings(alertsRepo);
    } catch (err) {
      logger.error({ msg: 'Overdue readings check failed', err });
    }
  });

  logger.info({ msg: 'Schedulers started' });
}

export function stopSchedulers(): void {
  documentExpiryCron?.stop();
  overdueReadingsCron?.stop();
}

async function checkDocumentExpiry(alertsRepo: AlertsRepository) {
  const now = new Date();
  const thresholds = [
    { days: 30, severity: 'info',     label: '30 dias' },
    { days: 15, severity: 'warning',  label: '15 dias' },
    { days: 7,  severity: 'warning',  label: '7 dias' },
    { days: 1,  severity: 'critical', label: '1 dia' },
  ];

  for (const { days, severity, label } of thresholds) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + days);
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    const docs = await prisma.document.findMany({
      where: { validityEnd: { gte: dayStart, lte: dayEnd }, status: 'published' },
      include: {
        owner: { select: { id: true, email: true } },
        company: { select: { id: true } },
      },
    });

    for (const doc of docs) {
      const alreadySent = await alertsRepo.existsByResourceAndType(doc.ownerId, doc.id, 'validity_expiry');
      if (alreadySent) continue;

      await alertsRepo.create({
        company: { connect: { id: doc.companyId } },
        user:    { connect: { id: doc.ownerId } },
        type:    'validity_expiry',
        severity,
        title:   `Validade expirando em ${label}`,
        message: `O documento "${doc.title}" (${doc.code}) expira em ${label}.`,
        resourceId:   doc.id,
        resourceType: 'document',
      });

      const tpl = documentExpiryTemplate({
        documentTitle: doc.title,
        documentCode: doc.code,
        label,
        appUrl: APP_URL,
      });
      await sendMail({ to: doc.owner.email, ...tpl });
    }
  }

  logger.info({ msg: 'Document expiry check completed' });
}

async function checkOverdueReadings(alertsRepo: AlertsRepository) {
  const now = new Date();

  const overdue = await prisma.documentDistribution.findMany({
    where: {
      dueDate: { lt: now },
      isActive: true,
      confirmation: null,
    },
    include: {
      user: { select: { id: true, email: true } },
      document: { select: { title: true, code: true } },
    },
  });

  for (const dist of overdue) {
    const alreadySent = await alertsRepo.existsByResourceAndType(dist.userId, dist.id, 'read_overdue');
    if (alreadySent) continue;

    await alertsRepo.create({
      company: { connect: { id: dist.companyId } },
      user:    { connect: { id: dist.userId } },
      type:    'read_overdue',
      severity: 'warning',
      title:   'Leitura de documento em atraso',
      message: `Você ainda não confirmou a leitura do documento "${dist.document.title}" (${dist.document.code}).`,
      resourceId:   dist.id,
      resourceType: 'distribution',
    });

    const tpl = overdueReadingTemplate({
      documentTitle: dist.document.title,
      documentCode: dist.document.code,
      appUrl: APP_URL,
    });
    await sendMail({ to: dist.user.email, ...tpl });
  }

  logger.info({ msg: 'Overdue readings check completed', count: overdue.length });
}
