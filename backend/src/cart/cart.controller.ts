/**
 * [EDUCATIONAL NOTE: NestJS CartController]
 * 
 * 1. Architecture Role:
 *    Exposes authenticated shopping cart endpoints under `/api/cart`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - `GET    /api/cart`                -> `cartApi.useGetCartQuery()`
 *    - `POST   /api/cart/items`          -> `cartApi.useAddToCartMutation()`
 *    - `PATCH  /api/cart/items/:itemId`  -> `cartApi.useUpdateCartQuantityMutation()`
 *    - `DELETE /api/cart/items/:itemId`  -> `cartApi.useRemoveCartItemMutation()`
 *    - `DELETE /api/cart`                -> `cartApi.useClearCartMutation()`
 * 
 * 3. Security:
 *    - Entire controller is locked behind `JwtAuthGuard`.
 *    - User context is cleanly extracted using `@CurrentUser()`.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser() user: User) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  async addItem(@CurrentUser() user: User, @Body() addDto: AddCartItemDto) {
    return this.cartService.addItem(user.id, addDto);
  }

  @Patch('items/:itemId')
  async updateItem(
    @CurrentUser() user: User,
    @Param('itemId', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }))
    itemId: string,
    @Body() updateDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, updateDto);
  }

  @Delete('items/:itemId')
  async removeItem(
    @CurrentUser() user: User,
    @Param('itemId', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }))
    itemId: string,
  ) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete()
  async clearCart(@CurrentUser() user: User) {
    return this.cartService.clearCart(user.id);
  }
}
