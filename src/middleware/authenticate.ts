import createHttpError from 'http-errors';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthenticatedUser } from '../types/index.js';

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw createHttpError(401, 'Missing authorization token');
  }

  const token = header.replace('Bearer ', '').trim();

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = payload;
    next();
  } catch (error) {
    throw createHttpError(401, 'Invalid or expired token', { cause: error });
  }
}

