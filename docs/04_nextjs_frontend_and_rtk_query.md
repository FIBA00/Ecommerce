# 04. Next.js Frontend Architecture & RTK Query State

The frontend is built with **Next.js 14+ App Router**, **Redux Toolkit**, and **RTK Query**. This document details the layout architecture, Server vs. Client Component boundaries, client session rehydration, the modular RTK Query cache architecture, and the complete 6-tag cache invalidation matrix.

---

## 1. Next.js 14 App Router Architecture & Component Boundaries

The Next.js 14 App Router introduces a hybrid rendering paradigm where React components default to Server Components unless designated with the `'use client'` directive.

### The Server/Client Layout Boundary:
The root layout (`frontend/src/app/layout.tsx`) is a **Server Component** that defines document metadata and wraps all pages with the `<StoreProvider>` client context:

```tsx
// frontend/src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { StoreProvider } from '../lib/redux/StoreProvider';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'EduStore | Educational Next.js & NestJS Ecommerce',
  description: 'Full-stack ecommerce learning platform built with Next.js 14, RTK Query, React Hook Form, Zod, NestJS, and TypeORM.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased">
        <StoreProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
```

### Architectural Insights on Component Composition:
1. **Preserving Server Rendering**:  
   By passing `{children}` into `<StoreProvider>` rather than embedding page components directly inside client files, Next.js can still render downstream Server Components without forcing the entire subtree into client JavaScript bundles.
2. **Client Components throughout Interactive UI**:  
   Interactive pages and widgets declare `'use client'` at line 1 (`Navbar`, `ProductCard`, `ProductFilters`, `CartItemRow`, `/cart`, `/checkout`, `/orders`).
3. **Static Build Independence**:  
   All catalog and account queries run client-side post-hydration via RTK Query hooks. This ensures `next build` compiles statically without requiring a live, running PostgreSQL database or backend server at build time.

---

## 2. Redux Toolkit Store & Session Persistence

### Root Store Configuration:
The centralized store (`frontend/src/lib/redux/store.ts`) combines the authentication slice and RTK Query reducer:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { apiSlice } from './api/apiSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(apiSlice.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Resilient Client-Side Rehydration (`StoreProvider.tsx`):
When a user refreshes the browser, in-memory Redux state is wiped. To provide persistent login sessions, `StoreProvider` mounts on the client and rehydrates state from `localStorage`:

```tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { setCredentials } from './slices/authSlice';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      try {
        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
          const user = JSON.parse(userStr);
          store.dispatch(setCredentials({ user, accessToken: token }));
        }
      } catch (err) {
        console.error('Failed to rehydrate auth from localStorage:', err);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
```

### Self-Healing Corruption Protection:
If `localStorage` contains corrupted JSON or invalid data, the `try/catch` block catches the exception, purges the damaged storage keys, and allows the store to initialize cleanly in an unauthenticated guest state, avoiding infinite crash loops.

---

## 3. RTK Query Root `apiSlice` & JWT Header Injection

RTK Query handles API calls, caching, deduplication, and background updates. The root slice (`frontend/src/lib/redux/api/apiSlice.ts`) configures `fetchBaseQuery` and manages authentication headers:

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  prepareHeaders: (headers, { getState }) => {
    // 1. Extract token from in-memory Redux state
    const state = getState() as RootState;
    let token = state?.auth?.accessToken;

    // 2. Fallback to localStorage during client hydration race conditions
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
```

---

## 4. The Complete 6-Tag Cache Invalidation Matrix

RTK Query uses "tags" to track which cached data needs to be refetched after mutations. The application establishes a 6-tag invalidation matrix:

```
              ┌────────────────────────────────────────────────────────┐
              │             RTK Query Cache Tags:                      │
              │  ['Product', 'Category', 'Cart', 'Order', 'User', 'Auth']
              └────────────────────────────────────────────────────────┘
```

| API Endpoint | Method & Route | Type | Provided Tags | Invalidated Tags | UI Effect |
|---|---|---|---|---|---|
| `authApi.register` | `POST /auth/register` | Mutation | None | `['Auth', 'Cart', 'Order', 'User']` | Purges stale session cache and starts clean customer session |
| `authApi.login` | `POST /auth/login` | Mutation | None | `['Auth', 'Cart', 'Order', 'User']` | Discards previous cache, pulls new customer cart and orders |
| `authApi.getMe` | `GET /auth/me` | Query | `['Auth', 'User']` | None | Keeps user session active and validates token |
| `productsApi.getProducts` | `GET /products` | Query | `Product (ids)`, `Product (LIST)` | None | Caches dynamic catalog queries (search, category, price) |
| `productsApi.getProductById` | `GET /products/:id` | Query | `Product (id)` | None | Caches individual product detail views |
| `categoriesApi.getCategories`| `GET /categories` | Query | `Category (ids)`, `Category (LIST)` | None | Caches category list for filter chips and navigation |
| `cartApi.getCart` | `GET /cart` | Query | `['Cart']` | None | Feeds live item count to Navbar badge and `/cart` page |
| `cartApi.addToCart` | `POST /cart/items` | Mutation | None | `['Cart']` | Automatically refetches cart, bumping Navbar badge |
| `cartApi.updateCartQuantity`| `PATCH /cart/items/:id`| Mutation | None | `['Cart']` | Recalculates subtotal and line quantities immediately |
| `cartApi.removeCartItem` | `DELETE /cart/items/:id`| Mutation | None | `['Cart']` | Removes line item and updates cart total |
| `cartApi.clearCart` | `DELETE /cart` | Mutation | None | `['Cart']` | Resets cart page and resets Navbar badge |
| `ordersApi.checkout` | `POST /orders/checkout` | Mutation | None | `['Cart', 'Order', 'Product']` | **Tri-tag invalidation**: clears cart, adds order, reduces stock |
| `ordersApi.getOrders` | `GET /orders` | Query | `Order (ids)`, `Order (LIST)` | None | Caches customer order history |
| `ordersApi.getOrderById` | `GET /orders/:id` | Query | `Order (id)` | None | Caches immutable snapshotted purchase receipt |
| `usersApi.getProfile` | `GET /users/profile` | Query | `['User']` | None | Displays customer profile data and orders summary |
| `usersApi.updateProfile` | `PATCH /users/profile` | Mutation | None | `['User']` | Updates name and address across navbar and profile |

### Step-by-Step Multi-Tag Invalidation Flow during Checkout:
When a customer clicks "Place Order" on `/checkout`, the `checkout` mutation invalidates `['Cart', 'Order', 'Product']`:
1. **`Cart` tag invalidated**:
   - The global `Navbar` component subscribes to `useGetCartQuery()`.
   - The `/cart` page subscribes to `useGetCartQuery()`.
   - RTK Query automatically marks their cache as stale and issues a background refetch.
   - Result: Cart count badge immediately drops to 0 without page reloads.
2. **`Order` tag invalidated**:
   - The `/orders` page subscribes to `useGetOrdersQuery()`.
   - RTK Query refetches the order list.
   - Result: The newly created order immediately appears at the top of the history list.
3. **`Product` tag invalidated**:
   - The `/products` catalog and `/products/[id]` pages subscribe to `useGetProductsQuery()` and `useGetProductByIdQuery()`.
   - RTK Query re-fetches product items.
   - Result: The available stock counter reflects the decremented inventory across the store.

---

## 5. Modular Injected Endpoint APIs

To keep code modular and support code splitting, endpoints are injected into `apiSlice`:

- `frontend/src/lib/redux/api/authApi.ts`: Exports `useLoginMutation`, `useRegisterMutation`, `useGetMeQuery`.
- `frontend/src/lib/redux/api/productsApi.ts`: Exports `useGetProductsQuery`, `useGetProductByIdQuery`.
- `frontend/src/lib/redux/api/categoriesApi.ts`: Exports `useGetCategoriesQuery`.
- `frontend/src/lib/redux/api/cartApi.ts`: Exports `useGetCartQuery`, `useAddToCartMutation`, `useUpdateCartQuantityMutation`, `useRemoveCartItemMutation`, `useClearCartMutation`.
- `frontend/src/lib/redux/api/ordersApi.ts`: Exports `useCheckoutMutation`, `useGetOrdersQuery`, `useGetOrderByIdQuery`.
- `frontend/src/lib/redux/api/usersApi.ts`: Exports `useGetProfileQuery`, `useUpdateProfileMutation`.

Each hook handles loading state, error catching, response caching, and component lifecycle cleanup automatically.
