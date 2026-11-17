/**
 * [EDUCATIONAL NOTE: Users UpdateProfile DTO]
 * 
 * 1. Architecture Role:
 *    DTO for updating user account details (name and shipping address).
 *    Both fields are optional, enabling partial updates via HTTP PATCH.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Validated on Next.js profile page form (`profileSchema` via Zod).
 *    - Submitted through `usersApi.useUpdateProfileMutation({ name, address })`.
 */

import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
