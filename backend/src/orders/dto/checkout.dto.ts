/**
 * [EDUCATIONAL NOTE: Checkout DTO]
 * 
 * 1. Architecture Role:
 *    Validates the order checkout payload containing the customer shipping destination.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Validated in Next.js Checkout form (`checkoutSchema` via Zod).
 *    - Transmitted via `ordersApi.useCheckoutMutation({ shippingAddress })`.
 */

import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CheckoutDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Shipping address is required for checkout' })
  shippingAddress: string;
}
