/**
 * [EDUCATIONAL NOTE: Passport JWT Strategy]
 * 
 * 1. Architecture Role:
 *    Passport strategy for verifying Bearer JSON Web Tokens in incoming HTTP request headers.
 *    Extends `PassportStrategy(Strategy)` and is registered as a NestJS provider in `AuthModule`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Next.js stores the issued `accessToken` in localStorage or Redux state.
 *    - In `baseQuery` (RTK Query), every authenticated request attaches:
 *      `Authorization: Bearer <accessToken>`.
 *    - This strategy extracts and decrypts that header automatically.
 * 
 * 3. Security Flow:
 *    - Verifies token signature against `JWT_SECRET`.
 *    - Decodes payload `{ sub: userId, email: userEmail, role: userRole }`.
 *    - Injects the decoded user object directly into `req.user` for controller handlers.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'supersecretjwtkey12345'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    return user;
  }
}
