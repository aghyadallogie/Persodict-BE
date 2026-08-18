import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    switch (exception.code) {
      case 'P2025': {
        const notFound = new NotFoundException('Record not found');
        return response
          .status(notFound.getStatus())
          .json(notFound.getResponse());
      }
      case 'P2002': {
        const conflict = new ConflictException('Resource already exists');
        return response
          .status(conflict.getStatus())
          .json(conflict.getResponse());
      }
      default: {
        return response
          .status(500)
          .json({ statusCode: 500, message: 'Internal server error' });
      }
    }
  }
}
