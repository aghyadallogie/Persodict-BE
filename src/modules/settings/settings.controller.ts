import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { Settings } from "./domain/settings.model";
import { CreateSettingsDto } from "./dto/create-settings.dto";

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
    constructor(private readonly service: SettingsService) { }

    @Post()
    @ApiResponse({ status: 201, description: 'Settings registered' })
    async create(@Body() dto: CreateSettingsDto): Promise<Settings> {
        return this.service.create({
            userId: dto.userId,
            userLangs: dto.userLangs,
        });
    }

    @Get(':userId')
    @ApiResponse({ status: 200, description: 'Settings found' })
    @ApiResponse({ status: 404, description: 'Settings not found' })
    async getByUserId(@Param('userId') userId: string): Promise<Settings | null> {
        return this.service.getByUserId(userId);
    }
}