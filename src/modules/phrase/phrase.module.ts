import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { PhraseController } from './phrase.controller';
import { PhraseService } from './phrase.service';
import { PhraseRepository } from './repository/phrase.repository';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [PhraseController],
  providers: [PhraseService, PhraseRepository],
})
export class PhraseModule {}
