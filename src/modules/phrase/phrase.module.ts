import { Module } from '@nestjs/common';
import { PhraseService } from './phrase.service';
import { PhraseController } from './phrase.controller';
import { SettingsModule } from '../settings/settings.module';
import { PhraseRepository } from './repository/phrase.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PhraseController],
  providers: [PhraseService, PhraseRepository, PrismaService],
  imports: [SettingsModule],
})
export class PhraseModule {}
