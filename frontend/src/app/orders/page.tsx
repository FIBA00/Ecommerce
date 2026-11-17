'use client';

/**
 * [EDUCATIONAL NOTE: Order History Page]
 * 
 * 1. Architecture Role:
 *    Protected user order history list displaying previous purchases, execution status badges,
 *    and links to individual immutable receipts.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Query: `ordersApi.useGetOrdersQuery()` -> `GET /api/orders`.
 *    - NestJS: `OrdersController.findAllForUser()` -> TypeORM `find({ where: { userId }, relations: ['items'], order: { createdAt: 'DESC' } })`.
 *    - PostgreSQL: Reads from `orders` and `order_items` tables.
 * 
 * 3. State & Validation Mechanics:
 *    - Protected client route: redirects unauthenticated users to `/auth/login`.
 */

import React from 'react';
import Link from 'next/link';
import { Package, ArrowRight, Clock, CheckCircle2, XCircle, Truck, FileText } from 'lucide-react';
import { useGetOrdersQuery } from '../../lib/redux/api/ordersApi';
import { useAppSelector } from '../../lib/redux/store';
import { selectIsAuthenticated } from '../../lib/redux/slices/authSlice';
import type { OrderStatus } from '../../types';

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'delivered':
      return {
        icon: CheckCircle2,
        className: 'bg-green-100 text-green-800',
        label: 'Delivered',
      };
    case 'shipped':
      return {
        icon: Truck,
        className: 'bg-purple-100 text-purple-800',
        label: 'Shipped',
      };
    case 'processing':
      return {
        icon: Clock,
        className: 'bg-blue-100 text-blue-800',
        label: 'Processing',
      };
    case 'cancelled':
      return {
        icon: XCircle,
        className: 'bg-red-100 text-red-800',
        label: 'Cancelled',
      };
    case 'pending':
    default:
      return {
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800',
        label: 'Pending',
      };
  }
}

export default function OrdersPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { data: orders = [], isLoading } = useGetOrdersQuery(undefined, {
    skip: !isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sign in to view your orders</h2>
        <p className="text-sm text-gray-500">
          Track previous orders, view receipts, and review past purchases.
        </p>
        <Link
          href="/auth/login?redirect=/orders"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-8 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          My Orders
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Review your purchase history and inspect immutable order receipts
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Orders Yet</h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
            You have not placed any orders yet. Visit the catalog to start shopping!
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
          >
            <span>Explore Catalog</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = getStatusBadge(order.status);
            const StatusIcon = statusConfig.icon;
            const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

            return (
              <div
                key={order.id}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-blue-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-xs font-mono text-gray-400 block">
                      Order #{order.id.slice(0, 8)}...
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{formattedDate}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.className}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusConfig.label}</span>
                    </span>

                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </Link>
                  </div>
                </div>

                {/* Items Summary Preview */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-600">
                  <div className="space-y-1">
                    <span className="font-medium text-gray-800">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'} purchased
                    </span>
                    <div className="text-gray-400 truncate max-w-md">
                      {order.items?.map((it) => it.productTitle).join(', ')}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xs text-gray-400 block">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      ${Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
