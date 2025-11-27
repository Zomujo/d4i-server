import 'express-async-errors';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { registerRoutes } from './routes/index.js';

export function createServer() {
  const app = express();

  app.set('trust proxy', true);

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false
    })
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN ?? true,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(compression());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  registerRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

