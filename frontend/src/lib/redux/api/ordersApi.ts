/**
 * [EDUCATIONAL NOTE: Orders & Checkout RTK Query Endpoints]
 * 
 * 1. Architecture Role:
 *    Executes atomic checkout, loads past orders list, and retrieves detailed order receipts.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - `checkout`: `POST /api/orders/checkout` -> `OrdersService.checkout()` atomic transaction:
 *      validates stock, decrements inventory, creates Order, creates snapshotted OrderItems, and clears cart.
 *    - `getOrders`: `GET /api/orders` -> `OrdersController.getOrders()`.
 *    - `getOrderById`: `GET /api/orders/:id` -> `OrdersController.getOrderById()`.
 * 
 * 3. Cache Invalidation:
 *    - `checkout` invalidates `['Cart', 'Order', 'Product']`:
 *      - 'Cart': cart is emptied after purchase.
 *      - 'Order': order history list has new entry.
 *      - 'Product': physical warehouse stock was decremented during checkout transaction.
 */

import { apiSlice } from './apiSlice';
import type { Order } from '../../../types';

export const ordersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    checkout: builder.mutation<Order, { shippingAddress: string }>({
      query: (body) => ({
        url: '/orders/checkout',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart', 'Order', 'Product'],
    }),
    getOrders: builder.query<Order[], void>({
      query: () => '/orders',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Order' as const, id })),
              { type: 'Order', id: 'LIST' },
            ]
          : [{ type: 'Order', id: 'LIST' }],
    }),
    getOrderById: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),
  }),
});

export const {
  useCheckoutMutation,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
} = ordersApi;
