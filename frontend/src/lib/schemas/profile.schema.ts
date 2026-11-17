import { z } from 'zod';

/**
 * [EDUCATIONAL NOTE: Profile Update Form Schema]
 * 
 * 1. Architecture Role:
 *    Validates profile updates for account holder name and default shipping address.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Validates React Hook Form in `frontend/src/app/profile/page.tsx`
 *    - Transmitted via `usersApi.useUpdateProfileMutation({ name, address })`
 *    - Directly mirrors NestJS `UpdateProfileDto` (`backend/src/users/dto/update-profile.dto.ts`)
 *    - Updates `users` table record in PostgreSQL and invalidates ['User'] cache tag.
 * 
 * 3. State & Validation Mechanics:
 *    - Allows optional empty string or valid minimum length for partial profile updates.
 */

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters long')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
