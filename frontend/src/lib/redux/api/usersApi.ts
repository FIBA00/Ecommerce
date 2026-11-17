/**
 * [EDUCATIONAL NOTE: Users RTK Query Endpoints]
 * 
 * 1. Architecture Role:
 *    Manages user profile retrieval and updates.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - `getProfile`: `GET /api/users/profile` -> `UsersController.getProfile()` -> `User` entity with `orders`.
 *    - `updateProfile`: `PATCH /api/users/profile` -> `UsersController.updateProfile()`.
 * 
 * 3. Cache Invalidation:
 *    - `updateProfile` invalidates `['User']`, refreshing profile data across the app.
 */

import { apiSlice } from './apiSlice';
import type { User, Order } from '../../../types';

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProfile: builder.query<User & { orders?: Order[] }, void>({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<User, { name?: string; address?: string }>({
      query: (body) => ({
        url: '/users/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
} = usersApi;
