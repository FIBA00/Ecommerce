/**
 * [EDUCATIONAL NOTE: NestJS CurrentUser Param Decorator]
 * 
 * 1. Architecture Role:
 *    Custom parameter decorator allowing controllers to extract the authenticated `User` entity
 *    directly from the HTTP request execution context without manually accessing `req.user`.
 * 
 * 2. Usage in Controllers:
 *    ```typescript
 *    @Get('me')
 *    @UseGuards(JwtAuthGuard)
 *    getMe(@CurrentUser() user: User) {
 *      return user;
 *    }
 *    ```
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
