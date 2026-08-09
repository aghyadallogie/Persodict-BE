import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PassportJwtAuthGuard } from './guards/passport-jwt.guard';
import { PassportLocalGuard } from './guards/passport-local.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /* ---------- login ---------- */
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(PassportLocalGuard)
    login(@Body() body: LoginDto) {
        return this.authService.authenticate({ email: body.email, password: body.password });
    }

    /* ---------- whoami ---------- */
    @Get('me')
    @UseGuards(PassportJwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    getProfile(@Request() req: any) {
        return req.user;
    }

    /* ---------- register ---------- */
    @Post('register')
    @ApiResponse({ status: 201, description: 'User registered' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }
}