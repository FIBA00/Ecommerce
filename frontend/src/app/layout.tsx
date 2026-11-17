import './globals.css';
import type { Metadata } from 'next';
import { StoreProvider } from '../lib/redux/StoreProvider';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

/**
 * [EDUCATIONAL NOTE: Root Application Layout]
 * 
 * 1. Architecture Role:
 *    Global HTML document layout wrapper providing font definition, metadata,
 *    Redux store provider boundary, and persistent header/footer structure.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Wraps all Next.js App Router server and client components inside `StoreProvider`.
 *    - Injects Redux context and RTK Query cache synchronization into the client runtime.
 */

export const metadata: Metadata = {
  title: 'EduStore | Educational Next.js & NestJS Ecommerce',
  description:
    'Full-stack ecommerce learning platform built with Next.js 14, RTK Query, React Hook Form, Zod, NestJS, and TypeORM.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-900 antialiased">
        <StoreProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
