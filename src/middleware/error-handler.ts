import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { logger } from '../logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const error =
    err instanceof createHttpError.HttpError
      ? err
      : createHttpError(500, 'Unexpected error occurred', { cause: err });

  if (error.status >= 500) {
    logger.error({ err: error }, 'unhandled server error');
  } else {
    logger.warn({ err: error }, 'request failed');
  }

  res.status(error.status).json({
    error: {
      message: error.message,
      status: error.status,
      details: error.cause ? serializeError(error.cause) : undefined
    }
  });
}

function serializeError(cause: unknown) {
  if (!cause || typeof cause !== 'object') {
    return cause;
  }

  const { message, stack, ...rest } = cause as Record<string, unknown>;
  return {
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : stack,
    ...rest
  };
}

