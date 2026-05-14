# Multi-Tenant E-Commerce — Express.js + MySQL Backend

A production-ready REST API backend for a multi-tenant marketplace, built for the semester project viva.

## Architecture

```
backend/
├── src/
│   ├── config/db.ts          # MySQL2 connection pool
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification (verifyToken, optionalAuth)
│   │   ├── role.ts           # Role-based access (checkRole)
│   │   └── tenant.ts         # Multi-tenant context (setTenantContext)
│   ├── routes/
│   │   ├── auth.ts           # /api/auth/*
│   │   ├── products.ts       # /api/products/*
│   │   ├── orders.ts         # /api/orders/*
│   │   ├── reviews.ts        # /api/reviews/*
│   │   ├── tenants.ts        # /api/tenants/*
│   │   └── admin.ts          # /api/admin/* (analytics)
│   ├── schemas/index.ts      # Zod validation schemas
│   ├── types/index.ts        # TypeScript interfaces
│   └── index.ts              # Express app entry point
├── schema.sql                # MySQL schema + seed data
└── package.json
```

## Setup

### 1. Prerequisites
- Node.js 18+
- MySQL 8.0+
- (Optional) Bun for faster installs

### 2. Database

```bash
# Create the database and run migrations
mysql -u root -p < schema.sql
```

After running the schema, generate real bcrypt hashes for the seed users:

```bash
node -e "
const bcrypt = require('bcrypt');
Promise.all([
  bcrypt.hash('Admin@123', 12),
  bcrypt.hash('Vendor@123', 12),
]).then(([a, v]) => {
  console.log('Admin hash:', a);
  console.log('Vendor hash:', v);
});
"
```

Then update the `users` table with the real hashes:
```sql
UPDATE users SET password_hash = '<admin_hash>'  WHERE id = 1;
UPDATE users SET password_hash = '<vendor_hash>' WHERE id = 2;
```

### 3. Environment

```bash
cp .env.example .env
# Edit .env with your MySQL credentials and a strong JWT_SECRET
```

### 4. Install & Run

```bash
npm install
# or: bun install

# Development (hot reload)
npm run dev

# Production build
npm run build && npm start
```

The server starts on `http://localhost:4000`.

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Get current user |

**Register body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Secret@123",
  "role": "user"
}
```

**Login response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": 1, "email": "...", "role": "admin" }
  }
}
```

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | Optional | List products (tenant-filtered) |
| GET | `/api/products/:id` | Optional | Get single product |
| POST | `/api/products` | vendor/admin | Create product |
| PUT | `/api/products/:id` | vendor/admin | Update product |
| PATCH | `/api/products/:id/archive` | vendor/admin | Toggle archive |
| DELETE | `/api/products/:id` | admin | Delete product |

**Query params for GET /api/products:**
- `search` — full-text search on name/description
- `category_id` — filter by category
- `min_price` / `max_price` — price range
- `sort` — `newest` | `oldest` | `price_asc` | `price_desc`
- `page` / `limit` — pagination

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/orders` | Bearer | List orders (role-scoped) |
| GET | `/api/orders/:id` | Bearer | Get order + items |
| POST | `/api/orders` | Bearer | Create order |
| PATCH | `/api/orders/:id/status` | vendor/admin | Update status |

### Reviews

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews` | Optional | List reviews |
| POST | `/api/reviews` | Bearer | Create review |
| PATCH | `/api/reviews/:id/reply` | vendor/admin | Vendor reply |
| PATCH | `/api/reviews/:id/approve` | admin | Approve/hide |
| DELETE | `/api/reviews/:id` | admin | Delete review |

### Admin Analytics (all require role=admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | KPI cards (users, orders, revenue) |
| GET | `/api/admin/revenue-chart?days=30` | Daily revenue data |
| GET | `/api/admin/orders-by-status` | Pie chart data |
| GET | `/api/admin/top-products?limit=10` | Top selling products |
| GET | `/api/admin/recent-orders?limit=10` | Latest orders |
| GET | `/api/admin/user-growth` | Monthly new user counts |
| GET | `/api/admin/tenant-performance` | Revenue by tenant |
| GET | `/api/admin/users` | Full user list with filters |
| PATCH | `/api/admin/users/:id/role` | Change user role/status |
| DELETE | `/api/admin/users/:id` | Delete user |

---

## Multi-Tenant Isolation

Tenant context is resolved automatically from:

1. **Subdomain** — `store.funroad.local:3000` → slug `store`
2. **Header** — `X-Tenant-Slug: mystore`
3. **JWT** — falls back to `tenant_id` in the user's token

All database queries that touch tenant-scoped data use `WHERE tenant_id = ?` parameterized queries — no raw string interpolation, so SQL injection is impossible.

---

## Security Features

- **Helmet** — sets secure HTTP headers (CSP, HSTS, etc.)
- **CORS** — whitelist-only origin policy
- **Rate limiting** — 100 req/15min globally; 20 req/15min on auth endpoints
- **bcrypt (rounds=12)** — password hashing
- **Parameterized queries** — prevents SQL injection
- **JWT RS256-compatible** — configurable secret + expiry
- **Input validation** — Zod schemas on every endpoint
- **Role-based access** — admin / vendor / user with ownership checks

---

## Database Design

### Key design decisions

1. **Tenant isolation at the row level** — every resource has `tenant_id` with a foreign key and index, enforcing data separation without schema-per-tenant complexity.

2. **Generated column for subtotal** — `order_items.subtotal` is a `STORED GENERATED ALWAYS` column, so totals are always consistent and query-able without application logic.

3. **Composite unique key on reviews** — `UNIQUE(product_id, user_id)` prevents duplicate reviews at the database level.

4. **CASCADE vs RESTRICT** — deleting a tenant cascades to its products and orders; deleting a product is `RESTRICT`ed on order_items so historical orders are preserved.

5. **Proper index strategy** — every foreign key and every column used in `WHERE` clauses has an index.

---

## Frontend Integration

### Replace tRPC calls with REST

```typescript
// Before (tRPC)
const { data } = trpc.products.getAll.useQuery();

// After (REST)
import { productsApi } from "@/lib/api-client";
const res = await productsApi.list({ page: 1, limit: 20 });
if (res.success) setProducts(res.data);
```

### Admin panel environment variable

Add to your Next.js `.env`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## Running Both Servers

```bash
# Terminal 1 — Next.js frontend
npm run dev          # port 3000

# Terminal 2 — Express backend
cd backend && npm run dev   # port 4000
```

The admin panel lives at `http://localhost:3000/admin`.

Login with `admin@platform.com` / `Admin@123` (after updating the seed hash).
