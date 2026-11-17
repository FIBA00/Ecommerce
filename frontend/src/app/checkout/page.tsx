'use client';

/**
 * [EDUCATIONAL NOTE: Checkout Page Component]
 * 
 * 1. Architecture Role:
 *    Protected checkout screen collecting shipping address, displaying line-item order review,
 *    and triggering atomic ACID order placement in NestJS.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Form Validation: `checkoutSchema` via `@hookform/resolvers/zod`.
 *    - Address Pre-fill: Auto-populates from `useGetProfileQuery()` (`users.address` column in PostgreSQL).
 *    - Order Submission: `ordersApi.useCheckoutMutation({ shippingAddress })`.
 *    - NestJS Route: `POST /api/orders/checkout` -> `OrdersController.checkout()`.
 *    - Atomic Database Transaction:
 *      * Checks stock availability for all cart items.
 *      * Decrements physical `product.stock` values.
 *      * Creates `orders` record.
 *      * Inserts immutable snapshotted `order_items` records (productTitle, price).
 *      * Deletes active `cart_items`.
 *    - Cache Invalidation: Invalidates `['Cart', 'Order', 'Product']` tags simultaneously.
 * 
 * 3. State & Validation Mechanics:
 *    - Disables submission if cart is empty or mutation is loading.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, ArrowRight, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { checkoutSchema, CheckoutFormData } from '../../lib/schemas/checkout.schema';
import { useGetCartQuery } from '../../lib/redux/api/cartApi';
import { useGetProfileQuery } from '../../lib/redux/api/usersApi';
import { useCheckoutMutation } from '../../lib/redux/api/ordersApi';
import { useAppSelector } from '../../lib/redux/store';
import { selectIsAuthenticated, selectCurrentUser } from '../../lib/redux/slices/authSlice';

export default function CheckoutPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectCurrentUser);

  const { data: cart, isLoading: isCartLoading } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });

  const { data: profile } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [checkout, { isLoading: isSubmitting }] = useCheckoutMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: currentUser?.name || '',
      shippingAddress: '',
      paymentMethod: 'cod',
    },
  });

  // Pre-fill saved address from customer profile (Cross-Feature Parity T3-04)
  useEffect(() => {
    if (profile?.address) {
      setValue('shippingAddress', profile.address);
    }
    if (profile?.name) {
      setValue('fullName', profile.name);
    }
  }, [profile, setValue]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sign in to complete checkout</h2>
        <p className="text-sm text-gray-500">
          You must be logged in to create orders and track order history.
        </p>
        <Link
          href="/auth/login?redirect=/checkout"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (isCartLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-72 bg-gray-200 rounded-2xl" />
          <div className="h-72 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const cartTotal = Number(cart?.cartTotal || 0).toFixed(2);
  const isCartEmpty = items.length === 0;

  const onSubmit = async (data: CheckoutFormData) => {
    setErrorMessage(null);

    if (isCartEmpty) {
      setErrorMessage('Your cart is empty. Please add items before placing an order.');
      return;
    }

    try {
      const order = await checkout({
        shippingAddress: data.shippingAddress.trim(),
      }).unwrap();

      // Successful order creation -> redirect to detailed receipt
      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setErrorMessage(
        err?.data?.message || 'Checkout failed. Please check stock availability and try again.'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Checkout
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Review items and provide your delivery destination
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isCartEmpty ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Your Cart is Empty</h3>
          <p className="text-xs sm:text-sm text-gray-500">
            Cannot proceed to checkout with an empty shopping cart.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
          >
            <span>Browse Products</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Shipping Details */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              Shipping & Delivery
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                {...register('fullName')}
                placeholder="Jane Doe"
                className="w-full text-sm px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.fullName && (
                <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Shipping Address
              </label>
              <textarea
                rows={3}
                {...register('shippingAddress')}
                placeholder="123 Educational Blvd, Tech City, TC 10001"
                className="w-full text-sm px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.shippingAddress && (
                <p className="text-xs text-red-600 mt-1">{errors.shippingAddress.message}</p>
              )}
              {profile?.address && (
                <span className="text-xs text-blue-600 mt-1 block">
                  ✓ Pre-filled from your saved profile address
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Payment Method (Simulated)
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-blue-500 bg-blue-50/50 rounded-lg cursor-pointer text-sm">
                  <input
                    type="radio"
                    value="cod"
                    {...register('paymentMethod')}
                    defaultChecked
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">Cash on Delivery (Demo)</span>
                    <span className="text-xs text-gray-500">Pay upon delivery of physical educational package</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg opacity-75 cursor-pointer text-sm">
                  <input
                    type="radio"
                    value="card"
                    {...register('paymentMethod')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">Credit Card (Simulated)</span>
                    <span className="text-xs text-gray-500">Instant educational authorization test</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Review & Placement */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              Order Review
            </h2>

            {/* Line Items List */}
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex-1 pr-3 truncate">
                    <span className="font-medium text-gray-800 block truncate">
                      {item.product?.name}
                    </span>
                    <span className="text-gray-400">Qty: {item.quantity} × ${Number(item.product?.price || 0).toFixed(2)}</span>
                  </div>
                  <span className="font-bold text-gray-900 shrink-0">
                    ${(Number(item.product?.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="border-t border-gray-200 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${cartTotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600 font-semibold">Free</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between text-base font-bold text-gray-900">
                <span>Total Amount</span>
                <span>${cartTotal}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isCartEmpty}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
            >
              {isSubmitting ? (
                <span>Processing Order...</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Place Order (${cartTotal})</span>
                </>
              )}
            </button>

            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 leading-relaxed">
              <span className="font-bold text-gray-700 block mb-1">Atomic Transaction:</span>
              On submission, NestJS locks the product stock, decrements inventory, snapshots items, and purges the cart in a single PostgreSQL ACID transaction.
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
