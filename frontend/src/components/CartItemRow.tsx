'use client';

/**
 * [EDUCATIONAL NOTE: CartItemRow Component]
 * 
 * 1. Architecture Role:
 *    Renders an individual line item in the customer shopping cart table/view.
 *    Provides interactive quantity modification stepper and deletion trigger.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Quantity change: triggers `cartApi.useUpdateCartQuantityMutation({ itemId, quantity })`.
 *    - Deletion: triggers `cartApi.useRemoveCartItemMutation(itemId)`.
 *    - HTTP Routes: `PATCH /api/cart/items/:id` and `DELETE /api/cart/items/:id`.
 *    - TypeORM: Modifies or deletes row in `cart_items` table.
 *    - Cache Invalidation: Invalidates `['Cart']` tag, updating active totals.
 * 
 * 3. State & Validation Mechanics:
 *    - Guard against exceeding available warehouse stock (`item.product.stock`).
 *    - If quantity reduced to 0, backend automatically purges the line item.
 */

import React from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '../types';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  isUpdating?: boolean;
}

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating = false,
}: CartItemRowProps) {
  const unitPrice = Number(item.product?.price || 0);
  const lineTotal = (unitPrice * item.quantity).toFixed(2);
  const maxStock = item.product?.stock ?? 99;

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    } else {
      onRemove(item.id);
    }
  };

  const handleIncrement = () => {
    if (item.quantity < maxStock) {
      onUpdateQuantity(item.id, item.quantity + 1);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between py-4 border-b border-gray-200 gap-4">
      {/* Product Image & Info */}
      <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
        <Link
          href={`/products/${item.productId}`}
          className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0"
        >
          {item.product?.imageUrl ? (
            <img
              src={item.product.imageUrl}
              alt={item.product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
              No Image
            </div>
          )}
        </Link>

        <div>
          <Link
            href={`/products/${item.productId}`}
            className="font-medium text-gray-900 hover:text-blue-600 transition text-sm"
          >
            {item.product?.name || 'Product'}
          </Link>
          <div className="text-xs text-gray-500 mt-1">
            Unit Price: ${unitPrice.toFixed(2)}
          </div>
          {item.product && item.product.stock <= 5 && (
            <span className="text-xs text-amber-600 block mt-0.5">
              Only {item.product.stock} left in stock
            </span>
          )}
        </div>
      </div>

      {/* Quantity Stepper & Price */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-6">
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
          <button
            onClick={handleDecrement}
            disabled={isUpdating}
            className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition"
            title="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="px-3 text-xs font-semibold text-gray-800 min-w-[28px] text-center">
            {item.quantity}
          </span>
          <button
            onClick={handleIncrement}
            disabled={isUpdating || item.quantity >= maxStock}
            className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition"
            title={item.quantity >= maxStock ? 'Max stock reached' : 'Increase quantity'}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-right min-w-[80px]">
          <span className="text-sm font-bold text-gray-900">${lineTotal}</span>
        </div>

        {/* Delete Line Item */}
        <button
          onClick={() => onRemove(item.id)}
          disabled={isUpdating}
          className="p-2 text-gray-400 hover:text-red-600 transition rounded-lg hover:bg-red-50"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default CartItemRow;
