import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserRepository } from './repository/user.repository';
import { UserService } from './user.service';

/**
 * Deliberately has no controller: users are created and read only through the auth endpoints
 * (`/auth/register`, `/auth/google`, `/auth/me`). A `/users` controller used to expose any user's
 * record, password hash included, to unauthenticated callers.
 */
@Module({
  imports: [PrismaModule],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
