'use client';

/**
 * [EDUCATIONAL NOTE: Home Page Component]
 * 
 * 1. Architecture Role:
 *    Storefront landing page rendering promotional hero banner, category quick links,
 *    and newest product arrivals.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - `useGetCategoriesQuery()` -> `GET /api/categories` -> PostgreSQL `categories` table.
 *    - `useGetProductsQuery({ limit: 4, sortBy: 'newest' })` -> `GET /api/products` -> `products` table.
 * 
 * 3. State & Build Resilience:
 *    - Uses Client Component (`'use client'`) to fetch data post-hydration,
 *      allowing static export / compile without requiring an active PostgreSQL container at build time.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Layers, ShieldCheck } from 'lucide-react';
import { useGetCategoriesQuery } from '../lib/redux/api/categoriesApi';
import { useGetProductsQuery } from '../lib/redux/api/productsApi';
import { ProductCard } from '../components/ProductCard';

export default function HomePage() {
  const { data: categories, isLoading: isCategoriesLoading } = useGetCategoriesQuery();
  const { data: productsData, isLoading: isProductsLoading } = useGetProductsQuery({
    limit: 4,
    sortBy: 'newest',
  });

  return (
    <div className="space-y-16">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-16 sm:px-12 sm:py-20 shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold backdrop-blur-sm">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Educational Full-Stack Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Learn Next.js 14, NestJS & RTK Query
          </h1>

          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Explore a production-grade ecommerce application engineered to teach clean separation of concerns,
            atomic ACID checkout transactions, and type-safe state invalidation.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-sm rounded-xl shadow-md transition"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white border border-blue-500 font-semibold text-sm rounded-xl transition"
            >
              <span>Create Demo Account</span>
            </Link>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Featured Categories */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Shop by Category</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Browse our full educational catalog</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isCategoriesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-sm transition flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition text-sm sm:text-base">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                    {cat.description || 'Explore collection'}
                  </p>
                </div>
                <span className="text-xs text-blue-600 font-medium mt-3 flex items-center gap-1">
                  <span>Browse</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Newest Arrivals */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Featured Products</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Latest items added to the catalog</p>
          </div>
          <Link href="/products?sortBy=newest" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <span>See more</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isProductsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productsData?.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Educational Architecture Callout */}
      <section className="bg-blue-50 border border-blue-100 rounded-2xl p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">RTK Query Tag Cache</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Automatic multi-tag cache invalidation keeping product inventory, cart totals, and orders perfectly synchronized.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Zod Form Parity</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Client-side React Hook Form validation strictly aligned with NestJS class-validator DTO constraints.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">TypeORM Snapshotting</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Order line items snapshot product titles and prices during purchase to guarantee financial audit durability.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
