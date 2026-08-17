import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'aghy@persodict.io' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '1q2w3e4r' })
  @IsString()
  password!: string;

  @ApiProperty({ example: 'Aghy', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
