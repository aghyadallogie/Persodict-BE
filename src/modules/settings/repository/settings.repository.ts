import { Injectable } from '@nestjs/common';
import { Settings } from '../domain/settings.model';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------- creators ---------- */
  async create(data: Omit<Settings, 'id'>): Promise<Settings> {
    const result = await this.prisma.settings.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        userLangs: data.userLangs,
      },
      update: {
        userLangs: data.userLangs,
      },
    });
    return this.toDomain(result);
  }

  /* ---------- readers ---------- */
  async findByUserId(userId: string): Promise<Settings | null> {
    const row = await this.prisma.settings.findUnique({ where: { userId } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: any): Settings {
    return {
      id: row.id,
      userId: row.userId,
      userLangs: row.userLangs,
    };
  }
}
