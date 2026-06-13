# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server (Next.js)
pnpm build            # Production build (uses --webpack flag)
pnpm typecheck        # TypeScript check, no emit
pnpm lint             # ESLint
pnpm lint:fix         # ESLint with auto-fix
pnpm format           # Prettier write all files
pnpm format:check     # Prettier check (used in CI)
pnpm db:types         # Regenerate Supabase TypeScript types from remote schema
```

There are no tests in this project.

## Architecture

### Route Groups & Roles

Three distinct user roles drive the routing structure:

- **admin** — `src/app/(admin)/admin/` — full system access; shares the `(admin)` layout with manager
- **manager** — `src/app/(admin)/manager/` — subset of admin views; same sidebar layout as admin
- **user** — `src/app/(user)/` — inventory view + stock actions only; different navbar layout

Middleware in `src/proxy.ts` (executed via `middleware.ts`) enforces routing guards using JWT claims (`user_role`, `user_status`). Account lifecycle: `pending → active` requires admin approval; `inactive` and `rejected` states redirect to dead-end pages.

### Data Flow: Server Actions + Supabase

All data mutations and fetches go through **Next.js Server Actions** in `src/actions/`. There are no API routes for data — only the Supabase auth callback uses a route handler.

- `src/lib/supabase/server.ts` — server-side client + `getAuthContext()` (React-cached per request); reads role/status directly from JWT claims via `getClaims()` to avoid a DB roundtrip
- `src/lib/supabase/admin.ts` — service-role client for privileged operations (bypasses RLS); used inside server actions after role verification
- `src/lib/supabase/client.ts` — browser client for client components
- `src/lib/supabase/proxy.ts` — middleware client that refreshes session cookies

Every admin server action calls a `verifyAdmin()` (or `verifyUserPermission()` for user actions) helper at the top before touching the DB. Admins bypass granular permission checks; regular users have per-action boolean flags on their `profiles` row (`perm_do_sale`, `perm_do_transfer`, etc.).

### Caching Strategy

Read-heavy server actions wrap their queries in `unstable_cache` with tags (e.g., `"stock"`, `"products"`). Mutations call `revalidateTag` or `revalidatePath` after writes. The `getAuthContext()` helper is memoized with React `cache()` so multiple server components in a single render share one auth call.

### Database Schema (Key Tables)

Generated types live in `src/lib/supabase/database.types.ts` — never edit manually, always regenerate with `pnpm db:types`.

| Table | Purpose |
|---|---|
| `profiles` | Extends Supabase auth users; holds `role`, `status`, and all `perm_*` flags |
| `products` | Catalog items; linked to `categories`, `subcategories`, `brands`, `units_of_measure` |
| `stock` | Current quantity per (product × warehouse × shop_type) combination |
| `stock_movements` | Immutable ledger; `type` enum: `in`, `out`, `adjustment`, `transfer_in`, `transfer_out`, `return`, `initial_stock` |
| `stock_adjustments` / `stock_transfers` | Source records for adjustment and transfer movements |
| `profile_shop_types` | Junction table assigning users to shop types with `read_only` or `write` access |
| `shop_types` | Logical shop groupings (not physical locations) |
| `warehouses` | Physical storage locations |

### CSV Bulk Import Pipeline

`src/lib/imports/product-import/` is a self-contained pipeline triggered from the admin import page. Steps: parse CSV → validate rows → preload lookup tables → create any missing lookup entries → upsert products → upsert stock records. Returns an `ImportResult` with per-row error details.

### Component Conventions

- All filenames and folder names must be **kebab-case** (enforced by ESLint `check-file` plugin)
- shadcn/ui primitives live in `src/components/ui/` — don't edit these directly; use the `shadcn` CLI to update them
- Admin feature components follow a consistent pattern: `columns.tsx` (TanStack Table column defs) + `*-dialog.tsx` (form modals) + `*-actions.tsx` (row action menus) + `*-header.tsx` (page header with add button)
- Forms use React Hook Form + Zod; resolvers come from `@hookform/resolvers/zod`

### Import Order (Prettier)

Enforced automatically: React → Next.js → third-party → blank line → internal (`@/lib` → `@/hooks` → `@/components/ui` → `@/components`).

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # anon/publishable key (not secret)
SUPABASE_SERVICE_ROLE_KEY=              # server-only, never expose to client
```
