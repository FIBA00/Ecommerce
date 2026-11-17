/**
 * [EDUCATIONAL NOTE: Next.js Configuration]
 * 
 * 1. Architecture Role:
 *    Configures Next.js runtime environment, strict mode, and remote image domains.
 * 
 * 2. Full-Stack Linkage:
 *    Allows Next.js Image component to load external product images seeded from Unsplash
 *    and placeholder services (seeded via backend/src/database/seeds/seed.ts).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
  },
};

export default nextConfig;
