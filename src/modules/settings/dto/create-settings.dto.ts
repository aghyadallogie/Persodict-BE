import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn } from 'class-validator';
import { SUPPORTED_LANGS } from '../supported-langs';

/**
 * Deliberately has no `userId`: settings always belong to the logged-in user (taken from the JWT),
 * never to whoever the request body names. A client that still sends `userId` is not rejected; the
 * global ValidationPipe (`whitelist: true`) simply drops it.
 */
export class CreateSettingsDto {
  @ApiProperty({ example: ['de', 'fr'], enum: SUPPORTED_LANGS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(SUPPORTED_LANGS.length)
  @IsIn(SUPPORTED_LANGS, { each: true })
  userLangs!: string[];
}
