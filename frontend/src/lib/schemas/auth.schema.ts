import { z } from 'zod';

/**
 * [EDUCATIONAL NOTE: Auth Form Validation Schemas]
 * 
 * 1. Architecture Role:
 *    Defines client-side validation schemas for user login and registration forms using Zod.
 *    Provides early client feedback before network requests are dispatched via RTK Query.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Validates forms in `src/app/auth/login/page.tsx` and `src/app/auth/register/page.tsx`
 *    - Transmitted via `authApi.useLoginMutation()` and `authApi.useRegisterMutation()`
 *    - Directly mirrors NestJS DTOs:
 *      * Login: `backend/src/auth/dto/login.dto.ts` (@IsEmail, @IsNotEmpty)
 *      * Register: `backend/src/auth/dto/register.dto.ts` (@IsEmail, @MinLength(6), @IsNotEmpty)
 * 
 * 3. State & Validation Mechanics:
 *    - Inferred TypeScript types guarantee type-safety between React Hook Form and API requests.
 */

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please provide a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
