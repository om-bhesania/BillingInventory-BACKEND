import { Request, Response, NextFunction } from 'express'; 
import { Prisma } from '@prisma/client'; 
import { logger } from '../../utils/logger';
import { ApiError } from '../../types';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('API Error:', error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle Prisma errors
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          message: 'A record with this value already exists.',
          code: error.code,
          field: (error.meta as any)?.target?.[0]
        });
      case 'P2014':
        return res.status(404).json({
          message: 'The required record was not found.',
          code: error.code
        });
      case 'P2003':
        return res.status(400).json({
          message: 'Invalid input data.',
          code: error.code,
          field: (error.meta as any)?.field_name
        });
      default:
        return res.status(500).json({
          message: 'Database error occurred.',
          code: error.code
        });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      message: 'Invalid input data.',
      error: error.message
    });
  }

  if ((error as ApiError).status) {
    return res.status((error as ApiError).status!).json({
      message: error.message,
      code: (error as ApiError).code
    });
  }

  // Default error
  return res.status(500).json({
    message: 'Internal server error.',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

/**
 * Create a typed error with status code
 */
export function createError(message: string, status: number, code?: string): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  return error;
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(handler: Function) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
