import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsModule } from '../settings/settings.module';
import { PhraseController } from './phrase.controller';
import { PhraseService } from './phrase.service';
import { PhraseRepository } from './repository/phrase.repository';

@Module({
  controllers: [PhraseController],
  providers: [PhraseService, PhraseRepository, PrismaService],
  imports: [SettingsModule],
})
export class PhraseModule { }
