import { NextFunction, Request, Response } from 'express';
import { UnauthorizedException } from '../exceptions/unauthorized';
import { ErrorCode } from '../exceptions/root';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../secrets';
import { prismaClient } from '..';

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization;

  if (!token) {
    next(new UnauthorizedException('Unauthorized', ErrorCode.UNAUTHORIZED));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;

    const user = await prismaClient.user.findFirst({
      where: {
        id: payload.userId,
      },
    });

    if (!user) {
      next(new UnauthorizedException('Unauthorized', ErrorCode.UNAUTHORIZED));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new UnauthorizedException('Unauthorized', ErrorCode.UNAUTHORIZED));
  }
};

export default authMiddleware;
