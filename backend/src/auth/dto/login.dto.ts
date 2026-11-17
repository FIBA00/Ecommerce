/**
 * [EDUCATIONAL NOTE: Auth Login DTO]
 * 
 * 1. Architecture Role:
 *    Defines credentials payload expected by `POST /api/auth/login`.
 *    Ensures type safety and runtime sanitization before execution hits `AuthService`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Maps to Next.js login form schema (`loginSchema` via Zod).
 *    - Transmitted via `authApi.useLoginMutation({ email, password })`.
 * 
 * 3. Validation Rules:
 *    - `email`: Valid email format.
 *    - `password`: Non-empty string.
 */

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
