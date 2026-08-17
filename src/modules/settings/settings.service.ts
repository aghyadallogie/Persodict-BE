import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Settings } from './domain/settings.model';
import { CreateSettingsDto } from './dto/create-settings.dto';
import { SettingsRepository } from './repository/settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  async create(data: CreateSettingsDto): Promise<Settings> {
    if (!data.userLangs?.length) {
      throw new BadRequestException('At least one language is required');
    }
    return this.repo.create(data);
  }

  async getByUserId(userId: string): Promise<Settings> {
    const settings = await this.repo.findByUserId(userId);
    if (!settings) {
      throw new NotFoundException(`Settings not found for user ${userId}`);
    }
    return settings;
  }
}
