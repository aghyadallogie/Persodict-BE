import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Settings } from './domain/settings.model';
import { CreateSettingsDto } from './dto/create-settings.dto';
import { PassportJwtAuthGuard } from '../auth/guards/passport-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('settings')
@ApiBearerAuth('JWT-auth')
@UseGuards(PassportJwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Settings registered' })
  async create(@Body() dto: CreateSettingsDto): Promise<Settings> {
    return this.service.create({
      userId: dto.userId,
      userLangs: dto.userLangs,
    });
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Settings found' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async getMine(@CurrentUser() userId: string): Promise<Settings | null> {
    return this.service.getByUserId(userId);
  }
}
