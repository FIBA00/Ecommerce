/**
 * [EDUCATIONAL NOTE: NestJS UsersModule]
 * 
 * 1. Architecture Role:
 *    Encapsulates user profile features and repository wiring.
 * 
 * 2. TypeORM Integration:
 *    - Registers `TypeOrmModule.forFeature([User])` to provide `userRepository`.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
