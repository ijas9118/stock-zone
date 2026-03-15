# Architecture

This document explains how StockZone is structured, how data flows through the system, and the key design decisions made during development.

## System overview

StockZone is a **Next.js App Router** application backed by **Supabase** (PostgreSQL + Auth). It uses **Server Actions** as the primary data layer — there is no separate REST API. All database calls happen on the server.

```
Browser
  │
  ├─ Static assets (CSS, JS bundles) ──────────── Vercel CDN
  │
  └─ HTTP requests
       │
       ├─ Page requests ──────────────────────── Next.js Server
       │    │                                        │
       │    ├─ layouts / pages (RSC)                 │
       │    └─ Server Actions (mutations)            │
       │                                             │
       └─ Auth token refresh ─────────────── Supabase Auth
                                                     │
                                              Supabase PostgreSQL
```

## Application layers

### 1. Routing (`src/app/`)

The app uses two layout groups:

| Group     | Path prefix                       | Who can access       |
| --------- | --------------------------------- | -------------------- |
| `(admin)` | `/admin/*`, `/manager/*`          | Admin, Manager roles |
| `(user)`  | `/`, `/inventory/*`, `/profile/*` | User role            |
| `auth`    | `/auth/*`                         | Unauthenticated      |

Route protection happens in two places:

- **Middleware** (`src/proxy.ts`) — JWT claim checks before the page renders, zero database cost
- **Layout files** — Secondary check using `getAuthContext()` for server-rendered layouts

### 2. Server Actions (`src/actions/`)

All data fetching and mutations are Next.js Server Actions. They run exclusively on the server and have direct database access via the Supabase Admin client.

```
src/actions/
├── admin/
│   ├── categories.ts     — CRUD for categories and subcategories
│   ├── dashboard.ts      — Aggregated dashboard statistics
│   ├── products.ts       — Product catalog management
│   ├── shops.ts          — Shop type management
│   ├── stock.ts          — Stock reads, movements, transfers
│   ├── stock-movements.ts — Movement ledger queries
│   ├── uom.ts            — Units of measure
│   ├── users.ts          — User management and permissions
│   └── warehouses.ts     — Warehouse management
└── user/
    └── stock.ts          — User-scoped inventory and profile
```

Every admin action begins with a `verifyAdmin()` call. Stock movement actions use `verifyUserPermission()` which checks granular permission flags.

### 3. Caching (`unstable_cache`)

Read actions use Next.js `unstable_cache` with cache tags for on-demand invalidation. Write actions call `revalidateTag` to bust exactly the affected caches.

See [Caching Reference](development/caching.md) for the full tag map.

### 4. Components (`src/components/`)

Components are organized by feature and never import from sibling feature folders. The dependency direction is:

```
pages → components → ui primitives
pages → server actions
```

Client components (`"use client"`) are used only when necessary — dialogs, forms, interactive tables, and charts. Everything else is a React Server Component.

## Authentication flow

```
1. User submits login form
2. Supabase Auth validates credentials
3. JWT issued with custom claims: user_role, user_status
4. Middleware reads claims from JWT (no DB call)
5. Role-based redirect: admin → /admin, manager → /manager, user → /
6. Pending/rejected accounts → /auth/pending or /auth/rejected
```

The custom JWT claims are populated by the `custom_access_token_hook` Postgres function, which runs on every token issue. This means role/status changes take effect on the next token refresh (up to 1 hour), or immediately after the user logs out and back in.

## Database design

The stock system is built around a **ledger pattern**:

- `stock` — the current snapshot (quantity per product/warehouse/shop)
- `stock_movements` — the immutable history of every change

Every mutation to `stock` creates a corresponding row in `stock_movements`. This means you can always reconstruct the full history of any stock record.

```
stock_movements (ledger)
  ├── type: purchase | sale | adjustment | transfer_in | transfer_out | return | initial_stock
  ├── quantity_delta: positive or negative integer
  ├── previous_quantity: snapshot at time of movement
  ├── new_quantity: snapshot after movement
  └── reference_id → stock_adjustments.id OR stock_transfers.id
```

### Multi-location stock

Stock is scoped by three dimensions: `product_id + warehouse_id + shop_type_id`. This means the same product can have different quantities at different warehouse × shop combinations. Transfers move stock between warehouses while keeping the same shop type.

## Data flow: processing a stock movement

```
User clicks "Sale" button
  │
  ▼
StockMovementDialog (client component)
  │  collects quantity + notes
  ▼
processStockMovement() [server action]
  │
  ├─ verifyUserPermission("sale")
  │    └─ checks perm_do_sale flag on profiles table
  │
  ├─ SELECT current stock quantity
  │
  ├─ Validate: newQty >= 0
  │
  ├─ UPDATE stock SET quantity = newQty
  │
  ├─ INSERT stock_movements (ledger entry)
  │
  ├─ revalidateTag("admin:stocks")
  ├─ revalidateTag("admin:stock-movements")
  └─ revalidateTag("admin:dashboard")
```

## Permission model

Three layers of access control:

| Layer                | Mechanism                                            | Checked by          |
| -------------------- | ---------------------------------------------------- | ------------------- |
| Role                 | `profiles.role` (admin/manager/user)                 | Middleware + layout |
| Account status       | `profiles.status` (pending/active/inactive/rejected) | Middleware          |
| Granular permissions | `profiles.perm_*` boolean flags                      | Server actions      |
| Shop visibility      | `profile_shop_types` join table                      | User stock action   |

See [Permissions Reference](guides/permissions.md) for all flags.

## Key design decisions

**Server Actions over API routes** — Eliminates the need for a separate API layer and allows direct use of Next.js caching primitives. Server Actions are typed end-to-end.

**Admin Supabase client for mutations** — All writes use the service role client to bypass RLS. RLS is used for reads where appropriate, but admin actions explicitly check `verifyAdmin()` in TypeScript rather than relying solely on RLS.

**Tag-based cache invalidation** — Rather than using time-based revalidation alone, every mutation immediately invalidates the relevant cache tags. This keeps the UI consistent after writes without disabling caching entirely.

**JWT claims for middleware** — Role and status are embedded in the JWT so the middleware can protect routes without a database round-trip on every request.
