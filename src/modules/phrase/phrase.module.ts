import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { PhraseController } from './phrase.controller';
import { PhraseService } from './phrase.service';
import { PhraseRepository } from './repository/phrase.repository';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    // At most 10 translations per user per minute (applied by UserThrottlerGuard on the route).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
  ],
  controllers: [PhraseController],
  providers: [PhraseService, PhraseRepository],
})
export class PhraseModule {}
