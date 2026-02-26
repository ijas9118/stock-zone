# StockZone — Supabase Setup & Implementation Guide

> Stack: **Next.js 16 (App Router) · Supabase · TypeScript · pnpm**
> Docs reference: https://supabase.com/docs

---

## Table of Contents

1. [Create a Supabase Project](#1-create-a-supabase-project)
2. [Install SDK & Configure Environment Variables](#2-install-sdk--configure-environment-variables)
3. [Configure Supabase Clients (SSR)](#3-configure-supabase-clients-ssr)
4. [Database Schema](#4-database-schema)
   - 4.1 [RBAC Enums & Tables](#41-rbac-enums--tables)
   - 4.2 [Profiles Table](#42-profiles-table)
   - 4.3 [Shop Types Table](#43-shop-types-table)
   - 4.4 [Warehouses Table](#44-warehouses-table)
   - 4.5 [Products Table](#45-products-table)
   - 4.6 [Stock Table](#46-stock-table)
   - 4.7 [Stock Adjustments & Transfers](#47-stock-adjustments--transfers)
5. [Row Level Security (RLS) Policies](#5-row-level-security-rls-policies)
6. [Auth Hooks — Inject Role into JWT](#6-auth-hooks--inject-role-into-jwt)
7. [Authentication — Email & Google](#7-authentication--email--google)
   - 7.1 [Enable Providers in Dashboard](#71-enable-providers-in-dashboard)
   - 7.2 [Auto-create Profile on Sign-Up](#72-auto-create-profile-on-sign-up)
   - 7.3 [Approval Flow (Admin must approve)](#73-approval-flow-admin-must-approve)
8. [Next.js Integration — File Structure](#8-nextjs-integration--file-structure)
9. [Admin Capabilities — Implementation Notes](#9-admin-capabilities--implementation-notes)
10. [Product Management — Implementation Notes](#10-product-management--implementation-notes)
11. [Warehouse Management — Implementation Notes](#11-warehouse-management--implementation-notes)
12. [Shop Type Management — Implementation Notes](#12-shop-type-management--implementation-notes)
13. [Stock Adjustments — Implementation Notes](#13-stock-adjustments--implementation-notes)
14. [Scripts (package.json)](#14-scripts-packagejson)

---

## 1. Create a Supabase Project

1. Go to **https://supabase.com** → click **Start your project** → sign in with GitHub.
2. Click **New project** and fill in:
   - **Name**: `stock-zone`
   - **Database Password**: generate a strong one and save it securely
   - **Region**: choose the region closest to your users
3. Wait ~2 minutes for provisioning.
4. Navigate to **Project Settings → API** to find:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Publishable key` (`sb_publishable_xxx`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key (secret, never expose client-side) → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **Never** commit `.env.local` to version control. Ensure `.gitignore` includes it.

---

## 2. Install SDK & Configure Environment Variables

### Install

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### Create `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx

# Only used in Server Actions / Route Handlers — never expose to client
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# App URL (for OAuth redirect)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 3. Configure Supabase Clients (SSR)

Create the following files inside `src/lib/supabase/`.

### `src/lib/supabase/client.ts` — Browser Client

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

### `src/lib/supabase/server.ts` — Server Client (Server Components / Actions)

```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookie setting handled by Proxy
          }
        },
      },
    }
  );
}
```

### `src/lib/supabase/admin.ts` — Admin Client (Server Only)

Use the `service_role` key only in trusted server contexts (Route Handlers, Server Actions with admin checks). This bypasses RLS.

```ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### `src/lib/supabase/proxy.ts` — Token Refresh Proxy

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: use getClaims() not getSession() in server middleware
  await supabase.auth.getClaims();

  return supabaseResponse;
}
```

### `proxy.ts` (project root — Next.js Proxy/Middleware)

```ts
import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## 4. Database Schema

Run the following SQL statements in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query).

### 4.1 RBAC Enums & Tables

```sql
-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
create type public.app_role as enum ('admin', 'manager', 'user');

create type public.account_status as enum ('pending', 'active', 'inactive', 'rejected');

create type public.transaction_status as enum ('pending', 'approved', 'rejected');

create type public.access_level as enum ('read_only', 'write');

create type public.app_permission as enum (
  'products.create',
  'products.edit',
  'products.delete',
  'warehouses.manage',
  'shops.manage',
  'stock.read_all',
  'stock.read_own_shop',
  'users.manage'
);

-- ─────────────────────────────────────────────
-- ROLE → PERMISSION MAPPING
-- ─────────────────────────────────────────────
create table public.role_permissions (
  id          bigint generated by default as identity primary key,
  role        public.app_role      not null,
  permission  public.app_permission not null,
  unique (role, permission)
);

-- Seed default permissions
insert into public.role_permissions (role, permission) values
  ('admin',   'products.create'),
  ('admin',   'products.edit'),
  ('admin',   'products.delete'),
  ('admin',   'warehouses.manage'),
  ('admin',   'shops.manage'),
  ('admin',   'stock.read_all'),
  ('admin',   'users.manage'),
  ('manager', 'products.create'),
  ('manager', 'products.edit'),
  ('manager', 'stock.read_all'),
  ('manager', 'warehouses.manage');
```

### 4.2 Profiles Table

```sql
-- ─────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  email           text unique not null,
  avatar_url      text,
  role            public.app_role      not null default 'user',
  status          public.account_status not null default 'pending',
  -- Granular permissions (overrides for 'user' role)
  perm_stock_read_all   boolean not null default false,
  perm_stock_own_shop   boolean not null default false,
  perm_add_products     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Keep updated_at current
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
```

> ⚠️ `shop_types` must be created **before** `profiles`. Adjust the SQL order if needed (or add the FK after creating both tables).

### 4.3 Shop Types Table

```sql
-- ─────────────────────────────────────────────
-- SHOP TYPES
-- ─────────────────────────────────────────────
create table public.shop_types (
  id          uuid primary key default gen_random_uuid(),
  name        text   not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger on_shop_types_updated
  before update on public.shop_types
  for each row execute procedure public.handle_updated_at();

-- ─────────────────────────────────────────────
-- PROFILE SHOP TYPES (user <-> shop type mapping)
-- ─────────────────────────────────────────────
create table public.profile_shop_types (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  shop_type_id  uuid not null references public.shop_types(id) on delete cascade,
  access_level  public.access_level not null default 'read_only',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (profile_id, shop_type_id)
);

create trigger on_profile_shop_types_updated
  before update on public.profile_shop_types
  for each row execute procedure public.handle_updated_at();
```

### 4.4 Warehouses Table

```sql
-- ─────────────────────────────────────────────
-- WAREHOUSES
-- ─────────────────────────────────────────────
create table public.warehouses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  location    text,
  description text,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger on_warehouses_updated
  before update on public.warehouses
  for each row execute procedure public.handle_updated_at();
```

### 4.5 Products Table

```sql
-- ─────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  brand        text,
  category     text,
  product_type text,
  uom          text,               -- unit of measure (e.g. kg, pcs, litre)
  sku          text unique,
  description  text,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger on_products_updated
  before update on public.products
  for each row execute procedure public.handle_updated_at();

-- Index for search/filter performance
create index idx_products_name     on public.products using gin (to_tsvector('english', name));
create index idx_products_brand    on public.products (brand);
create index idx_products_category on public.products (category);
```

### 4.6 Stock Table

```sql
-- ─────────────────────────────────────────────
-- STOCK (quantity per product per warehouse)
-- ─────────────────────────────────────────────
create table public.stock (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id)   on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  shop_type_id uuid not null references public.shop_types(id) on delete restrict,
  quantity     numeric not null default 0 check (quantity >= 0),
  updated_at   timestamptz not null default now(),
  unique (product_id, warehouse_id, shop_type_id)
);

create trigger on_stock_updated
  before update on public.stock
  for each row execute procedure public.handle_updated_at();
```

### 4.7 Stock Adjustments & Transfers

```sql
-- ─────────────────────────────────────────────
-- STOCK ADJUSTMENTS (manual corrections)
-- ─────────────────────────────────────────────
create table public.stock_adjustments (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id)   on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  shop_type_id uuid not null references public.shop_types(id) on delete restrict,
  quantity_delta  numeric not null,  -- positive = increase, negative = decrease
  reason       text,
  notes        text,
  status       public.transaction_status not null default 'pending',
  adjusted_by  uuid references public.profiles(id) on delete set null,
  adjusted_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- STOCK TRANSFERS (between warehouses)
-- ─────────────────────────────────────────────
create table public.stock_transfers (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products(id)          on delete cascade,
  source_warehouse_id uuid not null references public.warehouses(id)        on delete restrict,
  dest_warehouse_id   uuid not null references public.warehouses(id)        on delete restrict,
  shop_type_id        uuid not null references public.shop_types(id)        on delete restrict,
  quantity            numeric not null check (quantity > 0),
  reason              text,
  notes               text,
  status              public.transaction_status not null default 'pending',
  transferred_by      uuid references public.profiles(id) on delete set null,
  transferred_at      timestamptz not null default now(),
  check (source_warehouse_id <> dest_warehouse_id)
);
```

---

## 5. Row Level Security (RLS) Policies

Enable RLS on every table, then add fine-grained policies using the custom `authorize()` helper.

```sql
-- ─────────────────────────────────────────────
-- HELPER: authorize() — reads role from JWT
-- ─────────────────────────────────────────────
create or replace function public.authorize(
  requested_permission public.app_permission
)
returns boolean as $$
declare
  bind_permissions int;
  user_role public.app_role;
begin
  -- Read role injected into JWT by the auth hook
  select (auth.jwt() ->> 'user_role')::public.app_role into user_role;

  select count(*)
    into bind_permissions
    from public.role_permissions
   where role_permissions.permission = requested_permission
     and role_permissions.role = user_role;

  return bind_permissions > 0;
end;
$$ language plpgsql stable security definer set search_path = '';

-- ─────────────────────────────────────────────
-- HELPER: get_my_role() — convenience
-- ─────────────────────────────────────────────
create or replace function public.get_my_role()
returns public.app_role as $$
  select (auth.jwt() ->> 'user_role')::public.app_role;
$$ language sql stable security definer set search_path = '';

-- ─────────────────────────────────────────────
-- ENABLE RLS
-- ─────────────────────────────────────────────
alter table public.profiles           enable row level security;
alter table public.shop_types         enable row level security;
alter table public.warehouses         enable row level security;
alter table public.products           enable row level security;
alter table public.stock              enable row level security;
alter table public.stock_adjustments  enable row level security;
alter table public.stock_transfers    enable row level security;
alter table public.role_permissions   enable row level security;
alter table public.profile_shop_types enable row level security;

-- ─────────────────────────────────────────────
-- PROFILE SHOP TYPES POLICIES
-- ─────────────────────────────────────────────
create policy "Users can read own shop types"
  on public.profile_shop_types for select
  to authenticated
  using (profile_id = auth.uid());

create policy "Users can insert read_only for themselves"
  on public.profile_shop_types for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and access_level = 'read_only'
  );

create policy "Admins can manage profile shop types"
  on public.profile_shop_types for all
  to authenticated
  using ((SELECT authorize('users.manage')))
  with check ((SELECT authorize('users.manage')));

-- ─────────────────────────────────────────────
-- PROFILES POLICIES
-- ─────────────────────────────────────────────
-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Admins can read all profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using ((SELECT authorize('users.manage')));

-- Admins can update any profile (approve, change role, deactivate)
create policy "Admins can update profiles"
  on public.profiles for update
  to authenticated
  using ((SELECT authorize('users.manage')));

-- Users can update their own non-sensitive fields
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Admins can delete profiles
create policy "Admins can delete profiles"
  on public.profiles for delete
  to authenticated
  using ((SELECT authorize('users.manage')));

-- ─────────────────────────────────────────────
-- SHOP TYPES POLICIES
-- ─────────────────────────────────────────────
create policy "Active users can read shop types"
  on public.shop_types for select
  to authenticated
  using (is_active = true);

create policy "Admins can manage shop types"
  on public.shop_types for all
  to authenticated
  using ((SELECT authorize('shops.manage')))
  with check ((SELECT authorize('shops.manage')));

-- ─────────────────────────────────────────────
-- WAREHOUSES POLICIES
-- ─────────────────────────────────────────────
create policy "Authenticated users can read warehouses"
  on public.warehouses for select
  to authenticated
  using (true);

create policy "Admins and managers can manage warehouses"
  on public.warehouses for all
  to authenticated
  using ((SELECT authorize('warehouses.manage')))
  with check ((SELECT authorize('warehouses.manage')));

-- ─────────────────────────────────────────────
-- PRODUCTS POLICIES
-- ─────────────────────────────────────────────
create policy "Authenticated active users can read products"
  on public.products for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.status = 'active'
    )
  );

create policy "Admins and managers can insert products"
  on public.products for insert
  to authenticated
  with check (
    (SELECT authorize('products.create'))
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.perm_add_products = true
        and profiles.status = 'active'
    )
  );

create policy "Admins and managers can update products"
  on public.products for update
  to authenticated
  using ((SELECT authorize('products.edit')))
  with check ((SELECT authorize('products.edit')));

create policy "Only admins can delete products"
  on public.products for delete
  to authenticated
  using ((SELECT authorize('products.delete')));

-- ─────────────────────────────────────────────
-- STOCK POLICIES
-- ─────────────────────────────────────────────
-- Users with 'stock.read_all' or assigned shop type in profile_shop_types
create policy "Stock read — allowed shops"
  on public.stock for select
  to authenticated
  using (
    (SELECT authorize('stock.read_all'))
    or exists (
      select 1 from public.profile_shop_types
      where profile_shop_types.profile_id = auth.uid()
        and profile_shop_types.shop_type_id = stock.shop_type_id
    )
  );

-- Managers/admins can write stock
create policy "Admins and managers can manage stock"
  on public.stock for all
  to authenticated
  using ((SELECT authorize('warehouses.manage')))
  with check ((SELECT authorize('warehouses.manage')));

-- ─────────────────────────────────────────────
-- AUDIT LOG POLICIES (adjustments / transfers)
-- ─────────────────────────────────────────────
create policy "Admins and managers can read adjustments"
  on public.stock_adjustments for select
  to authenticated
  using (
    (SELECT authorize('warehouses.manage'))
  );

create policy "Admins and managers can insert adjustments"
  on public.stock_adjustments for insert
  to authenticated
  with check ((SELECT authorize('warehouses.manage')));

create policy "Admins and managers can read transfers"
  on public.stock_transfers for select
  to authenticated
  using ((SELECT authorize('warehouses.manage')));

create policy "Admins and managers can insert transfers"
  on public.stock_transfers for insert
  to authenticated
  with check ((SELECT authorize('warehouses.manage')));

-- ─────────────────────────────────────────────
-- ROLE PERMISSIONS — read-only for authenticated
-- ─────────────────────────────────────────────
create policy "Anyone authenticated can read role_permissions"
  on public.role_permissions for select
  to authenticated
  using (true);
```

---

## 6. Auth Hooks — Inject Role into JWT

This hook runs before every token issue and injects `user_role` and account `status` into the JWT so RLS policies can read them without a DB round trip.

Go to **Dashboard → Authentication → Hooks** and register a **Custom Access Token** hook pointing to the function below.

```sql
-- Run in SQL Editor first
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims   jsonb;
  profile  record;
begin
  select role, status
    into profile
    from public.profiles
   where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if profile.role is not null then
    claims := jsonb_set(claims, '{user_role}',   to_jsonb(profile.role::text));
    claims := jsonb_set(claims, '{user_status}', to_jsonb(profile.status::text));
  else
    claims := jsonb_set(claims, '{user_role}',   '"user"');
    claims := jsonb_set(claims, '{user_status}', '"pending"');
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Grant access to auth admin
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

grant all on table public.profiles to supabase_auth_admin;
revoke all on table public.profiles from authenticated, anon, public;

-- Required RLS policy for auth admin
create policy "Allow auth admin to read profiles"
  on public.profiles as permissive for select
  to supabase_auth_admin
  using (true);
```

Then in the Dashboard → **Authentication → Hooks**:

1. Click **Add Hook** → choose **Custom Access Token**
2. Select **Postgres Function** → pick `public.custom_access_token_hook`
3. Save

---

## 7. Authentication — Email & Google

### 7.1 Enable Providers in Dashboard

**Email/Password:**

- Dashboard → Authentication → Providers → Email → Enable
- Enable **"Confirm email"** so users must verify before the admin approves.

**Google OAuth:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Create a project
2. APIs & Services → Credentials → **Create OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URIs:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local dev)
4. Copy **Client ID** and **Client Secret**
5. Dashboard → Authentication → Providers → Google → paste Client ID & Secret → Enable

### 7.2 Auto-create Profile on Sign-Up

Create a database trigger that automatically inserts a `profiles` row when a new user signs up. New users start with `status = 'pending'` so they cannot access the app until approved.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'user',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 7.3 Approval Flow (Admin must approve)

The approval flow works as follows:

1. User registers (email/Google) → profile created with `status = 'pending'`
2. Admin visits the **User Management** page → sees pending users
3. Admin clicks **Approve** → a Server Action calls the admin client to update `status = 'active'`
4. Admin clicks **Reject** → updates `status = 'rejected'`

Middleware checks `user_status` from the JWT and redirects non-active users to a "Pending Approval" page.

**Middleware check in `proxy.ts`:**

```ts
// Inside updateSession, after getClaims()
const {
  data: { user },
} = await supabase.auth.getUser();

if (user) {
  const claims = await supabase.auth.getClaims();
  const status = claims?.data?.claims?.user_status;

  const isAppRoute = !request.nextUrl.pathname.startsWith("/auth");
  if (isAppRoute && status === "pending") {
    return NextResponse.redirect(new URL("/auth/pending", request.url));
  }
  if (isAppRoute && status === "rejected") {
    return NextResponse.redirect(new URL("/auth/rejected", request.url));
  }
}
```

---

## 8. Next.js Integration — File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # Email/Google sign-in
│   │   ├── register/
│   │   │   └── page.tsx          # Self-registration
│   │   ├── pending/
│   │   │   └── page.tsx          # Awaiting admin approval
│   │   ├── rejected/
│   │   │   └── page.tsx          # Account rejected
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Auth guard + sidebar
│   │   ├── page.tsx              # Overview dashboard
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   │   └── page.tsx      # User management
│   │   │   ├── shops/
│   │   │   │   └── page.tsx      # Shop type management
│   │   ├── warehouses/
│   │   │   └── page.tsx          # Warehouse management
│   │   ├── products/
│   │   │   └── page.tsx          # Product management
│   │   └── stock/
│   │       └── page.tsx          # Stock / transfers
│   └── layout.tsx
├── lib/
│   └── supabase/
│       ├── client.ts             # Browser client
│       ├── server.ts             # Server client
│       ├── admin.ts              # Service-role client
│       └── proxy.ts              # Token refresh proxy
├── hooks/
│   └── use-user.ts               # Client-side user + role hook
├── actions/
│   ├── auth-actions.ts           # Login, logout, register
│   ├── user-actions.ts           # Approve, reject, change role
│   ├── product-actions.ts        # CRUD products
│   ├── warehouse-actions.ts      # CRUD warehouses
│   ├── shop-actions.ts           # CRUD shop types
│   └── stock-actions.ts          # Adjustments, transfers
└── components/
    ├── ui/                        # shadcn components
    ├── theme-provider.tsx
    ├── theme-toggle.tsx
    ├── auth/
    │   └── login-form.tsx
    ├── users/
    │   └── user-table.tsx
    ├── products/
    │   └── product-table.tsx
    ├── warehouses/
    │   └── warehouse-card.tsx
    └── stock/
        └── transfer-dialog.tsx
```

---

## 9. Admin Capabilities — Implementation Notes

### Auth Callback Route (`src/app/(auth)/callback/route.ts`)

```ts
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
```

### View & Manage Users (Server Action)

```ts
// src/actions/user-actions.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function approveUser(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const claims = await supabase.auth.getClaims();
  if (claims?.data?.claims?.user_role !== "admin")
    throw new Error("Unauthorized");

  const admin = createAdminClient();
  return admin.from("profiles").update({ status: "active" }).eq("id", userId);
}

export async function rejectUser(userId: string) {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims?.data?.claims?.user_role !== "admin")
    throw new Error("Unauthorized");

  const admin = createAdminClient();
  return admin.from("profiles").update({ status: "rejected" }).eq("id", userId);
}

export async function changeUserRole(
  userId: string,
  role: "admin" | "manager" | "user"
) {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims?.data?.claims?.user_role !== "admin")
    throw new Error("Unauthorized");

  const admin = createAdminClient();
  return admin.from("profiles").update({ role }).eq("id", userId);
}

export async function updateUserPermissions(
  userId: string,
  perms: {
    perm_stock_read_all?: boolean;
    perm_stock_own_shop?: boolean;
    perm_add_products?: boolean;
  }
) {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims?.data?.claims?.user_role !== "admin")
    throw new Error("Unauthorized");

  const admin = createAdminClient();
  return admin.from("profiles").update(perms).eq("id", userId);
}

export async function deactivateUser(userId: string) {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims?.data?.claims?.user_role !== "admin")
    throw new Error("Unauthorized");

  const admin = createAdminClient();
  return admin.from("profiles").update({ status: "inactive" }).eq("id", userId);
}

export async function deleteUser(userId: string) {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims?.data?.claims?.user_role !== "admin")
    throw new Error("Unauthorized");

  const admin = createAdminClient();
  // Deleting from auth.users cascades to profiles
  return admin.auth.admin.deleteUser(userId);
}
```

### Invite User by Email

```ts
export async function inviteUser(
  email: string,
  role: "admin" | "manager" | "user"
) {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  if (claims?.data?.claims?.user_role !== "admin")
    throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) throw error;

  // Set role and approve immediately (invited by admin = pre-approved)
  await admin
    .from("profiles")
    .update({ role, status: "active" })
    .eq("id", data.user.id);
}
```

---

## 10. Product Management — Implementation Notes

### Fetch with Search & Filter (Server Action)

```ts
// src/actions/product-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function getProducts({
  search,
  brand,
  category,
  productType,
}: {
  search?: string;
  brand?: string;
  category?: string;
  productType?: string;
}) {
  const supabase = await createClient();
  let query = supabase.from("products").select("*").eq("is_active", true);

  if (search) query = query.ilike("name", `%${search}%`);
  if (brand) query = query.eq("brand", brand);
  if (category) query = query.eq("category", category);
  if (productType) query = query.eq("product_type", productType);

  return query.order("created_at", { ascending: false });
}

export async function createProduct(data: {
  name: string;
  brand?: string;
  category?: string;
  product_type?: string;
  uom?: string;
  sku?: string;
  description?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return supabase.from("products").insert({ ...data, created_by: user!.id });
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  const supabase = await createClient();
  return supabase.from("products").update(data).eq("id", id);
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  // Soft delete
  return supabase.from("products").update({ is_active: false }).eq("id", id);
}
```

---

## 11. Warehouse Management — Implementation Notes

### Warehouse CRUD + Stock Summary (Server Action)

```ts
// src/actions/warehouse-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function getWarehouseStockSummary(warehouseId: string) {
  const supabase = await createClient();
  return supabase
    .from("stock")
    .select("quantity, products(name, brand, category, uom)")
    .eq("warehouse_id", warehouseId)
    .order("quantity", { ascending: false });
}

export async function transferStock({
  productId,
  sourceWarehouseId,
  destWarehouseId,
  shopTypeId,
  quantity,
  reason,
  notes,
}: {
  productId: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  shopTypeId: string;
  quantity: number;
  reason?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Use a Postgres function (RPC) to execute atomically
  return supabase.rpc("transfer_stock", {
    p_product_id: productId,
    p_source_warehouse_id: sourceWarehouseId,
    p_dest_warehouse_id: destWarehouseId,
    p_shop_type_id: shopTypeId,
    p_quantity: quantity,
    p_reason: reason,
    p_notes: notes,
    p_transferred_by: user!.id,
  });
}
```

### Atomic transfer RPC function (run in SQL Editor)

```sql
create or replace function public.transfer_stock(
  p_product_id           uuid,
  p_source_warehouse_id  uuid,
  p_dest_warehouse_id    uuid,
  p_shop_type_id         uuid,
  p_quantity             numeric,
  p_reason               text default null,
  p_notes                text default null,
  p_transferred_by       uuid default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_access_level text;
  v_is_admin boolean;
begin
  -- Check user permissions
  select role = 'admin' into v_is_admin from public.profiles where id = p_transferred_by;

  select access_level into v_access_level
  from public.profile_shop_types
  where profile_id = p_transferred_by and shop_type_id = p_shop_type_id;

  if not v_is_admin and v_access_level is null then
    raise exception 'Unauthorized to access this shop type';
  end if;

  if v_is_admin or v_access_level = 'write' then
    -- Deduct from source
    update public.stock
       set quantity = quantity - p_quantity
     where product_id = p_product_id
       and warehouse_id = p_source_warehouse_id
       and shop_type_id = p_shop_type_id;

    if not found then
      raise exception 'Source stock record not found';
    end if;

    -- Add to destination (upsert)
    insert into public.stock (product_id, warehouse_id, shop_type_id, quantity)
      values (p_product_id, p_dest_warehouse_id, p_shop_type_id, p_quantity)
      on conflict (product_id, warehouse_id, shop_type_id)
      do update set quantity = stock.quantity + excluded.quantity;

    -- Log the transfer as approved
    insert into public.stock_transfers (
      product_id, source_warehouse_id, dest_warehouse_id, shop_type_id,
      quantity, reason, notes, transferred_by, status
    ) values (
      p_product_id, p_source_warehouse_id, p_dest_warehouse_id, p_shop_type_id,
      p_quantity, p_reason, p_notes, p_transferred_by, 'approved'
    );
  else
    -- Read-only access: Log as pending
    insert into public.stock_transfers (
      product_id, source_warehouse_id, dest_warehouse_id, shop_type_id,
      quantity, reason, notes, transferred_by, status
    ) values (
      p_product_id, p_source_warehouse_id, p_dest_warehouse_id, p_shop_type_id,
      p_quantity, p_reason, p_notes, p_transferred_by, 'pending'
    );
  end if;
end;
$$;
```

---

## 12. Shop Type Management — Implementation Notes

```ts
// src/actions/shop-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function getShopTypes() {
  const supabase = await createClient();
  return supabase.from("shop_types").select("*").order("name");
}

export async function createShopType(data: {
  name: string;
  description?: string;
}) {
  const supabase = await createClient();
  return supabase.from("shop_types").insert(data);
}

export async function updateShopType(
  id: string,
  data: { name?: string; description?: string; is_active?: boolean }
) {
  const supabase = await createClient();
  return supabase.from("shop_types").update(data).eq("id", id);
}

export async function deactivateShopType(id: string) {
  const supabase = await createClient();
  return supabase.from("shop_types").update({ is_active: false }).eq("id", id);
}
```

---

## 13. Stock Adjustments — Implementation Notes

```ts
// src/actions/stock-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function adjustStock({
  productId,
  warehouseId,
  shopTypeId,
  quantityDelta,
  reason,
  notes,
}: {
  productId: string;
  warehouseId: string;
  shopTypeId: string;
  quantityDelta: number;
  reason?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_warehouse_id: warehouseId,
    p_shop_type_id: shopTypeId,
    p_delta: quantityDelta,
    p_reason: reason,
    p_notes: notes,
    p_adjusted_by: user!.id,
  });
}

export async function getAdjustmentLog(warehouseId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("stock_adjustments")
    .select("*, products(name), warehouses(name), profiles(full_name)")
    .order("adjusted_at", { ascending: false });

  if (warehouseId) query = query.eq("warehouse_id", warehouseId);
  return query;
}
```

### Atomic adjustment RPC (run in SQL Editor)

```sql
create or replace function public.adjust_stock(
  p_product_id   uuid,
  p_warehouse_id uuid,
  p_shop_type_id uuid,
  p_delta        numeric,
  p_reason       text default null,
  p_notes        text default null,
  p_adjusted_by  uuid default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_access_level text;
  v_is_admin boolean;
begin
  -- Check user permissions
  select role = 'admin' into v_is_admin from public.profiles where id = p_adjusted_by;

  select access_level into v_access_level
  from public.profile_shop_types
  where profile_id = p_adjusted_by and shop_type_id = p_shop_type_id;

  if not v_is_admin and v_access_level is null then
    raise exception 'Unauthorized to access this shop type';
  end if;

  if v_is_admin or v_access_level = 'write' then
    insert into public.stock (product_id, warehouse_id, shop_type_id, quantity)
      values (p_product_id, p_warehouse_id, p_shop_type_id, greatest(0, p_delta))
      on conflict (product_id, warehouse_id, shop_type_id)
      do update set quantity = greatest(0, stock.quantity + p_delta);

    insert into public.stock_adjustments (
      product_id, warehouse_id, shop_type_id, quantity_delta, reason, notes, adjusted_by, status
    ) values (
      p_product_id, p_warehouse_id, p_shop_type_id, p_delta, p_reason, p_notes, p_adjusted_by, 'approved'
    );
  else
    -- Read-only access: Log as pending
    insert into public.stock_adjustments (
      product_id, warehouse_id, shop_type_id, quantity_delta, reason, notes, adjusted_by, status
    ) values (
      p_product_id, p_warehouse_id, p_shop_type_id, p_delta, p_reason, p_notes, p_adjusted_by, 'pending'
    );
  end if;
end;
$$;

-- ─────────────────────────────────────────────
-- APPROVAL MECHANISMS (Admin only)
-- ─────────────────────────────────────────────
create or replace function public.approve_transaction(
  p_table text,
  p_id uuid,
  p_admin_id uuid default (auth.uid())
)
returns void
language plpgsql
security definer
as $$
declare
  v_is_admin boolean;
  v_rec record;
begin
  select role = 'admin' into v_is_admin from public.profiles where id = p_admin_id;
  if not v_is_admin then
    raise exception 'Unauthorized';
  end if;

  if p_table = 'stock_transfers' then
    select * into v_rec from public.stock_transfers where id = p_id and status = 'pending';
    if not found then raise exception 'Transaction not found or not pending'; end if;

    -- Deduct source
    update public.stock set quantity = quantity - v_rec.quantity
    where product_id = v_rec.product_id and warehouse_id = v_rec.source_warehouse_id and shop_type_id = v_rec.shop_type_id;

    -- Add destination
    insert into public.stock (product_id, warehouse_id, shop_type_id, quantity)
      values (v_rec.product_id, v_rec.dest_warehouse_id, v_rec.shop_type_id, v_rec.quantity)
      on conflict (product_id, warehouse_id, shop_type_id)
      do update set quantity = stock.quantity + excluded.quantity;

    update public.stock_transfers set status = 'approved' where id = p_id;
  elsif p_table = 'stock_adjustments' then
    select * into v_rec from public.stock_adjustments where id = p_id and status = 'pending';
    if not found then raise exception 'Transaction not found or not pending'; end if;

    insert into public.stock (product_id, warehouse_id, shop_type_id, quantity)
      values (v_rec.product_id, v_rec.warehouse_id, v_rec.shop_type_id, greatest(0, v_rec.quantity_delta))
      on conflict (product_id, warehouse_id, shop_type_id)
      do update set quantity = greatest(0, stock.quantity + v_rec.quantity_delta);

    update public.stock_adjustments set status = 'approved' where id = p_id;
  else
    raise exception 'Invalid table type';
  end if;
end;
$$;

create or replace function public.reject_transaction(
  p_table text,
  p_id uuid,
  p_admin_id uuid default (auth.uid())
)
returns void
language plpgsql
security definer
as $$
declare
  v_is_admin boolean;
begin
  select role = 'admin' into v_is_admin from public.profiles where id = p_admin_id;
  if not v_is_admin then
    raise exception 'Unauthorized';
  end if;

  if p_table = 'stock_transfers' then
    update public.stock_transfers set status = 'rejected' where id = p_id and status = 'pending';
  elsif p_table = 'stock_adjustments' then
    update public.stock_adjustments set status = 'rejected' where id = p_id and status = 'pending';
  else
    raise exception 'Invalid table type';
  end if;
end;
$$;
```

---

## 14. Scripts (package.json)

The following are already configured. Add them if missing:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "lint:fix": "eslint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check . --ignore-path .prettierignore",
    "db:types": "supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/lib/supabase/database.types.ts"
  }
}
```

### Generate TypeScript Types from Supabase

```bash
pnpm add -D supabase
pnpm db:types
```

Import and use in clients:

```ts
import type { Database } from "@/lib/supabase/database.types";

createBrowserClient<Database>(url, key);
```

---

## Quick-Start Checklist

- [ ] Create Supabase project and copy env vars to `.env.local`
- [ ] `pnpm add @supabase/supabase-js @supabase/ssr`
- [ ] Create `src/lib/supabase/` files (client, server, admin, proxy)
- [ ] Run `proxy.ts` configuration at project root
- [ ] Run all SQL from Section 4 in Supabase SQL Editor (in order)
- [ ] Run RLS policies from Section 5
- [ ] Run auth hook function and enable it in Dashboard → Auth → Hooks
- [ ] Enable Email + Google providers in Dashboard → Auth → Providers
- [ ] Run `handle_new_user` trigger SQL
- [ ] Run `transfer_stock` and `adjust_stock` RPC functions
- [ ] Create auth callback route at `src/app/(auth)/callback/route.ts`
- [ ] Implement `pending` and `rejected` pages under `src/app/(auth)/`
- [ ] Add middleware status check in `proxy.ts`
- [ ] Generate TypeScript types: `pnpm db:types`

---

> **References**
>
> - [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
> - [SSR Auth Setup](https://supabase.com/docs/guides/auth/server-side/nextjs)
> - [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
> - [Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
> - [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
> - [Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)
> - [Supabase Admin API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)

| Type     | Description                                           | Example                                           |
| -------- | ----------------------------------------------------- | ------------------------------------------------- |
| feat     | Adding a new feature                                  | feat(sidebar): add user profile to footer         |
| fix      | Bug fixes                                             | fix(auth): redirect user to login on token expiry |
| chore    | Maintenance, package updates, config                  | chore: install husky and commitlint               |
| docs     | Documentation changes                                 | docs: update readme with setup instructions       |
| style    | Formatting, semi-colons, white-space (no logic)       | style: run prettier fix                           |
| refactor | Code change that neither fixes a bug nor adds feature | refactor: move nav items to client component      |
| perf     | Performance improvement                               | perf: lazy load heavy dashboard widgets           |
| test     | Adding or correcting tests                            | test: add unit test for sidebar component         |
| ci       | CI/CD configuration changes                           | ci: add dev branch to pipeline                    |
