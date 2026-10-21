import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsRepository } from './repository/settings.repository';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository, PrismaService],
  exports: [SettingsService],
})
export class SettingsModule { }
