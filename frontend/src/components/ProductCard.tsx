'use client';

/**
 * [EDUCATIONAL NOTE: ProductCard Component]
 * 
 * 1. Architecture Role:
 *    Reusable catalog card component presenting product information, price, stock status,
 *    and instant Add-to-Cart mutation trigger.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Click "Add to Cart" -> dispatches `cartApi.useAddToCartMutation({ productId, quantity: 1 })`.
 *    - HTTP Route: `POST /api/cart/items` -> `CartController.addItem()`.
 *    - TypeORM: Finds or creates user's active `Cart`, inserts/increments `CartItem` row.
 *    - Invalidates `['Cart']` tag, triggering automatic re-fetch of `Navbar` badge and `/cart` state.
 * 
 * 3. State & Validation Mechanics:
 *    - Prevents addition when product stock is 0.
 *    - Redirects to login if customer is unauthenticated.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Check } from 'lucide-react';
import type { Product } from '../types';
import { useAddToCartMutation } from '../lib/redux/api/cartApi';
import { useAppSelector } from '../lib/redux/store';
import { selectIsAuthenticated } from '../lib/redux/slices/authSlice';

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [addToCart, { isLoading }] = useAddToCartMutation();
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/products/${product.id}`);
      return;
    }

    try {
      await addToCart({ productId: product.id, quantity: 1 }).unwrap();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const isOutOfStock = product.stock <= 0;
  const formattedPrice = Number(product.price).toFixed(2);

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col h-full">
      {/* Product Image */}
      <Link href={`/products/${product.id}`} className="block relative aspect-square bg-gray-100 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No Image Available
          </div>
        )}
        {isOutOfStock && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded shadow">
            Out of Stock
          </span>
        )}
      </Link>

      {/* Product Details */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {product.category && (
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-1">
              {product.category.name}
            </span>
          )}
          <Link href={`/products/${product.id}`}>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition line-clamp-2 text-sm">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {product.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <span className="text-lg font-bold text-gray-900">${formattedPrice}</span>
            <span className="text-xs text-gray-400 block">
              {isOutOfStock ? '0 in stock' : `${product.stock} available`}
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isLoading}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              isSuccess
                ? 'bg-green-600 text-white'
                : isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={isOutOfStock ? 'Item is out of stock' : 'Add to Shopping Cart'}
          >
            {isSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>{isLoading ? 'Adding...' : 'Add'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
