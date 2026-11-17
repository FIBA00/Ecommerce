/**
 * [EDUCATIONAL NOTE: NestJS AuthModule]
 * 
 * 1. Architecture Role:
 *    Organizes all authentication components (Controller, Service, JWT Strategy, Guard).
 *    Configures Passport and JwtModule asynchronously using ConfigService.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Exports `JwtAuthGuard` and `PassportModule` so other modules (Users, Cart, Orders)
 *      can protect their endpoints using the same authentication context.
 * 
 * 3. TypeORM Integration:
 *    - Imports TypeOrmModule.forFeature([User, Cart]) to inject repositories into AuthService.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { Cart } from '../cart/entities/cart.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Cart]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'supersecretjwtkey12345'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtStrategy, JwtAuthGuard, PassportModule, JwtModule],
})
export class AuthModule {}
