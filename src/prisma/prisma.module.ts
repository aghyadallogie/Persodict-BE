import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Owns the app's one Prisma client. Feature modules that need the database import this module
 * instead of listing `PrismaService` in their own `providers`: Nest creates one instance per
 * module that provides a class, so that would open a separate client (and connection pool) in
 * each. A module is only instantiated once however many modules import it, so everyone shares
 * this single `PrismaService`.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
