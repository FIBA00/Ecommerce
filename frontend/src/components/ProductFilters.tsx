'use client';

/**
 * [EDUCATIONAL NOTE: ProductFilters Component]
 * 
 * 1. Architecture Role:
 *    Sidebar or toolbar component providing faceted filtering for the product catalog:
 *    category selection, price boundaries, keyword search, and ordering.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Category Chips: Populated by `categoriesApi.useGetCategoriesQuery()`.
 *    - Search & Price Bounds: Validated against `filterSchema` in `src/lib/schemas/filter.schema.ts`.
 *    - Dispatches updated query parameters to `productsApi.useGetProductsQuery(params)`.
 *    - Maps to NestJS `ProductsController.findAll(query: GetProductsQueryDto)` and SQL query builder.
 * 
 * 3. State & Validation Mechanics:
 *    - Enforces minPrice <= maxPrice before triggering query update.
 */

import React, { useState } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import type { Category } from '../types';

export interface FilterValues {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'name';
  page?: number;
}

interface ProductFiltersProps {
  categories: Category[];
  activeCategory?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  onFilterChange: (filters: FilterValues) => void;
  onReset: () => void;
}

export function ProductFilters({
  categories,
  activeCategory,
  search: initialSearch = '',
  minPrice: initialMinPrice,
  maxPrice: initialMaxPrice,
  sortBy: initialSortBy = 'newest',
  onFilterChange,
  onReset,
}: ProductFiltersProps) {
  const [minPrice, setMinPrice] = useState<string>(
    initialMinPrice !== undefined ? String(initialMinPrice) : ''
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    initialMaxPrice !== undefined ? String(initialMaxPrice) : ''
  );
  const [priceError, setPriceError] = useState<string | null>(null);

  const handleCategoryClick = (slug: string) => {
    const newCategory = activeCategory === slug ? undefined : slug;
    onFilterChange({ category: newCategory, page: 1 });
  };

  const handlePriceApply = (e: React.FormEvent) => {
    e.preventDefault();
    setPriceError(null);

    const min = minPrice ? parseFloat(minPrice) : undefined;
    const max = maxPrice ? parseFloat(maxPrice) : undefined;

    if (min !== undefined && min < 0) {
      setPriceError('Min price cannot be negative');
      return;
    }
    if (max !== undefined && max < 0) {
      setPriceError('Max price cannot be negative');
      return;
    }
    if (min !== undefined && max !== undefined && min > max) {
      setPriceError('Min price cannot exceed max price');
      return;
    }

    onFilterChange({
      minPrice: min,
      maxPrice: max,
      page: 1,
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      sortBy: e.target.value as FilterValues['sortBy'],
      page: 1,
    });
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setPriceError(null);
    onReset();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filters</span>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition"
          title="Reset all filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Sort Selector */}
      <div>
        <label htmlFor="sort-select" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Sort By
        </label>
        <select
          id="sort-select"
          value={initialSortBy}
          onChange={handleSortChange}
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="newest">Newest Arrivals</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name">Name: A to Z</option>
        </select>
      </div>

      {/* Categories Filter */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
          Categories
        </h4>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onFilterChange({ category: undefined, page: 1 })}
            className={`text-left text-xs px-2.5 py-1.5 rounded-lg transition ${
              !activeCategory
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.slug || activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`text-left text-xs px-2.5 py-1.5 rounded-lg transition ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
          Price Range ($)
        </h4>
        <form onSubmit={handlePriceApply} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Max"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {priceError && (
            <p className="text-xs text-red-600">{priceError}</p>
          )}

          <button
            type="submit"
            className="w-full py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            Apply Price
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProductFilters;
