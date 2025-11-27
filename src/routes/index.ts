import { Express } from 'express';
import { authRouter } from './auth';
import { complaintsRouter } from './complaints';
import { healthRouter } from './health';
import { usersRouter } from './users';

export function registerRoutes(app: Express) {
  app.use('/api', healthRouter());
  app.use('/api', authRouter());
  app.use('/api', complaintsRouter());
  app.use('/api', usersRouter());
}

