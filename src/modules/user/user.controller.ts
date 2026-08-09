import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from './domain/user.model';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('users')
export class UserController {
    constructor(private readonly service: UserService) { }

    @Post()
    @ApiResponse({ status: 201, description: 'User registered' })
    async create(@Body() dto: CreateUserDto): Promise<User> {
        return this.service.register({
            email: dto.email,
            password: dto.password,
            name: dto.name ?? '',
        });
    }

    @Get(':id')
    async getOne(@Param('id') id: string): Promise<User | null> {
        return this.service.getById(id);
    }
}