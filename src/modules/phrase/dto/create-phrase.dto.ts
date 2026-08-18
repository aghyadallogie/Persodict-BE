import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class CreatePhraseDto {
  @IsString()
  @IsNotEmpty()
  authorId!: string;

  @IsObject()
  @IsNotEmpty()
  translations!: Record<string, string>;
}
