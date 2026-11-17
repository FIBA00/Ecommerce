# 01. Setup & Docker Infrastructure Guide

This guide provides end-to-end instructions for provisioning the PostgreSQL container, configuring environment variables, running the idempotent database seeder, and starting both development servers.

---

## 1. Prerequisites

Before beginning, ensure your development workstation meets the following requirements:
- **Node.js**: v18.17.0+ or v20.x (LTS recommended)
- **npm**: v9.x or v10.x
- **Docker**: Docker Engine 24.x+ or Docker Desktop
- **Docker Compose**: v2.x+ (accessible via `docker compose`)

Verify your installation:
```bash
node -v
npm -v
docker --version
docker compose version
```

---

## 2. Docker Compose PostgreSQL Service

The root `docker-compose.yml` configures an isolated, production-like PostgreSQL 16 database.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ecommerce_postgres
    restart: unless-stopped
    ports:
      # Host port 5433 maps to container port 5432 to prevent collision with local PostgreSQL
      - "${DB_PORT:-5433}:5432"
    environment:
      POSTGRES_USER: ${DB_USERNAME:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-ecommerce_dev}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME:-postgres} -d ${DB_NAME:-ecommerce_dev}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

### Architectural Breakdown:
1. **Host Port Collision Mitigation (`"${DB_PORT:-5433}:5432"`)**:
   - By default, PostgreSQL listens on port 5432. Many developers already run a local PostgreSQL instance on their host machines. Binding container port 5432 directly to host port 5432 often causes `port is already allocated` errors.
   - We default the external host port to `5433` while keeping the internal container port as `5432`.
2. **Healthcheck (`pg_isready`)**:
   - Ensures the database engine is fully initialized and accepting socket connections before backend services attempt to connect.
3. **Volume Persistence (`postgres_data`)**:
   - Mounts `/var/lib/postgresql/data` into a named Docker volume so your catalog, user records, and orders persist across container restarts.

### Launching the Container:
```bash
# Launch database in background
npm run db:up

# Check container status and health
docker compose ps
```

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

### Configuration Parameters:
```dotenv
# Database Configuration (PostgreSQL in Docker)
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=ecommerce_dev

# Backend Application Configuration
PORT=3001
NODE_ENV=development

# JWT Authentication Secret
JWT_SECRET=supersecretjwtkey12345
JWT_EXPIRES_IN=7d

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

> **Educational Note on Dual `.env` Resolution**:  
> In `backend/src/app.module.ts`, `ConfigModule.forRoot` specifies `envFilePath: ['.env', '../.env']`. This allows the NestJS application to seamlessly read configuration whether launched directly from within `backend/` or from the project root via npm scripts!

---

## 4. Database Seeding (`npm run seed`)

Once PostgreSQL is running and healthy, seed the database with initial categories, realistic merchandise, and demonstration accounts.

```bash
# Run seeder from root
npm run backend:seed

# Or run directly inside the backend directory
cd backend && npm run seed
```

### What the Seeder Populates:
1. **4 Product Categories**:
   - Electronics (`slug: electronics`)
   - Clothing (`slug: clothing`)
   - Books (`slug: books`)
   - Home & Kitchen (`slug: home-kitchen`)
2. **12 Realistic Products**:
   - Each item includes title, description, real-world price, warehouse inventory stock, high-resolution Unsplash photo URL, and category linkage.
3. **2 Demo User Accounts**:
   - **Customer User**: `user@example.com` / `password123` (Role: `user`)
   - **Store Administrator**: `admin@example.com` / `admin123` (Role: `admin`)
   - Automatically provisions an active, empty shopping cart for each user.

### Idempotency Guarantee:
The seeder checks for existing records before inserting (`categoryRepo.findOne({ where: { slug } })`, `productRepo.findOne({ where: { name } })`, `userRepo.findOne({ where: { email } })`). Running the seeder multiple times is 100% safe and will not create duplicate data.

---

## 5. Running the Application

### Unified Root Scripts:
The root `package.json` provides scripts to manage all services:

| Command | Action |
|---|---|
| `npm run db:up` | Starts PostgreSQL container in background |
| `npm run db:down` | Stops PostgreSQL container |
| `npm run backend:dev` | Launches NestJS in watch mode on `http://localhost:3001` |
| `npm run backend:build` | Compiles NestJS backend TypeScript to `dist/` |
| `npm run backend:test` | Runs Jest unit tests across all backend services |
| `npm run backend:seed` | Populates database with demonstration catalog and accounts |
| `npm run frontend:dev` | Launches Next.js dev server on `http://localhost:3000` |
| `npm run frontend:build` | Compiles Next.js production bundle |
| `npm run test:e2e` | Runs comprehensive 115-test multi-tier opaque-box E2E test suite |

### Recommended Development Startup Sequence:
1. **Terminal 1 (Database)**:
   ```bash
   npm run db:up
   ```
2. **Terminal 2 (Database Seed)**:
   ```bash
   npm run backend:seed
   ```
3. **Terminal 3 (NestJS Backend)**:
   ```bash
   npm run backend:dev
   ```
4. **Terminal 4 (Next.js Frontend)**:
   ```bash
   npm run frontend:dev
   ```

Open your browser to `http://localhost:3000` to browse the store, or query `http://localhost:3001/api/products` to inspect the raw REST API.

---

## 6. Troubleshooting Common Issues

### Issue 1: `bind: address already in use` (Port 5433)
- **Cause**: Another service is using host port 5433.
- **Fix**: Change `DB_PORT=5434` in `.env` and `docker-compose.yml`, then restart container.

### Issue 2: `Connection refused` on `localhost:5433`
- **Cause**: PostgreSQL container has not finished booting or healthcheck has not passed.
- **Fix**: Run `docker compose ps` to inspect container health. Wait for `(healthy)` status.

### Issue 3: CORS error in browser console (`Access to fetch at ... blocked by CORS policy`)
- **Cause**: `FRONTEND_URL` in backend `.env` does not match the frontend origin.
- **Fix**: Verify `FRONTEND_URL=http://localhost:3000` in `.env`.
