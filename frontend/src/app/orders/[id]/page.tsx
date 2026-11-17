'use client';

/**
 * [EDUCATIONAL NOTE: Order Receipt & Snapshotting View]
 * 
 * 1. Architecture Role:
 *    Detailed receipt view displaying historical order records and immutable snapshotted line items.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Query: `ordersApi.useGetOrderByIdQuery(id)` -> `GET /api/orders/:id`.
 *    - NestJS: `OrdersController.findOne()` -> validates ownership or admin role.
 *    - PostgreSQL: Reads from `orders` and `order_items` tables.
 * 
 * 3. Educational Concept: TypeORM Snapshotting:
 *    - The `order_items` table stores immutable copies of `productTitle` and `price` at the exact
 *      timestamp of purchase. If the catalog product title is edited or the price changes in the future,
 *      this receipt remains completely accurate and unchanged.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, Truck, XCircle, MapPin, Receipt, Database } from 'lucide-react';
import { useGetOrderByIdQuery } from '../../../lib/redux/api/ordersApi';
import { useAppSelector } from '../../../lib/redux/store';
import { selectIsAuthenticated } from '../../../lib/redux/slices/authSlice';
import type { OrderStatus } from '../../../types';

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'delivered':
      return { icon: CheckCircle2, className: 'bg-green-100 text-green-800', label: 'Delivered' };
    case 'shipped':
      return { icon: Truck, className: 'bg-purple-100 text-purple-800', label: 'Shipped' };
    case 'processing':
      return { icon: Clock, className: 'bg-blue-100 text-blue-800', label: 'Processing' };
    case 'cancelled':
      return { icon: XCircle, className: 'bg-red-100 text-red-800', label: 'Cancelled' };
    case 'pending':
    default:
      return { icon: Clock, className: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
  }
}

export default function OrderReceiptPage({
  params,
}: {
  params: { id: string };
}) {
  const orderId = params.id;
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const { data: order, isLoading, isError } = useGetOrderByIdQuery(orderId, {
    skip: !isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Authentication Required</h2>
        <p className="text-sm text-gray-500">Please sign in to inspect this order receipt.</p>
        <Link
          href={`/auth/login?redirect=/orders/${orderId}`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-10 animate-pulse space-y-6">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="h-40 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Order Not Found</h2>
        <p className="text-xs text-gray-500">The requested order does not exist or belongs to another user.</p>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Orders</span>
        </Link>
      </div>
    );
  }

  const statusConfig = getStatusBadge(order.status);
  const StatusIcon = statusConfig.icon;
  const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </Link>

        <span className="text-xs font-mono text-gray-400">
          ID: {order.id}
        </span>
      </div>

      {/* Receipt Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Receipt Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Order Receipt</h1>
              <p className="text-xs text-gray-400 mt-0.5">{formattedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.className}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusConfig.label}</span>
            </span>
          </div>
        </div>

        {/* Shipping Destination */}
        <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3 text-xs">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-gray-700 block">Delivery Address</span>
            <p className="text-gray-600 mt-0.5">{order.shippingAddress}</p>
          </div>
        </div>

        {/* Educational Snapshotting Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <Database className="w-4 h-4 text-amber-700" />
            <span>Educational Snapshotting Concept</span>
          </div>
          <p className="text-amber-800 leading-relaxed text-[11px]">
            The line items below reflect values snapshotted in PostgreSQL <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">order_items</code> at purchase time.
            Even if product catalog prices change, your purchase history maintains the exact financial record.
          </p>
        </div>

        {/* Itemized Line Items Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Snapshotted Title</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {order.items?.map((item) => {
                const lineTotal = (Number(item.price) * item.quantity).toFixed(2);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.productTitle}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ${lineTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="border-t border-gray-100 pt-4 space-y-2 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Shipping</span>
            <span className="text-green-600 font-semibold">Free</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-black text-gray-900">
            <span>Total Paid</span>
            <span>${Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
