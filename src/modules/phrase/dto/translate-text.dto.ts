import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Longest text accepted. Each character is billed by DeepL once per target language. */
export const MAX_TEXT_LENGTH = 50;

export class TranslateTextDto {
  @ApiProperty({ example: 'Hello, how are you?', maxLength: MAX_TEXT_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TEXT_LENGTH)
  text!: string;
}
