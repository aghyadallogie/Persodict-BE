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
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PassportJwtAuthGuard } from './guards/passport-jwt.guard';
import { PassportLocalGuard } from './guards/passport-local.guard';
import type { AuthenticatedRequest } from './types/authenticated-request.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /* ---------- login ---------- */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PassportLocalGuard)
  login(@Body() body: LoginDto) {
    return this.authService.authenticate({
      email: body.email,
      password: body.password,
    });
  }

  /* ---------- login / sign up with Google ---------- */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Signed in with Google (account created on first use)',
  })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  googleLogin(@Body() dto: GoogleAuthDto) {
    return this.authService.authenticateWithGoogle(dto.idToken);
  }

  /* ---------- whoami ---------- */
  @Get('me')
  @UseGuards(PassportJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  /* ---------- register ---------- */
  @Post('register')
  @ApiResponse({ status: 201, description: 'User registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
