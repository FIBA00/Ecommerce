# Educational Next.js & NestJS Ecommerce Full-Stack Application

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-red?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Postgres-2496ED?logo=docker)](https://www.docker.com/)
[![Redux Toolkit](https://img.shields.io/badge/RTK_Query-2.2-764ABC?logo=redux)](https://redux-toolkit.js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Zod](https://img.shields.io/badge/Zod-3.23-3E67B1?logo=zod)](https://zod.dev/)
[![Jest](https://img.shields.io/badge/Jest-Tested-C21325?logo=jest)](https://jestjs.io/)
[![E2E Tests](https://img.shields.io/badge/E2E_Tests-115%20Passing-success)](#testing--verification)

A production-grade, fully typed ecommerce application built with **Next.js 14 App Router** and **NestJS 10**, backed by **TypeORM** and **PostgreSQL**.

Designed explicitly as a comprehensive educational benchmark, every single source file across the frontend and backend includes structured `[EDUCATIONAL NOTE]` and `[EDUCATIONAL LINKAGE]` comment blocks explaining how components, RTK Query hooks, NestJS controllers, TypeORM entities, and PostgreSQL tables connect across the full stack.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                          NEXT.JS 14 FRONTEND                           │
│  React Server & Client Components • Tailwind CSS • Lucide Icons        │
│  React Hook Form • Zod Schema Validation                               │
├────────────────────────────────────────────────────────────────────────┤
│                          REDUX TOOLKIT & RTK QUERY                     │
│  StoreProvider • apiSlice (prepareHeaders JWT Injection)               │
│  6-Tag Cache Invalidation Matrix: Product | Category | Cart | Order... │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST API (JSON)
                                    │ Port 3001 (/api)
┌───────────────────────────────────▼────────────────────────────────────┐
│                           NESTJS 10 BACKEND                            │
│  Global ValidationPipe • Passport JWT AuthGuard • CurrentUser Decorator│
│  Feature Modules: Auth | Users | Categories | Products | Cart | Orders │
├────────────────────────────────────────────────────────────────────────┤
│                           TYPEORM ORM LAYER                            │
│  Entities • SelectQueryBuilder (Search/Filter) • DataSource Transaction│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ PostgreSQL Driver (pg)
                                    │ Port 5433:5432 (Docker)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        POSTGRESQL 16 DATABASE                          │
│  users • categories • products • carts • cart_items • orders • items   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **Docker & Docker Compose**: Installed and running on host
- **NPM**: v9 or later

### Step 1: Clone and Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd Ecommerce

# Install root, backend, and frontend dependencies
npm install
npm --prefix backend install
npm --prefix frontend install
```

### Step 2: Configure Environment Variables
Copy the default environment templates:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

> **Note on Database Port**: The Docker service maps host port **`5433`** to container port `5432`. This prevents port collision with any local PostgreSQL instance already running on port 5432.

### Step 3: Launch PostgreSQL via Docker
```bash
npm run db:up
```

### Step 4: Seed the Database
Populate categories, product catalog items with images, and test user accounts:
```bash
npm run backend:seed
```

Seeded test accounts:
- **Customer**: `user@example.com` / `password123`
- **Admin**: `admin@example.com` / `admin123`

### Step 5: Start Development Servers
In two separate terminal windows:
```bash
# Terminal 1: Start NestJS Backend (http://localhost:3001)
npm run backend:dev

# Terminal 2: Start Next.js Frontend (http://localhost:3000)
npm run frontend:dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Verification

The repository includes a comprehensive multi-tier test harness with **115 passing tests** across 4 verification tiers:

```bash
# Run complete 4-tier E2E verification suite
npm run test:e2e

# Run with verbose reporting
npm run test:e2e -- --verbose

# Run specific tier
npm run test:e2e -- --tier=1  # Feature Coverage (50 tests)
npm run test:e2e -- --tier=2  # Boundaries & Corner Cases (50 tests)
npm run test:e2e -- --tier=3  # Cross-Feature Interactions (10 tests)
npm run test:e2e -- --tier=4  # Real-World Scenarios (5 tests)

# Run backend unit tests
npm run backend:test

# Run backend integration tests
npm --prefix backend run test:e2e
```

---

## Educational Documentation Suite (`docs/`)

Explore the step-by-step guides detailing every architectural decision and framework mechanic:

| Guide | Title | Key Topics Covered |
|---|---|---|
| **[00](docs/00_architecture_overview.md)** | Architecture Overview | Full-stack design, component taxonomy, state & security |
| **[01](docs/01_setup_and_docker_guide.md)** | Setup & Docker Guide | PostgreSQL Docker setup, port collision mitigation, seeding |
| **[02](docs/02_database_and_typeorm_entities.md)** | Database & TypeORM Entities | 7 relational entities, data types, migrations, snapshotting |
| **[03](docs/03_nestjs_backend_architecture.md)** | NestJS Backend Architecture | Modules, controllers, services, guards, DTO validation |
| **[04](docs/04_nextjs_frontend_and_rtk_query.md)** | Next.js Frontend & RTK Query | App Router, Redux store, RTK Query API slice, cache tags |
| **[05](docs/05_forms_and_zod_validation.md)** | Forms & Zod Validation | React Hook Form, Zod schemas, client-to-DTO parity |
| **[06](docs/06_end_to_end_data_flows_and_linkages.md)** | End-to-End Data Flows | 5 complete user journeys traced with ASCII sequence diagrams |
| **[07](docs/07_testing_and_verification_guide.md)** | Testing & Verification Guide | Jest unit tests, integration tests, 4-tier E2E test harness |

---

## Project Structure

```
.
├── docker-compose.yml       # PostgreSQL 16 container definition (port 5433:5432)
├── package.json             # Root unified scripts orchestrator
├── README.md                # Project documentation & quickstart
├── backend/                 # NestJS 10 REST API Application
│   ├── src/
│   │   ├── auth/            # JWT authentication, bcrypt, guards & decorators
│   │   ├── users/           # User entity & profile management
│   │   ├── categories/      # Category entity & catalog taxonomy
│   │   ├── products/        # Product entity, search & query builder
│   │   ├── cart/            # Cart & CartItem entities, stock check logic
│   │   ├── orders/          # Order & OrderItem entities, atomic checkout transaction
│   │   ├── database/        # TypeORM configuration & seed script
│   │   ├── app.module.ts    # Root application module
│   │   └── main.ts          # Application bootstrap & global pipes
│   └── test/                # Supertest controller integration tests
├── frontend/                # Next.js 14 App Router Application
│   ├── src/
│   │   ├── app/             # App router pages (catalog, cart, checkout, orders...)
│   │   ├── components/      # UI components (Navbar, ProductCard, Filters...)
│   │   ├── lib/
│   │   │   ├── redux/       # Redux Toolkit store, apiSlice, authSlice
│   │   │   └── schemas/     # Zod validation schemas
│   │   └── types/           # Full-stack shared TypeScript interfaces
├── tests/                   # Standalone 4-Tier E2E Test Suite (115 tests)
│   └── e2e/
│       ├── run-all.mjs      # Test runner with CLI arguments & summary table
│       ├── tier1-feature-coverage.test.mjs
│       ├── tier2-boundary-corner.test.mjs
│       ├── tier3-cross-feature.test.mjs
│       ├── tier4-real-world-scenarios.test.mjs
│       └── helpers/         # API client, env, fixtures, suite helpers
└── docs/                    # 8 Comprehensive Educational Guides
```

---

## Available NPM Scripts

| Script | Purpose |
|---|---|
| `npm run db:up` | Starts PostgreSQL container in background |
| `npm run db:down` | Stops PostgreSQL container |
| `npm run backend:dev` | Starts NestJS API server in watch mode on port 3001 |
| `npm run backend:seed` | Seeds database with categories, products, and test accounts |
| `npm run backend:test` | Runs Jest unit tests across all backend services |
| `npm run frontend:dev` | Starts Next.js frontend dev server on port 3000 |
| `npm run frontend:build` | Compiles and builds Next.js production bundle |
| `npm run test:e2e` | Runs standalone 115-test E2E test harness across 4 tiers |

---

## License
MIT
