/**
 * [EDUCATIONAL NOTE: NestJS UsersService]
 * 
 * 1. Architecture Role:
 *    Manages user profile data and persistence.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Service layer fulfilling `GET /api/users/profile` and `PATCH /api/users/profile`.
 *    - Allows users to maintain their shipping address for one-click checkout.
 * 
 * 3. TypeORM Repository Pattern:
 *    - Direct manipulation of `userRepository` with safe column exclusion.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['orders'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...sanitized } = user;
    return sanitized;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateProfileDto.name !== undefined) {
      user.name = updateProfileDto.name.trim();
    }

    if (updateProfileDto.address !== undefined) {
      user.address = updateProfileDto.address;
    }

    const updated = await this.userRepository.save(user);
    const { password, ...sanitized } = updated;
    return sanitized;
  }
}
