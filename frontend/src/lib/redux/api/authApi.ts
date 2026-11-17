/**
 * [EDUCATIONAL NOTE: Auth RTK Query Endpoints]
 * 
 * 1. Architecture Role:
 *    Defines mutations for user registration and login, and query for self-profile.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - `register`: `POST /api/auth/register` -> `AuthController.register()` -> `User` + initial `Cart`.
 *    - `login`: `POST /api/auth/login` -> `AuthController.login()` -> bcrypt validation -> JWT.
 *    - `getMe`: `GET /api/auth/me` -> `AuthController.getMe()`.
 * 
 * 3. Cache Invalidation Mechanics:
 *    - Register & Login invalidate `['Auth', 'Cart', 'Order', 'User']`, ensuring fresh state on login.
 */

import { apiSlice } from './apiSlice';
import type { AuthResponse, User } from '../../../types';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, { email: string; password: string; name: string }>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'Cart', 'Order', 'User'],
    }),
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'Cart', 'Order', 'User'],
    }),
    getMe: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Auth', 'User'],
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
} = authApi;
