import { Express } from 'express';
import { authRouter } from './auth.js';
import { complaintsRouter } from './complaints.js';
import { healthRouter } from './health.js';
import { usersRouter } from './users.js';

export function registerRoutes(app: Express) {
  app.use('/api', healthRouter());
  app.use('/api', authRouter());
  app.use('/api', complaintsRouter());
  app.use('/api', usersRouter());
}

