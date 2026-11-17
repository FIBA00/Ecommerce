/**
 * [EDUCATIONAL NOTE: Cart RTK Query Endpoints]
 * 
 * 1. Architecture Role:
 *    Manages customer cart operations: retrieve, add item, update quantity, remove, and clear.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Maps to NestJS `CartController` (`/api/cart` routes)
 *    - Persists line items in PostgreSQL `cart_items` table
 * 
 * 3. Cache Invalidation:
 *    - All mutations invalidate `['Cart']`, immediately updating the Navbar badge and cart page totals.
 */

import { apiSlice } from './apiSlice';
import type { CartResponse } from '../../../types';

export const cartApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCart: builder.query<CartResponse, void>({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation<CartResponse, { productId: string; quantity: number }>({
      query: (body) => ({
        url: '/cart/items',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
    updateCartQuantity: builder.mutation<CartResponse, { itemId: string; quantity: number }>({
      query: ({ itemId, quantity }) => ({
        url: `/cart/items/${itemId}`,
        method: 'PATCH',
        body: { quantity },
      }),
      invalidatesTags: ['Cart'],
    }),
    removeCartItem: builder.mutation<CartResponse, string>({
      query: (itemId) => ({
        url: `/cart/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} = cartApi;
