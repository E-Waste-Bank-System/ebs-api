import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
}; 