import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
    @ApiProperty({ example: 'aghy@persodict.io' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'Aghy', required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ minLength: 6, example: '1q2w3e4r' })
    @IsString()
    @MinLength(6)
    password!: string;
}