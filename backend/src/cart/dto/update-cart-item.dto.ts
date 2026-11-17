/**
 * [EDUCATIONAL NOTE: UpdateCartItem DTO]
 * 
 * 1. Architecture Role:
 *    Validates the payload when a user alters the quantity of an existing cart line item.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Triggered by `+` / `-` buttons or numeric input in `CartItemRow`.
 *    - Transmitted via `cartApi.useUpdateCartQuantityMutation({ itemId, quantity })`.
 */

import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity cannot be negative' })
  quantity: number;
}
