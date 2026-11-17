/**
 * [EDUCATIONAL NOTE: AddCartItem DTO]
 * 
 * 1. Architecture Role:
 *    Validates the payload when a user adds a product to their shopping cart.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Triggered by `ProductCard` and `ProductDetailView` "Add to Cart" buttons.
 *    - Transmitted via `cartApi.useAddToCartMutation({ productId, quantity })`.
 */

import { IsNotEmpty, IsInt, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @IsUUID('all', { message: 'productId must be a valid UUID' })
  @IsNotEmpty({ message: 'productId is required' })
  productId: string;

  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number = 1;
}
