import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from './repository/user.repository';
import { UserService } from './user.service';

/**
 * Deliberately has no controller: users are created and read only through the auth endpoints
 * (`/auth/register`, `/auth/google`, `/auth/me`). A `/users` controller used to expose any user's
 * record, password hash included, to unauthenticated callers.
 */
@Module({
  providers: [UserService, UserRepository, PrismaService],
  exports: [UserService],
})
export class UserModule {}
