import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../shared/logger/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ msg: 'Redis error', err }));
redis.on('reconnecting', () => logger.warn('Redis reconnecting'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}
