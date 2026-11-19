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

  /** Saves the logged-in user's languages. The user comes from the token, never from the body. */
  @Post()
  @ApiResponse({ status: 201, description: 'Settings registered' })
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateSettingsDto,
  ): Promise<Settings> {
    return this.service.create(userId, dto.userLangs);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Settings found' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async getMine(@CurrentUser() userId: string): Promise<Settings | null> {
    return this.service.getByUserId(userId);
  }
}
