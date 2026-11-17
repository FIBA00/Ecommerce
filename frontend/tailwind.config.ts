/**
 * [EDUCATIONAL NOTE: Tailwind CSS Configuration]
 * 
 * 1. Architecture Role:
 *    Defines theme extensions, responsive breakpoints, and content scan paths for utility class generation.
 * 
 * 2. Full-Stack Linkage:
 *    Applied throughout frontend components in `src/components` and pages in `src/app`.
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
