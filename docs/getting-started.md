# Getting Started

This guide walks you through installing StockZone locally, configuring your environment, and getting the app running for the first time.

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement      | Minimum Version | Notes                 |
| ---------------- | --------------- | --------------------- |
| Node.js          | 22.x            | LTS recommended       |
| pnpm             | 10.x            | `npm install -g pnpm` |
| Git              | Any             | For cloning           |
| Supabase account | —               | Free tier works fine  |

## 1. Clone the repository

```bash
git clone https://github.com/ijas9118/stock-zone.git
cd stock-zone
```

## 2. Install dependencies

```bash
pnpm install
```

This installs all production and development dependencies including ESLint, Prettier, Husky, and commitlint.

## 3. Set up Supabase

### 3a. Create a project

1. Go to [supabase.com](https://supabase.com) and sign in

2. Click **New Project**

3. Choose a name, database password, and region

4. Wait for the project to provision (~1 minute)

### 3b. Run the database schema

Open your Supabase project's **SQL Editor** and run the schema migrations in order. The schema includes:

- `profiles` — user accounts linked to Supabase Auth

- `products` — product catalog

- `categories` / `subcategories` — product classification

- `units_of_measure` — measurement units

- `warehouses` — physical storage locations

- `shop_types` — sales channel types

- `stock` — current stock levels per product/warehouse/shop

- `stock_movements` — immutable movement ledger

- `stock_adjustments` — adjustment records

- `stock_transfers` — transfer records

- `profile_shop_types` — user-to-shop-type assignments

- `role_permissions` — role-based permission matrix

> See [Database Reference](development/database.md) for the full schema and index setup.

### 3c. Enable Google OAuth (optional)

1. In Supabase, go to **Authentication → Providers**

2. Enable **Google**

3. Add your Google OAuth credentials from [console.cloud.google.com](https://console.cloud.google.com)

4. Set the redirect URL to `https://your-project.supabase.co/auth/v1/callback`

### 3d. Configure the custom access token hook

StockZone uses a Supabase custom access token hook (`custom_access_token_hook`) to embed `user_role` and `user_status` into JWT claims. This is required for the middleware to work without database round-trips.

In Supabase, go to **Authentication → Hooks** and configure the `custom_access_token_hook` function.

## 4. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Fill in your values:

```env
# Required — from Supabase project settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJh...your-anon-key

# Required — from Supabase project settings → API (secret)
SUPABASE_SERVICE_ROLE_KEY=eyJh...your-service-role-key
```

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Never expose it client-side. It is only used in server-side admin actions.

## 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the login page. If you have no users yet, go to `/auth/signup` to create your first account, then manually set its status to `active` and role to `admin` in your Supabase dashboard under the `profiles` table.

## 6. Regenerate TypeScript types (optional)

If you make schema changes, regenerate the Supabase TypeScript types:

```bash
pnpm db:types
```

This writes updated types to `src/lib/supabase/database.types.ts`.

## First login flow

```
Sign up → Status: "pending" → Admin activates account → Log in → Dashboard
```

The first admin account must be activated manually in the Supabase dashboard. All subsequent accounts can be managed through the User Management UI at `/admin/users`.

## Next steps

- [Architecture overview](architecture.md) — understand how the app is structured

- [Admin Guide](guides/admin-guide.md) — learn how to manage inventory

- [Deployment](deployment.md) — deploy to Vercel
