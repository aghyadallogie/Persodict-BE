import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsRepository } from './repository/settings.repository';

@Module({
    controllers: [SettingsController],
    providers: [SettingsService, SettingsRepository, PrismaService],
    exports: [SettingsService],
})
export class SettingsModule { }