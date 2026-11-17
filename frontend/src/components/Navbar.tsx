'use client';

/**
 * [EDUCATIONAL NOTE: Navbar Component]
 * 
 * 1. Architecture Role:
 *    Sticky global navigation bar rendering brand logo, search input, catalog links,
 *    live shopping cart counter badge, and authentication status.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Cart Badge: Listens to `useGetCartQuery()` which polls/caches `GET /api/cart`.
 *    - Auth State: Reads `selectIsAuthenticated` and `selectCurrentUser` from Redux `authSlice`.
 *    - Search Input: Pushes query parameters to `/products?search=...` route, consumed by `productsApi`.
 * 
 * 3. State & Validation Mechanics:
 *    - Automatically updates badge when RTK Query invalidates `['Cart']` tag.
 *    - Cleans credentials on logout via `logOut()` action.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, Package, Search, LogOut, Store } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../lib/redux/store';
import { selectIsAuthenticated, selectCurrentUser, logOut } from '../lib/redux/slices/authSlice';
import { useGetCartQuery } from '../lib/redux/api/cartApi';

export function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);

  // Dynamic cart query - automatic cache synchronization via RTK Query
  const { data: cart } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/products');
    }
  };

  const handleLogout = () => {
    dispatch(logOut());
    router.push('/');
  };

  const cartItemCount = isAuthenticated && cart ? cart.itemCount : 0;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold text-xl tracking-tight">
            <Store className="w-6 h-6" />
            <span>EduStore</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:flex relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </form>

          {/* Navigation Items */}
          <nav className="flex items-center gap-6">
            <Link
              href="/products"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
            >
              Catalog
            </Link>

            {/* Shopping Cart Icon with Badge */}
            <Link
              href="/cart"
              className="relative p-2 text-gray-700 hover:text-blue-600 transition"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-blue-600 rounded-full min-w-[18px]">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Auth Dependent Controls */}
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/orders"
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden md:inline">Orders</span>
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden md:inline">{currentUser?.name?.split(' ')[0] || 'Profile'}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-500 hover:text-red-600 transition rounded hover:bg-gray-100"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
