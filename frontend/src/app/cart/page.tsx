'use client';

/**
 * [EDUCATIONAL NOTE: Shopping Cart Page]
 * 
 * 1. Architecture Role:
 *    Full shopping cart management page displaying customer line items, live quantity adjustments,
 *    order subtotal calculations, and checkout navigation.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Query: `cartApi.useGetCartQuery()` -> `GET /api/cart` -> NestJS `CartController.getCart()`.
 *    - Mutations: `updateCartQuantity`, `removeCartItem`, `clearCart`.
 *    - TypeORM: Modifies or purges records in `cart_items` table.
 *    - Cache Invalidation: All mutations invalidate `['Cart']`, keeping cart count badge synchronized.
 * 
 * 3. State & Validation Mechanics:
 *    - Requires authenticated customer session (prompts login if unauthenticated).
 *    - Currency values are precision-formatted to 2 decimal places.
 */

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Trash2, ArrowLeft, Lock } from 'lucide-react';
import {
  useGetCartQuery,
  useUpdateCartQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} from '../../lib/redux/api/cartApi';
import { useAppSelector } from '../../lib/redux/store';
import { selectIsAuthenticated } from '../../lib/redux/slices/authSlice';
import { CartItemRow } from '../../components/CartItemRow';

export default function CartPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const { data: cart, isLoading } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [updateQuantity, { isLoading: isUpdating }] = useUpdateCartQuantityMutation();
  const [removeItem] = useRemoveCartItemMutation();
  const [clearCart, { isLoading: isClearing }] = useClearCartMutation();

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-6">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sign in to view your cart</h2>
        <p className="text-sm text-gray-500">
          Your cart items are saved to your account in PostgreSQL. Please log in to manage your cart and proceed to checkout.
        </p>
        <Link
          href="/auth/login?redirect=/cart"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition"
        >
          <span>Sign In to Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  const items = cart?.items || [];
  const itemCount = cart?.itemCount || 0;
  const cartTotal = Number(cart?.cartTotal || 0).toFixed(2);

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Your Cart is Empty</h2>
        <p className="text-sm text-gray-500">
          Looks like you haven&apos;t added any items to your shopping cart yet.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Start Shopping</span>
        </Link>
      </div>
    );
  }

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateQuantity({ itemId, quantity });
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your entire cart?')) {
      clearCart();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Review your items before proceeding to atomic checkout
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Cart Line Items */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
              Product
            </span>
            <button
              onClick={handleClearCart}
              disabled={isClearing}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cart</span>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
                isUpdating={isUpdating}
              />
            ))}
          </div>

          <div className="pt-4 flex justify-between items-center text-xs text-gray-500">
            <Link href="/products" className="flex items-center gap-1 hover:text-blue-600 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
            Order Summary
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Items Total ({itemCount})</span>
              <span>${cartTotal}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxes (Simulated)</span>
              <span>$0.00</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-bold text-gray-900">
              <span>Estimated Total</span>
              <span>${cartTotal}</span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-xs text-gray-400 text-center">
            Educational checkout transaction converts cart items to snapshotted order line items and clears your cart.
          </p>
        </div>
      </div>
    </div>
  );
}
