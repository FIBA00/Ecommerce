/**
 * [EDUCATIONAL NOTE: Auth Register DTO]
 * 
 * 1. Architecture Role:
 *    Data Transfer Object (DTO) defining the strict contract for user registration.
 *    Decorated with class-validator annotations to automatically reject malformed requests
 *    at the controller boundary via NestJS ValidationPipe.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Maps to Next.js register form schema (`registerSchema` via Zod in frontend/src/lib/schemas/auth.schema.ts).
 *    - Sent in body of `authApi.useRegisterMutation({ email, password, name })`.
 * 
 * 3. Validation Rules:
 *    - `email`: Valid RFC 5322 email string.
 *    - `password`: Minimum 6 characters string.
 *    - `name`: Non-empty string.
 */

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Name cannot be empty' })
  name: string;
}
