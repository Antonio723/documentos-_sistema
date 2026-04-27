import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './shared/logger/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { startSchedulers, stopSchedulers } from './config/queue';

async function bootstrap(): Promise<void> {
  try {
    await connectDatabase();
    startSchedulers();

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info({
        msg: `Server running`,
        port: env.PORT,
        env: env.NODE_ENV,
        docs: `http://localhost:${env.PORT}/api-docs`,
      });
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info({ msg: `${signal} received, shutting down gracefully` });
      server.close(async () => {
        stopSchedulers();
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });

      // Force close after 30s
      setTimeout(() => {
        logger.error('Could not close connections in time, forcing shutdown');
        process.exit(1);
      }, 30_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error({ msg: 'Unhandled Promise Rejection', reason });
    });

    process.on('uncaughtException', (err) => {
      logger.fatal({ msg: 'Uncaught Exception', err });
      process.exit(1);
    });
  } catch (err) {
    logger.fatal({ msg: 'Failed to start server', err });
    process.exit(1);
  }
}

bootstrap();
