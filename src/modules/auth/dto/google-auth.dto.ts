import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description:
      'Google ID token obtained by the mobile app (audience: the Web OAuth client ID)',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
