/**
 * [EDUCATIONAL NOTE: NestJS OrdersController]
 * 
 * 1. Architecture Role:
 *    Exposes order history and checkout endpoints at `/api/orders`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - `POST /api/orders/checkout` -> `ordersApi.useCheckoutMutation()`
 *    - `GET  /api/orders`          -> `ordersApi.useGetOrdersQuery()`
 *    - `GET  /api/orders/:id`      -> `ordersApi.useGetOrderByIdQuery(id)`
 * 
 * 3. Security:
 *    - Protected by `JwtAuthGuard`.
 *    - Injects authenticated user via `@CurrentUser()`.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  async checkout(
    @CurrentUser() user: User,
    @Body() checkoutDto: CheckoutDto,
  ) {
    return this.ordersService.checkout(user.id, checkoutDto);
  }

  @Get()
  async getOrders(@CurrentUser() user: User) {
    return this.ordersService.findAllForUser(user.id);
  }

  @Get(':id')
  async getOrderById(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }))
    id: string,
  ) {
    return this.ordersService.findOne(user.id, id, user.role);
  }
}
