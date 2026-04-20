import { AlertsRepository } from './alerts.repository';
import { NotFoundError } from '../../shared/errors/AppError';

const repo = new AlertsRepository();

export class AlertsService {
  async findMine(userId: string, companyId: string) {
    return repo.findMine(userId, companyId);
  }

  async countUnread(userId: string, companyId: string) {
    return repo.countUnread(userId, companyId);
  }

  async markRead(id: string, userId: string, _companyId: string) {
    const updated = await repo.markRead(id, userId);
    if (updated.count === 0) throw new NotFoundError('Alert');
    return { success: true };
  }

  async markAllRead(userId: string, companyId: string) {
    await repo.markAllRead(userId, companyId);
    return { success: true };
  }
}
