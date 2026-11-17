'use client';

/**
 * [EDUCATIONAL NOTE: Product Catalog Page]
 * 
 * 1. Architecture Role:
 *    Full catalog browsing view supporting real-time keyword search, category filtering,
 *    price boundary scoping, sorting, and pagination.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Consumes `useGetProductsQuery(queryParams)` -> `GET /api/products?...`.
 *    - Query params map directly to NestJS `GetProductsQueryDto`.
 *    - Translates to SQL `WHERE`, `ORDER BY`, `LIMIT`, and `OFFSET` clauses.
 * 
 * 3. State & Validation Mechanics:
 *    - Search params synchronize with URL query string.
 *    - Category filter queries `useGetCategoriesQuery()`.
 */

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, PackageX } from 'lucide-react';
import { useGetProductsQuery } from '../../lib/redux/api/productsApi';
import { useGetCategoriesQuery } from '../../lib/redux/api/categoriesApi';
import { ProductCard } from '../../components/ProductCard';
import { ProductFilters, FilterValues } from '../../components/ProductFilters';

function ProductsCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const sortBy = (searchParams.get('sortBy') as FilterValues['sortBy']) || 'newest';
  const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: productsData, isLoading, isFetching } = useGetProductsQuery({
    search,
    category,
    minPrice,
    maxPrice,
    sortBy,
    page,
    limit: 12,
  });

  const updateFilters = (newFilters: FilterValues) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newFilters.search !== undefined) {
      if (newFilters.search) params.set('search', newFilters.search);
      else params.delete('search');
    }

    if (newFilters.category !== undefined) {
      if (newFilters.category) params.set('category', newFilters.category);
      else params.delete('category');
    }

    if (newFilters.minPrice !== undefined) {
      params.set('minPrice', String(newFilters.minPrice));
    } else if (newFilters.minPrice === undefined && 'minPrice' in newFilters) {
      params.delete('minPrice');
    }

    if (newFilters.maxPrice !== undefined) {
      params.set('maxPrice', String(newFilters.maxPrice));
    } else if (newFilters.maxPrice === undefined && 'maxPrice' in newFilters) {
      params.delete('maxPrice');
    }

    if (newFilters.sortBy) {
      params.set('sortBy', newFilters.sortBy);
    }

    if (newFilters.page) {
      params.set('page', String(newFilters.page));
    }

    router.push(`/products?${params.toString()}`);
  };

  const handleResetFilters = () => {
    router.push('/products');
  };

  const totalPages = productsData?.totalPages || 1;
  const hasProducts = productsData && productsData.items.length > 0;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Product Catalog
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {productsData ? `Showing ${productsData.total} products` : 'Loading products...'}
        </p>
      </div>

      {/* Main Catalog Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-1">
          <ProductFilters
            categories={categories}
            activeCategory={category}
            search={search}
            minPrice={minPrice}
            maxPrice={maxPrice}
            sortBy={sortBy}
            onFilterChange={updateFilters}
            onReset={handleResetFilters}
          />
        </aside>

        {/* Products Grid Column */}
        <div className="lg:col-span-3 space-y-6">
          {isLoading || isFetching ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 bg-gray-200 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : !hasProducts ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4">
              <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                <PackageX className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">No Products Found</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                No items matched your current filter criteria. Try adjusting your search query, category, or price range.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {productsData.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {hasProducts && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => updateFilters({ page: Math.max(1, page - 1) })}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-xs font-medium text-gray-700">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => updateFilters({ page: Math.min(totalPages, page + 1) })}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center text-sm text-gray-400">Loading catalog...</div>}>
      <ProductsCatalogContent />
    </Suspense>
  );
}
