/**
 * [EDUCATIONAL NOTE: Footer Component]
 * 
 * 1. Architecture Role:
 *    Global application footer providing educational navigation, framework architecture summary,
 *    and links to documentation guides in `docs/`.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Summarizes full stack architecture: Next.js 14 App Router, RTK Query cache management,
 *      NestJS modular controllers/services, TypeORM entities, and PostgreSQL ACID transactions.
 */

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-10 mt-16 text-sm text-gray-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Purpose */}
          <div className="md:col-span-2">
            <h3 className="font-bold text-gray-900 text-base mb-2">EduStore Full-Stack Architecture</h3>
            <p className="text-gray-500 max-w-md mb-4 text-xs leading-relaxed">
              An educational web application demonstrating modern full-stack development with Next.js 14,
              Redux Toolkit Query, React Hook Form, Zod, NestJS, TypeORM, and PostgreSQL.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">Next.js 14</span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-mono">RTK Query</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-mono">NestJS</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono">TypeORM</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">PostgreSQL</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2 text-xs uppercase tracking-wider">Catalog</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/products" className="hover:text-blue-600 transition">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products?sortBy=newest" className="hover:text-blue-600 transition">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-blue-600 transition">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-2 text-xs uppercase tracking-wider">Account</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/auth/login" className="hover:text-blue-600 transition">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-blue-600 transition">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-blue-600 transition">
                  My Profile
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-blue-600 transition">
                  Order History
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} Educational Next.js & NestJS Ecommerce Project. Designed for learning.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
