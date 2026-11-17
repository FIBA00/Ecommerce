/**
 * [EDUCATIONAL NOTE: RTK Query Root API Slice]
 * 
 * 1. Architecture Role:
 *    Configures the root RTK Query `createApi` instance using `fetchBaseQuery`.
 *    Establishes baseUrl, Bearer token injection, and the 6-tag cache invalidation matrix.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Connects to NestJS REST API: `http://localhost:3001/api`
 *    - Injects JWT `Bearer <token>` extracted from Redux `authSlice` or browser `localStorage`
 *    - Guarantees seamless authorization for protected controllers (`/api/cart`, `/api/orders`, `/api/users/profile`)
 * 
 * 3. State & Cache Tag Mechanics:
 *    - Declares tagTypes: `['Product', 'Category', 'Cart', 'Order', 'User', 'Auth']`
 *    - Acts as the unified parent API into which domain endpoints are injected.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  prepareHeaders: (headers, { getState }) => {
    // 1. Extract token from in-memory Redux state
    const state = getState() as RootState;
    let token = state?.auth?.accessToken;

    // 2. Fallback to localStorage for browser environments
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('accessToken');
    }

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Product', 'Category', 'Cart', 'Order', 'User', 'Auth'],
  endpoints: () => ({}),
});
