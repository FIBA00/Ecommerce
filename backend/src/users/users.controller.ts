/**
 * [EDUCATIONAL NOTE: NestJS UsersController]
 * 
 * 1. Architecture Role:
 *    Exposes user profile management endpoints under `/api/users`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - `GET   /api/users/profile` -> `usersApi.useGetProfileQuery()`
 *    - `PATCH /api/users/profile` -> `usersApi.useUpdateProfileMutation()`
 * 
 * 3. Security:
 *    - Protected by `JwtAuthGuard` ensuring only the authenticated account owner
 *      can view or update their profile data.
 */

import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }
}
