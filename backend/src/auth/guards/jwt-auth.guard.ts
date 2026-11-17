/**
 * [EDUCATIONAL NOTE: NestJS JWT Auth Guard]
 * 
 * 1. Architecture Role:
 *    Route guard that enforces authentication on endpoints.
 *    Extends `@nestjs/passport`'s `AuthGuard('jwt')`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Applied with `@UseGuards(JwtAuthGuard)` to protect private routes:
 *      - `/api/auth/me`
 *      - `/api/users/profile`
 *      - `/api/cart/*`
 *      - `/api/orders/*`
 *    - If request lacks a valid Bearer token, automatically responds with HTTP 401 Unauthorized.
 *    - Next.js RTK Query catches 401 and can trigger automatic logout / redirect to `/auth/login`.
 */

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication token is missing or invalid');
    }
    return user;
  }
}
