import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'aghy@persodict.io' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '1q2w3e4r' })
  @IsString()
  password!: string;
}
