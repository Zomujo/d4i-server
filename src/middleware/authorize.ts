import createHttpError from 'http-errors';
import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../types/index.js';

export function authorize(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw createHttpError(401, 'Unauthenticated');
    }

    if (!roles.includes(req.user.role)) {
      throw createHttpError(403, 'Forbidden');
    }

    next();
  };
}

