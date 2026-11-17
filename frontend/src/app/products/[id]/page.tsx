'use client';

/**
 * [EDUCATIONAL NOTE: Product Details Page]
 * 
 * 1. Architecture Role:
 *    Dedicated product detail view presenting comprehensive product specs, high-res image,
 *    current warehouse inventory level, and bounded quantity purchase stepper.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Query: `productsApi.useGetProductByIdQuery(id)` -> `GET /api/products/:id`.
 *    - NestJS: `ProductsController.findOne()` -> TypeORM `findOne({ where: { id }, relations: ['category'] })`.
 *    - Mutation: `cartApi.useAddToCartMutation({ productId, quantity })` -> `POST /api/cart/items`.
 *    - Invalidates `['Cart']` tag, updating Navbar badge.
 * 
 * 3. State & Validation Mechanics:
 *    - Quantity selection is strictly bounded between 1 and `product.stock`.
 *    - If stock is 0, disables the Add to Cart button.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Check, ArrowLeft, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import { useGetProductByIdQuery } from '../../../lib/redux/api/productsApi';
import { useAddToCartMutation } from '../../../lib/redux/api/cartApi';
import { useAppSelector } from '../../../lib/redux/store';
import { selectIsAuthenticated } from '../../../lib/redux/slices/authSlice';

export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const productId = params.id;

  const { data: product, isLoading, isError } = useGetProductByIdQuery(productId);
  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [quantity, setQuantity] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="aspect-square bg-gray-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Product Not Found</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          The requested product could not be found or has been removed from the catalog.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const unitPrice = Number(product.price).toFixed(2);

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleAddToCart = async () => {
    setErrorMsg(null);

    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/products/${product.id}`);
      return;
    }

    try {
      await addToCart({ productId: product.id, quantity }).unwrap();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || 'Failed to add item to cart');
    }
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/" className="hover:text-blue-600 transition">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-blue-600 transition">
          Products
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-blue-600 transition"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Product Detail Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Product Image */}
        <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              No Image Available
            </div>
          )}
        </div>

        {/* Product Information & Actions */}
        <div className="space-y-6">
          <div>
            {product.category && (
              <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
                {product.category.name}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {product.name}
            </h1>
          </div>

          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-extrabold text-gray-900">${unitPrice}</span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isOutOfStock
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {isOutOfStock ? 'Out of Stock' : `In Stock (${product.stock} available)`}
            </span>
          </div>

          <div className="border-t border-b border-gray-100 py-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Description
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Quantity Stepper & Add to Cart */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Quantity:
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition"
                >
                  -
                </button>
                <span className="px-4 text-sm font-semibold text-gray-800 min-w-[32px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= product.stock || isOutOfStock}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition"
                >
                  +
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {errorMsg}
              </p>
            )}

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAdding}
              className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition ${
                isSuccess
                  ? 'bg-green-600 text-white'
                  : isOutOfStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Added {quantity} to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span>{isAdding ? 'Adding to Cart...' : 'Add to Cart'}</span>
                </>
              )}
            </button>
          </div>

          {/* Educational Architecture Callout */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-gray-800">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Educational Full-Stack Linkage</span>
            </div>
            <p className="text-gray-500 leading-relaxed">
              When adding to cart, Next.js calls RTK Query mutation <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">cartApi.useAddToCartMutation</code>,
              which dispatches an HTTP <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">POST /api/cart/items</code> to NestJS <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">CartController</code>.
              The NestJS service updates the PostgreSQL <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">cart_items</code> table and invalidates the <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">&apos;Cart&apos;</code> tag, refreshing your cart badge across all open tabs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
