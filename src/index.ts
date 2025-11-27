import { createServer } from './server';
import { env } from './config/env';
import { logger } from './logger';
import { sql } from './db/client';

async function main() {
  await verifyDatabaseConnection();
  const app = createServer();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'dial4inclusion server listening');
  });

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, () => {
      logger.info({ signal }, 'shutting down server');
      server.close(() => {
        logger.info('server closed gracefully');
        process.exit(0);
      });
    });
  });
}

main().catch((error) => {
  logger.error({ error }, 'fatal error while bootstrapping server');
  process.exit(1);
});

async function verifyDatabaseConnection() {
  try {
    await sql`SELECT 1`;
    logger.info('database connection verified');
  } catch (error) {
    logger.error({ error }, 'failed to connect to database');
    throw error;
  }
}

