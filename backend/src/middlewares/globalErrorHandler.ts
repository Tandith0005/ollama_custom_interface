import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';


// Custom App Error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = 500;
  let message = 'Something went wrong';
  let errorDetails: any = undefined;

  // Log error
  logger.error(`Error: ${err.message}`, {
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;

    return res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    
    errorDetails = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return res.status(statusCode).json({
      success: false,
      message,
      errors: errorDetails,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle fetch/network errors (Ollama API)
  if (err instanceof TypeError && err.message.includes('fetch')) {
    statusCode = 503;
    message = 'Ollama service is unavailable. Make sure it\'s running on localhost:11434';
    
    return res.status(statusCode).json({
      success: false,
      message,
      details: 'Please ensure Ollama is installed and running',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload';
    
    return res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle rate limiting or timeout errors from Ollama
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'Request to Ollama timed out. The model might be loading.';
    
    return res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Default error response
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : message,
    ...(errorDetails && { details: errorDetails }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// Async wrapper to catch errors in route handlers
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};