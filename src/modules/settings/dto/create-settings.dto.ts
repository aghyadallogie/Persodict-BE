import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

/**
 * Deliberately has no `userId`: settings always belong to the logged-in user (taken from the JWT),
 * never to whoever the request body names. A client that still sends `userId` is not rejected; the
 * global ValidationPipe (`whitelist: true`) simply drops it.
 */
export class CreateSettingsDto {
  @ApiProperty({ example: ['de', 'fr'] })
  @IsArray()
  @IsString({ each: true })
  userLangs!: string[];
}
