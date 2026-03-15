# Contributing

Thank you for your interest in contributing to StockZone. This document explains our workflow, conventions, and standards.

## Development setup

Follow the [Getting Started guide](docs/getting-started.md) to set up your local environment.

The repository uses:

- **pnpm** for package management

- **ESLint** + **Prettier** for code style (enforced by Husky pre-commit hooks)

- **commitlint** for commit message format (enforced on commit-msg hook)

- **TypeScript strict mode** — no `any` unless absolutely necessary and explicitly commented

## Branch strategy

| Branch                    | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `main`                    | Production-ready code. Protected. Requires PR + CI pass.   |
| `dev`                     | Integration branch. All feature branches merge here first. |
| `feat/short-description`  | New features                                               |
| `fix/short-description`   | Bug fixes                                                  |
| `chore/short-description` | Maintenance tasks (deps, config, CI)                       |
| `docs/short-description`  | Documentation only                                         |

Always branch from `dev`, not `main`.

```bash
git checkout dev
git pull origin dev
git checkout -b feat/my-feature
```

## Commit message format

This project follows [Conventional Commits](https://www.conventionalcommits.org). Your commit message must match this pattern:

```
<type>(<scope>): <short description>
```

### Types

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `chore`    | Build, deps, config, CI changes                         |
| `docs`     | Documentation changes only                              |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test`     | Adding or updating tests                                |
| `style`    | Formatting only (no logic change)                       |
| `perf`     | Performance improvement                                 |

### Examples

```
feat(stock): add initial stock validation check
fix(dashboard): correct product aggregation key to use ID
chore(deps): update next to 16.1.6
docs(api): add transferStock parameter reference
refactor(actions): extract verifyUserPermission to shared util
```

Commit messages are validated automatically by commitlint before the commit is accepted.

## Pull request process

1. **Open a PR against `dev`**, not `main`

2. Fill in the PR template (what changed, why, how to test)

3. Ensure all CI checks pass:
   - Format check (`pnpm format:check`)

   - Lint (`pnpm lint`)

   - Type check (`pnpm typecheck`)

   - Build (`pnpm build`)

4. Request a review from a maintainer

5. Squash merge when approved

## Code standards

### File naming

All files must use `kebab-case`:

```
user-inventory-view.tsx  ✓
UserInventoryView.tsx    ✗
```

This is enforced by `eslint-plugin-check-file`.

### Component organization

- Server Components by default — add `"use client"` only when needed

- Client components are: forms, dialogs, interactive tables, charts, anything using hooks

- Keep components focused — extract when a component exceeds ~200 lines

### Server Actions

- Always start mutations with `verifyAdmin()` or `verifyUserPermission()`

- Always use the Admin Supabase client (`createAdminClient()`) in server actions

- Use `unstable_cache` for all read actions that return list data

- Call `revalidateTag` after every successful mutation — never skip this

- Return `{ success: true }` or `{ error: string }` — never throw from mutation actions

### TypeScript

- Avoid `as unknown as X` casts — fix the root type issue instead where possible

- Export types from the action files where they are defined

- Use Zod for all form validation schemas

### Styling

- Use Tailwind utility classes — no custom CSS unless absolutely necessary

- Follow the existing responsive pattern: `text-xs sm:text-sm`, `p-3 sm:p-4`

- Use `cn()` from `@/lib/utils` for conditional class merging

## Adding a new admin section

When adding a new resource (e.g. "suppliers"):

1. **Database** — add the Supabase table and types, regenerate with `pnpm db:types`

2. **Actions** — create `src/actions/admin/suppliers.ts` with CRUD + `verifyAdmin()` + cache tags

3. **Components** — create `src/components/admin/suppliers/` with columns, dialog, header, and actions

4. **Page** — create `src/app/(admin)/admin/suppliers/page.tsx` and `loading.tsx`

5. **Sidebar** — add the route to the `navItems` array in `src/components/dashboard/app-sidebar.tsx`

## Reporting bugs

Open an issue on GitHub with:

- Steps to reproduce

- Expected behaviour

- Actual behaviour

- Browser and OS (if relevant)

- Screenshots if applicable
