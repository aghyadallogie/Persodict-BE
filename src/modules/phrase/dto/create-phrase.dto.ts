import { IsString, IsNotEmpty, IsObject, MinLength } from 'class-validator';

export class CreatePhraseDto {
  @IsString()
  @IsNotEmpty()
  authorId!: string;

  @IsObject()
  @IsNotEmpty()
  translations!: Record<string, string>;
}
