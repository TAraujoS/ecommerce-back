import { NextFunction, Request, Response } from 'express';
import { ErrorCode, HttpException } from './exceptions/root';
import { InternalException } from './exceptions/internal-exception';
import { ZodError } from 'zod';

export const errorHandler = (
  method: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await method(req, res, next);
    } catch (error: any) {
      let exception: HttpException;
      if (error instanceof HttpException) {
        exception = error;
      } else {
        if (error instanceof ZodError) {
          const zodErrors = error.errors.map((e) => ({
            path: e.path,
            message: e.message,
          }));

          exception = new InternalException(
            'Unprocessable Entity',
            zodErrors,
            ErrorCode.UNPROCESSABLE_ENTITY,
          );
        } else {
          exception = new InternalException(
            'Something went wrong',
            error,
            ErrorCode.INTERNAL_EXCEPTION,
          );
        }
      }
      next(exception);
    }
  };
};
