/**
 * [EDUCATIONAL NOTE: NestJS AuthController]
 * 
 * 1. Architecture Role:
 *    Handles incoming HTTP authentication requests at `/api/auth`.
 *    Delegates user authentication, session creation, and profile retrieval to `AuthService`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - `POST /api/auth/register` -> `authApi.useRegisterMutation()`
 *    - `POST /api/auth/login`    -> `authApi.useLoginMutation()`
 *    - `GET  /api/auth/me`       -> `authApi.useGetProfileQuery()`
 * 
 * 3. Security & Validation:
 *    - Global ValidationPipe automatically parses and verifies `RegisterDto` and `LoginDto`.
 *    - `GET /api/auth/me` is guarded by `JwtAuthGuard` and extracts user via `@CurrentUser()`.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }
}
