import { z } from 'zod';

/**
 * [EDUCATIONAL NOTE: Checkout Form Validation Schema]
 * 
 * 1. Architecture Role:
 *    Validates the customer delivery and payment details during final checkout.
 *    Enforces non-empty delivery address before invoking the atomic checkout mutation.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Validates React Hook Form in `frontend/src/app/checkout/page.tsx`
 *    - Transmitted via `ordersApi.useCheckoutMutation({ shippingAddress })`
 *    - Directly mirrors NestJS `CheckoutDto` (`backend/src/orders/dto/checkout.dto.ts` @IsNotEmpty)
 *    - Persisted into `orders.shipping_address` table column in PostgreSQL.
 * 
 * 3. State & Validation Mechanics:
 *    - fullName: minimum 2 characters.
 *    - shippingAddress: minimum 5 non-whitespace characters.
 *    - paymentMethod: 'cod' | 'card' default 'cod'.
 */

export const checkoutSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters long'),
  shippingAddress: z
    .string()
    .min(5, 'Shipping address must be at least 5 characters long')
    .refine((val) => val.trim().length >= 5, {
      message: 'Shipping address cannot be only whitespace',
    }),
  paymentMethod: z
    .enum(['cod', 'card'])
    .default('cod'),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
