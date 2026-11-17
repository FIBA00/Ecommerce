# 00. Architecture Overview & System Topology

Welcome to the Educational Next.js & NestJS Ecommerce platform. This project is engineered as a production-grade educational reference, demonstrating how modern TypeScript frontend and backend technologies integrate cleanly with strict separation of concerns, end-to-end type safety, and transactional data integrity.

---

## 1. System Topology & Three-Tier Architecture

The system is organized into three distinct tiers:

```
+-------------------------------------------------------------+
|                      CLIENT / BROWSER                       |
|               Next.js 14+ App Router (Port 3000)            |
|                                                             |
|  +-------------------------+   +-------------------------+  |
|  |     React UI Pages      |   |   React Hook Form +     |  |
|  | (Catalog, Cart, Orders) |   |    Zod Schema Valid     |  |
|  +------------+------------+   +------------+------------+  |
|               |                             |               |
|               +--------------+--------------+               |
|                              |                              |
|                              v                              |
|                   +---------------------+                   |
|                   |   RTK Query Store   |                   |
|                   |  (apiSlice + Cache) |                   |
|                   +----------+----------+                   |
+------------------------------|------------------------------+
                               |
                               | HTTP REST Calls (Bearer JWT)
                               | Base URL: http://localhost:3001/api
                               v
+-------------------------------------------------------------+
|                     APPLICATION SERVER                      |
|                  NestJS Backend (Port 3001)                 |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  Global Middleware: CORS (3000), ValidationPipe       |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|  +---------------------------v---------------------------+  |
|  |  Controllers: Auth, Users, Products, Cart, Orders     |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|  +---------------------------v---------------------------+  |
|  |  Domain Services: Business Logic, Stock, Math         |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|  +---------------------------v---------------------------+  |
|  |  TypeORM Active Repositories & Data Source Pool       |  |
|  +---------------------------+---------------------------+  |
+------------------------------|------------------------------+
                               |
                               | PostgreSQL TCP Protocol
                               | Host: localhost:5433 (maps to Container: 5432)
                               v
+-------------------------------------------------------------+
|                      PERSISTENCE TIER                       |
|          Dockerized PostgreSQL 16 (Container Port 5432)     |
|                                                             |
|  Tables: users, categories, products, carts, cart_items,    |
|          orders, order_items                                |
|  Volume: postgres_data (persistent physical storage)        |
+-------------------------------------------------------------+
```

---

## 2. Full-Stack Synergy: The Technology Stack

| Layer | Technology | Primary Role |
|---|---|---|
| **Frontend Framework** | **Next.js 14+ (App Router)** | Server & Client components, layout composition, SEO-friendly routing (`/products`, `/cart`, `/checkout`, `/orders`). |
| **State & API Cache** | **Redux Toolkit & RTK Query** | Centralized client state, asynchronous API query caching, automated tag invalidation (`Product`, `Cart`, `Order`, `User`). |
| **Form Validation** | **React Hook Form + Zod** | Controlled forms with schema-driven validation, runtime client-side input sanitization. |
| **Backend Framework** | **NestJS 10** | Scalable Node.js server architecture based on Inversion of Control (IoC), Dependency Injection (DI), and modular features. |
| **Authentication** | **Passport & JWT** | Stateless Bearer token verification, password encryption with `bcryptjs`, route guarding via `JwtAuthGuard`. |
| **Object-Relational Map** | **TypeORM 0.3** | TypeScript-first entity models, relational mapping, schema migrations, QueryBuilder construction, ACID transactions. |
| **Database** | **PostgreSQL 16 Alpine** | Relational ACID-compliant database with foreign key cascades, unique constraints, and numeric precision. |
| **Containerization** | **Docker & Docker Compose** | Reproducible database provisioning, healthcheck automation, and local developer environment isolation. |

---

## 3. Network Topology & Port Mapping Contract

To prevent development port collisions with locally installed database services (such as PostgreSQL running on standard port 5432), the project enforces a strict network configuration:

```
               [ Developer Workstation ]
                          │
  ┌───────────────────────┼───────────────────────┐
  │ Port 3000             │ Port 3001             │ Port 5433
  ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌─────────────────────┐
│   Next.js    │───────▶│    NestJS    │───────▶│   PostgreSQL 16     │
│   Frontend   │  HTTP  │   Backend    │  TCP   │  (Docker Container) │
│              │ (REST) │  /api base   │        │   Container: 5432   │
└──────────────┘        └──────────────┘        └─────────────────────┘
```

1. **PostgreSQL Service**:
   - Container Internal Port: `5432`
   - Workstation Host Port: `${DB_PORT:-5433}`
   - Rationale: Standard developer laptops often run local PostgreSQL or other services on port 5432. Mapping the container to host port `5433` avoids port-in-use fatal errors while retaining standard container settings.
2. **NestJS Application Server**:
   - Workstation Host Port: `3001`
   - Global Route Prefix: `/api`
   - CORS Whitelist: Explicitly enables `http://localhost:3000` with credentials support.
3. **Next.js Application Client**:
   - Workstation Host Port: `3000`
   - RTK Query Base URL: `http://localhost:3001/api`

---

## 4. Repository Layout & Directory Structure

```
Ecommerce/
├── docker-compose.yml        # PostgreSQL container orchestrator with volume and healthchecks
├── .env.example              # Canonical reference of all required environment variables
├── .env                      # Active local development configuration
├── package.json              # Monorepo root scripts (`npm run db:up`, `npm run backend:dev`, etc.)
├── README.md                 # Primary project overview and quickstart instructions
├── backend/                  # NestJS REST API Application
│   ├── .env.example          # Backend-specific environment template
│   ├── package.json          # NestJS dependencies and scripts
│   ├── tsconfig.json         # TypeScript compiler configuration
│   ├── nest-cli.json         # NestJS CLI build tool options
│   ├── src/
│   │   ├── main.ts           # Application bootstrap: port, CORS, global ValidationPipe
│   │   ├── app.module.ts     # Root module configuring ConfigModule, Database, and feature modules
│   │   ├── database/         # DatabaseModule and standalone seed script (`seed.ts`)
│   │   ├── auth/             # JWT authentication, guards, strategy, decorators, DTOs
│   │   ├── users/            # User profile management and entities
│   │   ├── categories/       # Product classification and category catalog
│   │   ├── products/         # Product inventory, full-text search, filters, pagination
│   │   ├── cart/             # Shopping cart, quantity management, stock bounds
│   │   └── orders/           # Transactional checkout, receipt snapshotting, order history
│   └── test/                 # NestJS end-to-end integration test suite
├── frontend/                 # Next.js 14+ App Router Frontend
│   ├── package.json          # Frontend dependencies (Next.js, Redux, RTK Query, Zod)
│   ├── next.config.mjs       # Next.js runtime configuration
│   ├── tailwind.config.ts    # Tailwind styling system
│   └── src/
│       ├── app/              # Next.js App Router routes and page layouts
│       ├── components/       # Reusable modular UI components (Navbar, Cards, Filters)
│       └── lib/
│           ├── redux/        # Redux store, apiSlice, domain endpoints, tag invalidation
│           └── schemas/      # Zod validation schemas matching backend DTOs
├── tests/                    # Multi-Tier End-to-End Black-Box Test Suite
│   └── e2e/                  # 115 test cases across 4 tiers verifying the full stack
└── docs/                     # Step-by-Step Educational Documentation Guides (00 to 07)
```

---

## 5. Educational In-Code Conventions

Throughout both the backend and frontend codebases, every file starts with a structured `[EDUCATIONAL NOTE]` or `[EDUCATIONAL LINKAGE]` block.

### Example Convention:
```typescript
/**
 * [EDUCATIONAL NOTE: NestJS & TypeORM OrderItem Entity (Data Snapshotting)]
 * 
 * 1. Architecture Role:
 *    Represents an immutable receipt line item attached to a finalized Order.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Rendered in Next.js order detail views and invoices.
 *    - Returned as part of `Order` when querying `ordersApi.useGetOrderByIdQuery(id)`.
 * 
 * 3. Crucial Ecommerce Architecture Concept — Snapshotting:
 *    - In an online store, product prices and titles frequently change or products may be deleted.
 *    - An OrderItem MUST SNAPSHOT the exact `productTitle` and `price` at the second of checkout!
 */
```

These comments teach:
1. **Architecture Role**: What the file does and why it exists.
2. **Full-Stack Linkage**: Exactly which frontend component, RTK Query hook, or backend route connects to this code block.
3. **Core Architectural Insights**: Practical software engineering insights (e.g., why floating-point math is avoided, why data snapshotting is legally required for receipts, how transactions prevent race conditions).
