import { Queue, Worker, Job } from 'bullmq';
import { redis } from './redis';
import { logger } from '../shared/logger/logger';
import { prisma } from './database';
import { AlertsRepository } from '../modules/alerts/alerts.repository';

export const QUEUES = {
  APPROVAL_REMINDER: 'approval-reminder',
  DOCUMENT_EXPIRY: 'document-expiry',
  ALERTS_CRON: 'alerts-cron',
} as const;

export function createQueue(name: string) {
  return new Queue(name, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });
}

export const approvalReminderQueue = createQueue(QUEUES.APPROVAL_REMINDER);

export type ApprovalReminderPayload = {
  approvalRequestId: string;
  documentId: string;
  documentTitle: string;
  stepName: string;
  approverEmail?: string;
  companyId: string;
};

export async function scheduleApprovalReminder(payload: ApprovalReminderPayload, delayMs = 0) {
  await approvalReminderQueue.add('remind', payload, {
    delay: delayMs,
    jobId: `reminder-${payload.approvalRequestId}-${Date.now()}`,
  });
}

export function startApprovalReminderWorker() {
  const worker = new Worker<ApprovalReminderPayload>(
    QUEUES.APPROVAL_REMINDER,
    async (job: Job<ApprovalReminderPayload>) => {
      const { approvalRequestId, documentTitle, stepName, approverEmail } = job.data;
      logger.info({
        msg: 'Approval reminder fired',
        approvalRequestId,
        documentTitle,
        stepName,
        approverEmail,
      });
      // TODO Phase 6: Send email/notification via notification service
    },
    { connection: redis, concurrency: 5 },
  );

  worker.on('completed', (job) => logger.debug({ msg: 'Reminder job completed', id: job.id }));
  worker.on('failed', (job, err) => logger.error({ msg: 'Reminder job failed', id: job?.id, err }));

  return worker;
}

// ─── Alerts Cron ─────────────────────────────────────────────────────────────

const alertsCronQueue = createQueue(QUEUES.ALERTS_CRON);

export async function scheduleAlertsCron() {
  await alertsCronQueue.add(
    'check-document-expiry',
    {},
    {
      repeat: { pattern: '0 8 * * *' }, // daily at 08:00
      jobId: 'daily-expiry-check',
    },
  );
  await alertsCronQueue.add(
    'check-overdue-readings',
    {},
    {
      repeat: { pattern: '0 9 * * *' }, // daily at 09:00
      jobId: 'daily-reading-check',
    },
  );
  logger.info({ msg: 'Alerts cron jobs scheduled' });
}

export function startAlertsCronWorker() {
  const alertsRepo = new AlertsRepository();

  const worker = new Worker(
    QUEUES.ALERTS_CRON,
    async (job: Job) => {
      if (job.name === 'check-document-expiry') {
        await checkDocumentExpiry(alertsRepo);
      } else if (job.name === 'check-overdue-readings') {
        await checkOverdueReadings(alertsRepo);
      }
    },
    { connection: redis, concurrency: 1 },
  );

  worker.on('completed', (job) => logger.info({ msg: `Cron job completed: ${job.name}` }));
  worker.on('failed', (job, err) => logger.error({ msg: `Cron job failed: ${job?.name}`, err }));

  return worker;
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
      include: { owner: { select: { id: true } }, company: { select: { id: true } } },
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
    include: { user: { select: { id: true } }, document: { select: { title: true, code: true } } },
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
  }

  logger.info({ msg: 'Overdue readings check completed', count: overdue.length });
}
