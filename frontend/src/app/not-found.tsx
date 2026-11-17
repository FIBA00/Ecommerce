/**
 * [EDUCATIONAL NOTE: Custom 404 Page Component]
 * 
 * 1. Architecture Role:
 *    Custom Not Found fallback page rendered by Next.js App Router when a route
 *    or entity resource cannot be located.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Catches unknown client-side routes and missing catalog product IDs.
 */

import React from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
        <HelpCircle className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-3">
        404 - Page Not Found
      </h1>
      <p className="text-base text-gray-500 max-w-md mb-8">
        The page or product you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
}
