import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

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
        // The client only sees a generic 500, so record the real cause server-side.
        this.logger.error(
          `Unhandled Prisma error ${exception.code}: ${exception.message}`,
          exception.stack,
        );
        return response
          .status(500)
          .json({ statusCode: 500, message: 'Internal server error' });
      }
    }
  }
}
