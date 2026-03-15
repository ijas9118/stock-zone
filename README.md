<div align="center">

<img src="public/assets/logo-pixel.png" alt="Stock Zone" width="250" />

**Modern inventory and stock management — built for teams that move fast.**

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)

[Documentation](docs/getting-started.md) · [Report a Bug](https://github.com/ijas9118/stock-zone/issues) · [Request a Feature](https://github.com/ijas9118/stock-zone/issues)

</div>

## Overview

StockZone is a full-stack inventory management system designed for businesses that need granular control over their stock across multiple warehouses and shop types. It features role-based access, a complete audit trail of every stock movement, and a fast admin dashboard with real-time charts.

Built on **Next.js App Router** with **Supabase** as the backend, it uses server actions and aggressive caching to keep latency low even at scale.

## Features

### For Admins

- **Dashboard** — 8 live stat cards, movement breakdown charts, 14-day volume graph, top stocked products, and recent user activity

- **Inventory Command Center** — Full stock visibility across all warehouses and shop types with advanced multi-filter search

- **Stock Movements Ledger** — Immutable audit trail of every purchase, sale, adjustment, transfer, and return

- **User Management** — Approve/reject accounts, assign roles, configure granular per-user permissions, and assign shop access

- **Catalog Management** — Manage products, categories, subcategories, units of measure, warehouses, and shop types

### For Users

- **Inventory View** — Browse assigned shop inventory with search and filters

- **Stock Actions** — Process sales, purchases, adjustments, transfers, and returns (based on permissions)

- **Profile** — View assigned shops, permission summary, and account details

### Platform

- **Role-based access** — Admin, Manager, and User roles with fine-grained permission flags

- **Google OAuth + Email/Password** authentication via Supabase

- **Account lifecycle** — Pending → Active flow with admin approval

- **Full dark mode** support
- **Fully responsive** — Desktop-first with complete mobile support

## Tech Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Framework       | Next.js 16 (App Router, Server Actions) |
| Language        | TypeScript 5                            |
| Database        | PostgreSQL via Supabase                 |
| Auth            | Supabase Auth (Email + Google OAuth)    |
| Styling         | Tailwind CSS v4                         |
| UI Components   | shadcn/ui + Radix UI                    |
| Forms           | React Hook Form + Zod                   |
| Tables          | TanStack Table v8                       |
| Charts          | Recharts                                |
| Package Manager | pnpm                                    |
| Deployment      | Vercel                                  |

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 10+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/ijas9118/stock-zone.git
cd stock-zone
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

| Document                                   | Description                                                      |
| ------------------------------------------ | ---------------------------------------------------------------- |
| [Getting Started](docs/getting-started.md) | Full installation, environment setup, and first-run guide        |
| [Architecture](docs/architecture.md)       | System design, folder structure, data flow, and caching strategy |
| [Admin Guide](docs/guides/admin-guide.md)  | How to manage users, stock, warehouses, and the dashboard        |
| [User Guide](docs/guides/user-guide.md)    | How to view inventory and process stock movements                |
| [API Reference](docs/api/overview.md)      | Server actions reference for all modules                         |
| [Contributing](CONTRIBUTING.md)            | Branch strategy, commit conventions, and PR guidelines           |

## Project Structure

```
src/
├── actions/          # Server actions (data fetching + mutations)
│   ├── admin/        # Admin-only actions
│   └── user/         # User-facing actions
├── app/              # Next.js App Router pages
│   ├── (admin)/      # Admin + Manager layout group
│   ├── (user)/       # User layout group
│   └── auth/         # Auth pages + callback
├── components/       # React components
│   ├── admin/        # Admin-specific UI
│   ├── user/         # User-specific UI
│   ├── auth/         # Auth forms
│   ├── dashboard/    # Shared sidebar + navbar
│   └── ui/           # Base shadcn/ui primitives
├── hooks/            # Custom React hooks
└── lib/
    ├── supabase/     # Supabase clients (admin, client, server, proxy)
    └── utils.ts      # Utility functions
```

## Scripts

```bash
pnpm dev             # Start development server
pnpm build           # Production build
pnpm start           # Start production server
pnpm typecheck       # TypeScript type check
pnpm lint            # ESLint
pnpm lint:fix        # ESLint with auto-fix
pnpm format          # Prettier format all files
pnpm format:check    # Prettier check (CI)
pnpm db:types        # Regenerate Supabase TypeScript types
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for branch conventions, commit format, and the PR process.

## License

MIT — see [LICENSE](LICENSE) for details.
