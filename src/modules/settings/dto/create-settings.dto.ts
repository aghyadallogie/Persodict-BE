import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class CreateSettingsDto {
  @ApiProperty({ example: 'userId' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: ['de', 'fr'] })
  @IsArray()
  @IsString({ each: true })
  userLangs!: string[];
}
