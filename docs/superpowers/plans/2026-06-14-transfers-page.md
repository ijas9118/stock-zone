# Transfers Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dedicated transfers pages for admin (full history, filterable table, detail page with complete/cancel) and user (pending-only card list with complete/cancel), replacing the pending transfers section on the inventory detail page, with a new bottom tab bar for user navigation.

**Architecture:** Two dedicated action modules (`src/actions/admin/transfers.ts` and `src/actions/user/transfers.ts`) own all transfer queries and mutations. `completeTransfer` is moved from `stock.ts` into these modules and updated to require a `destLocationId` at completion time (previously optional at creation). Admin uses a TanStack Table at `/admin/transfers` with a detail page at `/admin/transfers/[transferId]`; users get a card list at `/transfers` with a new fixed bottom tab bar.

**Tech Stack:** Next.js 15 App Router, Server Actions, Supabase (admin client), TanStack Table, shadcn/ui, React Hook Form + Zod, Lucide React, Tailwind CSS.

---

## File Map

**Create:**
- `src/actions/admin/transfers.ts` — `getTransfers`, `getTransferById`, `completeTransfer`, `cancelTransfer` (admin-gated)
- `src/actions/user/transfers.ts` — `getTransfers` (pending only), `getWarehouseLocations`, `completeTransfer`, `cancelTransfer` (`perm_do_transfer`-gated)
- `src/components/admin/transfers/columns.tsx` — TanStack column defs for transfers table
- `src/components/admin/transfers/transfers-filters.tsx` — status filter via URL search params
- `src/components/admin/transfers/transfers-table.tsx` — DataTable wrapper with row-click nav
- `src/components/admin/transfers/transfers-header.tsx` — page header with count
- `src/components/admin/transfers/complete-transfer-dialog.tsx` — location picker dialog (admin)
- `src/components/admin/transfers/transfer-detail-view.tsx` — full detail + actions for detail page
- `src/app/(admin)/admin/transfers/page.tsx` — admin transfers list page
- `src/app/(admin)/admin/transfers/loading.tsx` — skeleton for list page
- `src/app/(admin)/admin/transfers/[transferId]/page.tsx` — admin detail page
- `src/app/(admin)/admin/transfers/[transferId]/loading.tsx` — skeleton for detail page
- `src/components/user/transfers/complete-transfer-dialog.tsx` — location picker dialog (user)
- `src/components/user/transfers/transfer-card.tsx` — single pending transfer card
- `src/components/user/transfers/transfers-list.tsx` — list of transfer cards
- `src/app/(user)/transfers/page.tsx` — user transfers page
- `src/app/(user)/transfers/loading.tsx` — skeleton for user transfers
- `src/components/user/layout/bottom-tab-bar.tsx` — fixed bottom navigation

**Modify:**
- `src/actions/admin/stock.ts` — remove `completeTransfer` and `cancelTransfer`; add `revalidateTag("admin:transfers", "default")` to `transferStock`
- `src/components/dashboard/app-sidebar.tsx` — add Transfers link under Inventory & Operations
- `src/components/user/inventory/inventory-detail-view.tsx` — remove pending transfers card and related imports/props
- `src/app/(user)/inventory/[stockId]/page.tsx` — remove `getPendingTransfers` call and prop
- `src/app/(user)/layout.tsx` — add BottomTabBar, add `pb-24` to main

---

## Task 1: Admin transfers action file

**Files:**
- Create: `src/actions/admin/transfers.ts`

- [ ] Create `src/actions/admin/transfers.ts` with the following complete content:

```typescript
"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

import { processStockMovement } from "./stock";

export type TransferStatus = Database["public"]["Enums"]["transaction_status"];

export type TransferWithDetails = {
  id: string;
  product_id: string;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  shop_type_id: string;
  quantity: number;
  notes: string | null;
  transferred_at: string;
  status: TransferStatus;
  dest_location_id: string | null;
  products: { name: string; sku: string | null } | null;
  source_warehouse: { name: string } | null;
  dest_warehouse: { name: string } | null;
  shop_types: { name: string } | null;
  profiles: { full_name: string | null; email: string } | null;
  dest_location: { location_code: string } | null;
};

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin") throw new Error("Forbidden: Admin access required");
}

export async function getTransfers(
  params: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  await verifyAdmin();

  const { status, page = 1, pageSize = 10 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();

      let query = adminClient
        .from("stock_transfers")
        .select(
          `
          id,
          product_id,
          source_warehouse_id,
          dest_warehouse_id,
          shop_type_id,
          quantity,
          notes,
          transferred_at,
          status,
          dest_location_id,
          products(name, sku),
          source_warehouse:warehouses!stock_transfers_source_warehouse_id_fkey(name),
          dest_warehouse:warehouses!stock_transfers_dest_warehouse_id_fkey(name),
          shop_types(name),
          profiles:transferred_by(full_name, email),
          dest_location:locations!stock_transfers_dest_location_id_fkey(location_code)
          `,
          { count: "exact" }
        )
        .order("transferred_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status as TransferStatus);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw new Error("Failed to fetch transfers");

      return {
        transfers: data as unknown as TransferWithDetails[],
        totalCount: count || 0,
      };
    },
    ["admin-transfers", status || "all", String(page), String(pageSize)],
    { tags: ["admin:transfers"], revalidate: 60 }
  )();
}

export async function getTransferById(id: string) {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("stock_transfers")
    .select(
      `
      id,
      product_id,
      source_warehouse_id,
      dest_warehouse_id,
      shop_type_id,
      quantity,
      notes,
      transferred_at,
      status,
      dest_location_id,
      products(name, sku),
      source_warehouse:warehouses!stock_transfers_source_warehouse_id_fkey(name),
      dest_warehouse:warehouses!stock_transfers_dest_warehouse_id_fkey(name),
      shop_types(name),
      profiles:transferred_by(full_name, email),
      dest_location:locations!stock_transfers_dest_location_id_fkey(location_code)
      `
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as TransferWithDetails;
}

export async function completeTransfer(
  transferId: string,
  destLocationId: string
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { data: transfer, error: fetchError } = await adminClient
      .from("stock_transfers")
      .select("*")
      .eq("id", transferId)
      .single();

    if (fetchError || !transfer) return { error: "Transfer not found" };
    if (transfer.status !== "pending")
      return { error: "Transfer is not in pending status" };

    const { error: locationUpdateError } = await adminClient
      .from("stock_transfers")
      .update({ dest_location_id: destLocationId })
      .eq("id", transferId);

    if (locationUpdateError) throw locationUpdateError;

    const outResult = await processStockMovement({
      productId: transfer.product_id,
      warehouseId: transfer.source_warehouse_id,
      shopTypeId: transfer.shop_type_id,
      quantityDelta: -transfer.quantity,
      type: "transfer_out",
      referenceId: transferId,
      notes: transfer.notes ?? undefined,
    });

    if (outResult.error) return outResult;

    const inResult = await processStockMovement({
      productId: transfer.product_id,
      warehouseId: transfer.dest_warehouse_id,
      shopTypeId: transfer.shop_type_id,
      quantityDelta: transfer.quantity,
      type: "transfer_in",
      referenceId: transferId,
      notes: transfer.notes ?? undefined,
      locationId: destLocationId,
    });

    if (inResult.error) {
      await processStockMovement({
        productId: transfer.product_id,
        warehouseId: transfer.source_warehouse_id,
        shopTypeId: transfer.shop_type_id,
        quantityDelta: transfer.quantity,
        type: "transfer_in",
        referenceId: transferId,
        notes: `Reversal: inbound failed — ${inResult.error}`,
      });
      await adminClient
        .from("stock_transfers")
        .update({ status: "cancelled" })
        .eq("id", transferId);
      return inResult;
    }

    const { error: statusError } = await adminClient
      .from("stock_transfers")
      .update({ status: "completed" })
      .eq("id", transferId);

    if (statusError) throw statusError;

    revalidateTag("admin:transfers", "default");
    revalidateTag("admin:stocks", "default");
    revalidateTag("admin:stock-movements", "default");
    revalidateTag("admin:dashboard", "default");
    revalidatePath("/admin/transfers");
    revalidatePath("/admin/stock");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function cancelTransfer(transferId: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { data: transfer, error: fetchError } = await adminClient
      .from("stock_transfers")
      .select("status")
      .eq("id", transferId)
      .single();

    if (fetchError || !transfer) return { error: "Transfer not found" };
    if (transfer.status !== "pending")
      return { error: "Only pending transfers can be cancelled" };

    const { error } = await adminClient
      .from("stock_transfers")
      .update({ status: "cancelled" })
      .eq("id", transferId);

    if (error) throw error;

    revalidateTag("admin:transfers", "default");
    revalidatePath("/admin/transfers");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
```

- [ ] Run typecheck: `pnpm typecheck`
  Expected: no errors in the new file.

- [ ] Commit:
```bash
git add src/actions/admin/transfers.ts
git commit -m "feat: add admin transfers action module"
```

---

## Task 2: User transfers action file

**Files:**
- Create: `src/actions/user/transfers.ts`

`getWarehouseLocations` is a user-accessible location fetcher (auth-only, no admin guard) because the admin `getLocations` in `src/actions/admin/locations.ts` is admin-gated and cannot be called from user components.

- [ ] Create `src/actions/user/transfers.ts` with the following complete content:

```typescript
"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

import { processStockMovement } from "@/actions/admin/stock";

export type UserTransferWithDetails = {
  id: string;
  product_id: string;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  shop_type_id: string;
  quantity: number;
  notes: string | null;
  transferred_at: string;
  dest_location_id: string | null;
  products: { name: string; sku: string | null } | null;
  source_warehouse: { name: string } | null;
  dest_warehouse: { name: string } | null;
  shop_types: { name: string } | null;
  profiles: { full_name: string | null; email: string } | null;
};

async function verifyAuth() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  return auth;
}

async function verifyTransferPermission() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) throw new Error("Unauthorized");

  if (auth.role === "admin") return auth.userId;

  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("perm_do_transfer")
    .eq("id", auth.userId)
    .single();

  if (error || !profile)
    throw new Error("Forbidden: Could not verify user permissions");

  if (!profile.perm_do_transfer)
    throw new Error(
      "Forbidden: You do not have permission to perform transfer"
    );

  return auth.userId;
}

export async function getTransfers(
  params: { page?: number; pageSize?: number } = {}
): Promise<{ transfers: UserTransferWithDetails[]; totalCount: number }> {
  await verifyAuth();
  const { page = 1, pageSize = 20 } = params;

  const adminClient = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await adminClient
    .from("stock_transfers")
    .select(
      `
      id,
      product_id,
      source_warehouse_id,
      dest_warehouse_id,
      shop_type_id,
      quantity,
      notes,
      transferred_at,
      dest_location_id,
      products(name, sku),
      source_warehouse:warehouses!stock_transfers_source_warehouse_id_fkey(name),
      dest_warehouse:warehouses!stock_transfers_dest_warehouse_id_fkey(name),
      shop_types(name),
      profiles:transferred_by(full_name, email)
      `,
      { count: "exact" }
    )
    .eq("status", "pending")
    .order("transferred_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error("Failed to fetch transfers");

  return {
    transfers: data as unknown as UserTransferWithDetails[],
    totalCount: count || 0,
  };
}

export async function getWarehouseLocations(
  warehouseId: string
): Promise<{ id: string; location_code: string }[]> {
  await verifyAuth();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("locations")
    .select("id, location_code")
    .eq("warehouse_id", warehouseId)
    .eq("is_active", true)
    .order("location_code");

  if (error) return [];
  return data as { id: string; location_code: string }[];
}

export async function completeTransfer(
  transferId: string,
  destLocationId: string
) {
  try {
    await verifyTransferPermission();
    const adminClient = createAdminClient();

    const { data: transfer, error: fetchError } = await adminClient
      .from("stock_transfers")
      .select("*")
      .eq("id", transferId)
      .single();

    if (fetchError || !transfer) return { error: "Transfer not found" };
    if (transfer.status !== "pending")
      return { error: "Transfer is not in pending status" };

    const { error: locationUpdateError } = await adminClient
      .from("stock_transfers")
      .update({ dest_location_id: destLocationId })
      .eq("id", transferId);

    if (locationUpdateError) throw locationUpdateError;

    const outResult = await processStockMovement({
      productId: transfer.product_id,
      warehouseId: transfer.source_warehouse_id,
      shopTypeId: transfer.shop_type_id,
      quantityDelta: -transfer.quantity,
      type: "transfer_out",
      referenceId: transferId,
      notes: transfer.notes ?? undefined,
    });

    if (outResult.error) return outResult;

    const inResult = await processStockMovement({
      productId: transfer.product_id,
      warehouseId: transfer.dest_warehouse_id,
      shopTypeId: transfer.shop_type_id,
      quantityDelta: transfer.quantity,
      type: "transfer_in",
      referenceId: transferId,
      notes: transfer.notes ?? undefined,
      locationId: destLocationId,
    });

    if (inResult.error) {
      await processStockMovement({
        productId: transfer.product_id,
        warehouseId: transfer.source_warehouse_id,
        shopTypeId: transfer.shop_type_id,
        quantityDelta: transfer.quantity,
        type: "transfer_in",
        referenceId: transferId,
        notes: `Reversal: inbound failed — ${inResult.error}`,
      });
      await adminClient
        .from("stock_transfers")
        .update({ status: "cancelled" })
        .eq("id", transferId);
      return inResult;
    }

    const { error: statusError } = await adminClient
      .from("stock_transfers")
      .update({ status: "completed" })
      .eq("id", transferId);

    if (statusError) throw statusError;

    revalidateTag("admin:transfers", "default");
    revalidateTag("admin:stocks", "default");
    revalidateTag("admin:stock-movements", "default");
    revalidateTag("admin:dashboard", "default");
    revalidatePath("/transfers");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function cancelTransfer(transferId: string) {
  try {
    await verifyTransferPermission();
    const adminClient = createAdminClient();

    const { data: transfer, error: fetchError } = await adminClient
      .from("stock_transfers")
      .select("status")
      .eq("id", transferId)
      .single();

    if (fetchError || !transfer) return { error: "Transfer not found" };
    if (transfer.status !== "pending")
      return { error: "Only pending transfers can be cancelled" };

    const { error } = await adminClient
      .from("stock_transfers")
      .update({ status: "cancelled" })
      .eq("id", transferId);

    if (error) throw error;

    revalidateTag("admin:transfers", "default");
    revalidatePath("/transfers");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
```

- [ ] Run typecheck: `pnpm typecheck`
  Expected: no errors in the new file.

- [ ] Commit:
```bash
git add src/actions/user/transfers.ts
git commit -m "feat: add user transfers action module"
```

---

## Task 3: Remove pending transfers from inventory detail view

Do this before modifying `stock.ts` so TypeScript stays clean throughout.

**Files:**
- Modify: `src/components/user/inventory/inventory-detail-view.tsx`
- Modify: `src/app/(user)/inventory/[stockId]/page.tsx`

- [ ] Open `src/components/user/inventory/inventory-detail-view.tsx`.

  **a) Remove these two imports at the top:**
  ```typescript
  import { cancelTransfer, completeTransfer } from "@/actions/admin/stock";
  import { PendingTransfer, UserStockWithDetails } from "@/actions/user/stock";
  ```
  Replace with (keeping only what's needed):
  ```typescript
  import { UserStockWithDetails } from "@/actions/user/stock";
  ```

  **b) Remove `CheckCircle2` and `XCircle` from the lucide-react import** (they were only used in the pending transfers section). Keep `ArrowRightLeft` — it's still used on the Transfer action button.

  **c) Remove `useTransition` from the React import** (it was only used for the pending transfer handlers).

  **d) Update the props interface** — remove `pendingTransfers`:
  ```typescript
  interface InventoryDetailViewProps {
    stock: UserStockWithDetails;
    permissions: {
      perm_do_transfer: boolean;
      perm_do_adjustment: boolean;
      perm_do_purchase: boolean;
      perm_do_sale: boolean;
    };
  }
  ```

  **e) Update the function signature** — remove `pendingTransfers` from destructuring:
  ```typescript
  export function InventoryDetailView({
    stock,
    permissions,
  }: InventoryDetailViewProps) {
  ```

  **f) Remove these lines from the function body:**
  ```typescript
  const [isPending, startTransition] = useTransition();
  ```

  **g) Remove the `handleComplete` function entirely.**

  **h) Remove the `handleCancel` function entirely.**

  **i) Remove the entire "Pending Transfers" Card block** — the JSX block that starts with:
  ```typescript
  {pendingTransfers.length > 0 && (
    <Card className="border shadow-sm">
      ...
    </Card>
  )}
  ```

- [ ] Open `src/app/(user)/inventory/[stockId]/page.tsx`. Read its current content, then:

  **a) Remove** the import of `getPendingTransfers` from `@/actions/user/stock`.

  **b) Remove** the `getPendingTransfers(...)` call (it was likely inside a `Promise.all`). If it was the only call in a `Promise.all`, convert it back to a plain `await`. If it was alongside other calls, simply remove it from the `Promise.all` array.

  **c) Remove** the `pendingTransfers` variable that received the result.

  **d) Remove** the `pendingTransfers={pendingTransfers}` prop from `<InventoryDetailView />`.

- [ ] Run typecheck: `pnpm typecheck`
  Expected: no errors.

- [ ] Commit:
```bash
git add src/components/user/inventory/inventory-detail-view.tsx src/app/(user)/inventory/
git commit -m "refactor: remove pending transfers section from inventory detail view"
```

---

## Task 4: Update stock.ts — remove moved exports

**Files:**
- Modify: `src/actions/admin/stock.ts`

- [ ] Open `src/actions/admin/stock.ts`.

  **a) Delete the entire `completeTransfer` function** — find it by its signature `export async function completeTransfer(transferId: string)` and delete from that line through its closing `}`.

  **b) Delete the entire `cancelTransfer` function** — find it by `export async function cancelTransfer(transferId: string)` and delete from that line through its closing `}`.

  **c) In the `transferStock` function**, add `revalidateTag("admin:transfers", "default")` to the revalidation block inside the `try` block, immediately before `return { success: true, transferId: transfer.id }`:
  ```typescript
    revalidatePath("/admin/stock");
    revalidatePath("/");
    revalidateTag("admin:transfers", "default");
    return { success: true, transferId: transfer.id };
  ```

- [ ] Run typecheck: `pnpm typecheck`
  Expected: no errors (the only callers of `completeTransfer`/`cancelTransfer` from `stock.ts` were in `inventory-detail-view.tsx`, already removed in Task 3).

- [ ] Commit:
```bash
git add src/actions/admin/stock.ts
git commit -m "refactor: remove completeTransfer and cancelTransfer from stock.ts; revalidate transfers on transferStock"
```

---

## Task 5: Admin transfers table components

**Files:**
- Create: `src/components/admin/transfers/columns.tsx`
- Create: `src/components/admin/transfers/transfers-filters.tsx`
- Create: `src/components/admin/transfers/transfers-table.tsx`
- Create: `src/components/admin/transfers/transfers-header.tsx`

- [ ] Create `src/components/admin/transfers/columns.tsx`:

```typescript
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowRightLeft } from "lucide-react";

import { TransferWithDetails } from "@/actions/admin/transfers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-400",
  },
};

export const columns: ColumnDef<TransferWithDetails>[] = [
  {
    accessorKey: "transferred_at",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.original.transferred_at);
      return (
        <div className="flex flex-col">
          <span className="text-[11px] sm:text-xs md:text-sm">
            {format(date, "MMM d, yyyy")}
          </span>
          <span className="text-muted-foreground text-[10px] sm:text-[11px]">
            {format(date, "hh:mm a")}
          </span>
        </div>
      );
    },
  },
  {
    id: "product",
    header: "Product",
    cell: ({ row }) => {
      const product = row.original.products;
      return (
        <div className="flex flex-col">
          <span className="text-[11px] font-medium sm:text-xs md:text-sm">
            {product?.name || "Unknown"}
          </span>
          <span className="text-muted-foreground font-mono text-[10px] whitespace-nowrap sm:text-[11px]">
            {product?.sku || "No SKU"}
          </span>
        </div>
      );
    },
  },
  {
    id: "route",
    header: "Route",
    cell: ({ row }) => {
      const src = (row.original.source_warehouse as { name: string } | null)
        ?.name;
      const dst = (row.original.dest_warehouse as { name: string } | null)
        ?.name;
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium">{src || "—"}</span>
          <ArrowRightLeft className="text-muted-foreground h-3 w-3 shrink-0" />
          <span className="font-medium">{dst || "—"}</span>
        </div>
      );
    },
  },
  {
    id: "shop",
    header: "Shop",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.shop_types?.name || "—"}
      </span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold">
        {row.original.quantity}
      </span>
    ),
  },
  {
    id: "by",
    header: "By",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) => {
      const profile = row.original.profiles;
      return (
        <span className="text-muted-foreground text-xs">
          {profile?.full_name || profile?.email || "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const config = statusConfig[row.original.status];
      return (
        <Badge
          variant="outline"
          className={cn(
            "rounded-full border border-current/20 px-2.5 py-0.5 text-[11px] font-semibold shadow-none",
            config.className
          )}
        >
          {config.label}
        </Badge>
      );
    },
  },
];
```

- [ ] Create `src/components/admin/transfers/transfers-filters.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function TransfersFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const hasFilters = !!searchParams.get("status");

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="border-muted-foreground/10 bg-muted/30 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 backdrop-blur-sm">
      <SlidersHorizontal className="text-muted-foreground h-3.5 w-3.5" />
      <Select
        value={searchParams.get("status") || "all"}
        onValueChange={(v) => updateFilter("status", v)}
      >
        <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[150px] rounded-lg text-xs shadow-none">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground h-8 gap-1.5 text-xs font-medium"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      )}
    </div>
  );
}
```

- [ ] Create `src/components/admin/transfers/transfers-table.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";

import { TransferWithDetails } from "@/actions/admin/transfers";
import { DataTable } from "@/components/admin/data-table";

import { columns } from "./columns";

interface TransfersTableProps {
  transfers: TransferWithDetails[];
  totalCount: number;
  pageCount: number;
}

export function TransfersTable({
  transfers,
  totalCount,
  pageCount,
}: TransfersTableProps) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={transfers}
      totalCount={totalCount}
      pageCount={pageCount}
      searchPlaceholder="Search products by name or SKU..."
      onRowClick={(row) => router.push(`/admin/transfers/${row.id}`)}
    />
  );
}
```

- [ ] Create `src/components/admin/transfers/transfers-header.tsx`:

```typescript
"use client";

interface TransfersHeaderProps {
  totalCount: number;
}

export function TransfersHeader({ totalCount }: TransfersHeaderProps) {
  return (
    <div className="border-muted flex flex-col gap-1 border-b pb-3 sm:pb-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
        Transfers
      </h1>
      <p className="text-muted-foreground text-xs sm:text-sm">
        All warehouse-to-warehouse stock transfers and their current status.
      </p>
      <p className="text-muted-foreground mt-0.5 text-[11px] sm:text-xs">
        {totalCount.toLocaleString()} transfer{totalCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
```

- [ ] Run typecheck: `pnpm typecheck`

- [ ] Commit:
```bash
git add src/components/admin/transfers/
git commit -m "feat: add admin transfers table components"
```

---

## Task 6: Admin complete-transfer dialog

**Files:**
- Create: `src/components/admin/transfers/complete-transfer-dialog.tsx`

`getLocations` from `src/actions/admin/locations.ts` is used here — it's admin-gated, which is correct for an admin-only component.

- [ ] Create `src/components/admin/transfers/complete-transfer-dialog.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { getLocations } from "@/actions/admin/locations";
import { completeTransfer } from "@/actions/admin/transfers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  destLocationId: z.string().min(1, "Destination location is required"),
});

type FormValues = z.infer<typeof schema>;

interface CompleteTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferId: string;
  destWarehouseId: string;
  currentDestLocationId: string | null;
  onSuccess: () => void;
}

export function CompleteTransferDialog({
  open,
  onOpenChange,
  transferId,
  destWarehouseId,
  currentDestLocationId,
  onSuccess,
}: CompleteTransferDialogProps) {
  const [locations, setLocations] = useState<
    { id: string; location_code: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { destLocationId: currentDestLocationId ?? "" },
  });

  useEffect(() => {
    if (!open) return;
    getLocations({ warehouseId: destWarehouseId, pageSize: 200 }).then((r) =>
      setLocations(r.locations)
    );
  }, [open, destWarehouseId]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const result = await completeTransfer(transferId, values.destLocationId);
    setLoading(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Transfer completed — stock moved");
      onSuccess();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Transfer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="destLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Bin Location</FormLabel>
                  {locations.length > 0 ? (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bin location..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.location_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No locations defined for the destination warehouse.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || locations.length === 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Transfer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] Run typecheck: `pnpm typecheck`

- [ ] Commit:
```bash
git add src/components/admin/transfers/complete-transfer-dialog.tsx
git commit -m "feat: add admin complete-transfer dialog"
```

---

## Task 7: Admin transfers list page + loading

**Files:**
- Create: `src/app/(admin)/admin/transfers/page.tsx`
- Create: `src/app/(admin)/admin/transfers/loading.tsx`

- [ ] Create `src/app/(admin)/admin/transfers/page.tsx`:

```typescript
import { getTransfers } from "@/actions/admin/transfers";
import { ADMIN_PAGE_SIZE } from "@/lib/config";

import { TransfersFilters } from "@/components/admin/transfers/transfers-filters";
import { TransfersHeader } from "@/components/admin/transfers/transfers-header";
import { TransfersTable } from "@/components/admin/transfers/transfers-table";

interface TransfersPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function TransfersPage({
  searchParams,
}: TransfersPageProps) {
  const { status, page, pageSize } = await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || ADMIN_PAGE_SIZE;

  const { transfers, totalCount } = await getTransfers({
    status,
    page: currentPage,
    pageSize: currentPageSize,
  });

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex flex-1 flex-col space-y-4 sm:space-y-6">
      <TransfersHeader totalCount={totalCount} />
      <div className="flex flex-col gap-4">
        <TransfersFilters />
        <TransfersTable
          transfers={transfers}
          totalCount={totalCount}
          pageCount={pageCount}
        />
      </div>
    </div>
  );
}
```

- [ ] Create `src/app/(admin)/admin/transfers/loading.tsx`:

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function TransfersLoading() {
  return (
    <div className="flex flex-1 flex-col space-y-4 sm:space-y-6">
      <div className="border-muted flex flex-col gap-2 border-b pb-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-[180px] rounded-xl" />
        <div className="rounded-md border">
          <div className="bg-muted h-[400px] w-full animate-pulse rounded-md" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] Run typecheck: `pnpm typecheck`

- [ ] Commit:
```bash
git add src/app/(admin)/admin/transfers/
git commit -m "feat: add admin transfers list page"
```

---

## Task 8: Admin transfer detail view + detail page + loading

**Files:**
- Create: `src/components/admin/transfers/transfer-detail-view.tsx`
- Create: `src/app/(admin)/admin/transfers/[transferId]/page.tsx`
- Create: `src/app/(admin)/admin/transfers/[transferId]/loading.tsx`

- [ ] Create `src/components/admin/transfers/transfer-detail-view.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  MapPin,
  Package,
  Store,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { cancelTransfer, TransferWithDetails } from "@/actions/admin/transfers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { CompleteTransferDialog } from "./complete-transfer-dialog";

const statusConfig = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-400",
  },
};

interface TransferDetailViewProps {
  transfer: TransferWithDetails;
}

export function TransferDetailView({ transfer }: TransferDetailViewProps) {
  const router = useRouter();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPendingStatus = transfer.status === "pending";
  const statusCfg = statusConfig[transfer.status];

  function handleCancel() {
    startTransition(() => {
      void cancelTransfer(transfer.id).then((result) => {
        if ("error" in result && result.error) {
          toast.error(result.error);
        } else {
          toast.success("Transfer cancelled");
          router.refresh();
        }
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/transfers")}
          className="h-9 w-9 border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Transfer Details
          </h1>
          <p className="text-muted-foreground font-mono text-[11px] sm:text-xs">
            {transfer.id}
          </p>
        </div>
        <div className="ml-auto">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border border-current/20 px-3 py-1 text-xs font-semibold shadow-none",
              statusCfg.className
            )}
          >
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 opacity-70" /> Product
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-base font-semibold">
                {transfer.products?.name || "Unknown Product"}
              </p>
              <p className="text-muted-foreground font-mono text-xs">
                {transfer.products?.sku || "No SKU"}
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ArrowRightLeft className="h-4 w-4 opacity-70" /> Route & Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Source Warehouse
                  </p>
                  <p className="text-sm font-semibold">
                    {(transfer.source_warehouse as { name: string } | null)
                      ?.name || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Destination Warehouse
                  </p>
                  <p className="text-sm font-semibold">
                    {(transfer.dest_warehouse as { name: string } | null)
                      ?.name || "—"}
                  </p>
                </div>
              </div>
              <Separator className="opacity-60" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Quantity
                  </p>
                  <p className="font-mono font-semibold">{transfer.quantity}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <Store className="h-3 w-3" /> Shop Type
                  </p>
                  <p className="text-sm font-medium">
                    {transfer.shop_types?.name || "—"}
                  </p>
                </div>
              </div>
              {transfer.dest_location_id && (
                <div className="space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <MapPin className="h-3 w-3" /> Destination Bin
                  </p>
                  <p className="font-mono text-sm font-semibold">
                    {(
                      transfer.dest_location as
                        | { location_code: string }
                        | null
                    )?.location_code || "—"}
                  </p>
                </div>
              )}
              {transfer.notes && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Notes
                  </p>
                  <p className="text-muted-foreground text-sm italic">
                    {transfer.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium">Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex items-start gap-2 text-sm">
                <User className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                    Initiated by
                  </p>
                  <p className="font-medium">
                    {transfer.profiles?.full_name ||
                      transfer.profiles?.email ||
                      "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CalendarDays className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                    Initiated at
                  </p>
                  <p className="font-medium">
                    {format(
                      new Date(transfer.transferred_at),
                      "MMM d, yyyy · hh:mm a"
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isPendingStatus && (
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => setCompleteOpen(true)}
                disabled={isPending}
              >
                Complete Transfer
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 text-red-600 hover:text-red-700"
                onClick={handleCancel}
                disabled={isPending}
              >
                <XCircle className="h-4 w-4" />
                Cancel Transfer
              </Button>
            </div>
          )}
        </div>
      </div>

      <CompleteTransferDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        transferId={transfer.id}
        destWarehouseId={transfer.dest_warehouse_id}
        currentDestLocationId={transfer.dest_location_id}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
```

- [ ] Create `src/app/(admin)/admin/transfers/[transferId]/page.tsx`:

```typescript
import { notFound } from "next/navigation";

import { getTransferById } from "@/actions/admin/transfers";
import { TransferDetailView } from "@/components/admin/transfers/transfer-detail-view";

interface Props {
  params: Promise<{ transferId: string }>;
}

export default async function TransferDetailPage({ params }: Props) {
  const { transferId } = await params;
  const transfer = await getTransferById(transferId);

  if (!transfer) {
    notFound();
  }

  return <TransferDetailView transfer={transfer} />;
}
```

- [ ] Create `src/app/(admin)/admin/transfers/[transferId]/loading.tsx`:

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function TransferDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="ml-auto">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] Run typecheck: `pnpm typecheck`

- [ ] Commit:
```bash
git add src/components/admin/transfers/transfer-detail-view.tsx src/app/(admin)/admin/transfers/
git commit -m "feat: add admin transfer detail view and detail page"
```

---

## Task 9: Add Transfers to admin sidebar

**Files:**
- Modify: `src/components/dashboard/app-sidebar.tsx`

- [ ] In `src/components/dashboard/app-sidebar.tsx`, find the `"Inventory & Operations"` group inside `adminGroups`. Add a `"Transfers"` item after the `"Stock Movements"` item:

```typescript
{
  title: "Inventory & Operations",
  icon: Icons.stock,
  items: [
    { title: "Current Stock", href: "/admin/stock", icon: Icons.stock },
    {
      title: "Stock Movements",
      href: "/admin/stock-movements",
      icon: Icons.transfer,
    },
    {
      title: "Transfers",
      href: "/admin/transfers",
      icon: Icons.transfer,
    },
    {
      title: "Warehouses",
      href: "/admin/warehouses",
      icon: Icons.warehouses,
    },
    {
      title: "Item Location",
      href: "/admin/locations",
      icon: Icons.locations,
    },
    { title: "Shops", href: "/admin/shops", icon: Icons.shops },
  ],
},
```

- [ ] Run typecheck: `pnpm typecheck`

- [ ] Commit:
```bash
git add src/components/dashboard/app-sidebar.tsx
git commit -m "feat: add Transfers link to admin sidebar"
```

---

## Task 10: User complete-transfer dialog

**Files:**
- Create: `src/components/user/transfers/complete-transfer-dialog.tsx`

Uses `getWarehouseLocations` from `src/actions/user/transfers.ts` (not the admin `getLocations`) so regular users can call it.

- [ ] Create `src/components/user/transfers/complete-transfer-dialog.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  completeTransfer,
  getWarehouseLocations,
} from "@/actions/user/transfers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  destLocationId: z.string().min(1, "Destination location is required"),
});

type FormValues = z.infer<typeof schema>;

interface CompleteTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferId: string;
  destWarehouseId: string;
  currentDestLocationId: string | null;
  onSuccess: () => void;
}

export function CompleteTransferDialog({
  open,
  onOpenChange,
  transferId,
  destWarehouseId,
  currentDestLocationId,
  onSuccess,
}: CompleteTransferDialogProps) {
  const [locations, setLocations] = useState<
    { id: string; location_code: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { destLocationId: currentDestLocationId ?? "" },
  });

  useEffect(() => {
    if (!open) return;
    getWarehouseLocations(destWarehouseId).then(setLocations);
  }, [open, destWarehouseId]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const result = await completeTransfer(transferId, values.destLocationId);
    setLoading(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Transfer completed — stock moved");
      onSuccess();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Transfer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="destLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Bin Location</FormLabel>
                  {locations.length > 0 ? (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bin location..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.location_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No locations defined for the destination warehouse.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || locations.length === 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Transfer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] Run typecheck: `pnpm typecheck`

- [ ] Commit:
```bash
git add src/components/user/transfers/complete-transfer-dialog.tsx
git commit -m "feat: add user complete-transfer dialog"
```

---

## Task 11: User transfers list components

**Files:**
- Create: `src/components/user/transfers/transfer-card.tsx`
- Create: `src/components/user/transfers/transfers-list.tsx`

- [ ] Create `src/components/user/transfers/transfer-card.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRightLeft, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  cancelTransfer,
  UserTransferWithDetails,
} from "@/actions/user/transfers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { CompleteTransferDialog } from "./complete-transfer-dialog";

interface TransferCardProps {
  transfer: UserTransferWithDetails;
  canAct: boolean;
}

export function TransferCard({ transfer, canAct }: TransferCardProps) {
  const router = useRouter();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const srcName = (transfer.source_warehouse as { name: string } | null)?.name;
  const dstName = (transfer.dest_warehouse as { name: string } | null)?.name;

  function handleCancel() {
    startTransition(() => {
      void cancelTransfer(transfer.id).then((result) => {
        if ("error" in result && result.error) {
          toast.error(result.error);
        } else {
          toast.success("Transfer cancelled");
          router.refresh();
        }
      });
    });
  }

  return (
    <>
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">
                  {transfer.products?.name || "Unknown Product"}
                </p>
                <p className="text-muted-foreground font-mono text-[11px]">
                  {transfer.products?.sku || "No SKU"}
                </p>
              </div>
              <p className="text-muted-foreground shrink-0 text-[11px]">
                {format(new Date(transfer.transferred_at), "MMM d, hh:mm a")}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">{srcName || "—"}</span>
              <ArrowRightLeft className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="font-medium">{dstName || "—"}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-muted-foreground">
                  Qty:{" "}
                  <span className="text-foreground font-mono font-semibold">
                    {transfer.quantity}
                  </span>
                </span>
                {transfer.shop_types?.name && (
                  <span className="text-muted-foreground">
                    {transfer.shop_types.name}
                  </span>
                )}
              </div>
              {transfer.profiles && (
                <span className="text-muted-foreground text-[11px]">
                  by{" "}
                  {transfer.profiles.full_name || transfer.profiles.email}
                </span>
              )}
            </div>

            {transfer.notes && (
              <p className="text-muted-foreground text-[11px] italic">
                {transfer.notes}
              </p>
            )}

            {canAct && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  onClick={() => setCompleteOpen(true)}
                  disabled={isPending}
                >
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs text-red-600 hover:text-red-700"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CompleteTransferDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        transferId={transfer.id}
        destWarehouseId={transfer.dest_warehouse_id}
        currentDestLocationId={transfer.dest_location_id}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
```

- [ ] Create `src/components/user/transfers/transfers-list.tsx`:

```typescript
import { UserTransferWithDetails } from "@/actions/user/transfers";

import { TransferCard } from "./transfer-card";

interface TransfersListProps {
  transfers: UserTransferWithDetails[];
  canAct: boolean;
}

export function TransfersList({ transfers, canAct }: TransfersListProps) {
  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm font-medium">
          No pending transfers
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          When stock transfers are initiated, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transfers.map((t) => (
        <TransferCard key={t.id} transfer={t} canAct={canAct} />
      ))}
    </div>
  );
}
```

- [ ] Run typecheck: `pnpm typecheck`

- [ ] Commit:
```bash
git add src/components/user/transfers/
git commit -m "feat: add user transfer card and transfers list components"
```

---

## Task 12: User transfers page + loading

**Files:**
- Create: `src/app/(user)/transfers/page.tsx`
- Create: `src/app/(user)/transfers/loading.tsx`

- [ ] Create `src/app/(user)/transfers/page.tsx`:

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";
import { getTransfers } from "@/actions/user/transfers";

import { TransfersList } from "@/components/user/transfers/transfers-list";

export default async function TransfersPage() {
  const auth = await getAuthContext();

  let canAct = auth.role === "admin";

  if (!canAct && auth.userId) {
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("perm_do_transfer")
      .eq("id", auth.userId)
      .single();
    canAct = profile?.perm_do_transfer ?? false;
  }

  const { transfers } = await getTransfers({ pageSize: 50 });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">
          Pending Transfers
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          All open warehouse transfers awaiting completion.
        </p>
      </div>
      <TransfersList transfers={transfers} canAct={canAct} />
    </div>
  );
}
```

- [ ] Create `src/app/(user)/transfers/loading.tsx`:

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function TransfersLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] Run typecheck: `pnpm typecheck`

- [ ] Commit:
```bash
git add src/app/(user)/transfers/
git commit -m "feat: add user transfers page"
```

---

## Task 13: Bottom tab bar + user layout update

**Files:**
- Create: `src/components/user/layout/bottom-tab-bar.tsx`
- Modify: `src/app/(user)/layout.tsx`

- [ ] Create `src/components/user/layout/bottom-tab-bar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, Home } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Inventory", icon: Home },
  { href: "/transfers", label: "Transfers", icon: ArrowRightLeft },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-lg items-center justify-around px-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/" || pathname.startsWith("/inventory")
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] Replace the full content of `src/app/(user)/layout.tsx` with:

```typescript
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/supabase/server";
import { BottomTabBar } from "@/components/user/layout/bottom-tab-bar";
import { UserNavbar } from "@/components/user/layout/user-navbar";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();

  if (!auth.isAuthenticated) {
    redirect("/auth/login");
  }

  if (auth.role !== "user") {
    const redirectPath = auth.role === "admin" ? "/admin" : "/manager";
    redirect(redirectPath);
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <UserNavbar
        user={{
          email: auth.email,
          fullName: auth.fullName,
          avatarUrl: auth.avatarUrl,
        }}
      />
      <main className="mx-auto w-full max-w-screen-lg flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
}
```

- [ ] Run typecheck: `pnpm typecheck`

- [ ] Commit:
```bash
git add src/components/user/layout/bottom-tab-bar.tsx src/app/(user)/layout.tsx
git commit -m "feat: add bottom tab bar and update user layout"
```

---

## Task 14: Final typecheck, lint, and format

- [ ] Run full typecheck:
  ```bash
  pnpm typecheck
  ```
  Expected: 0 errors.

- [ ] Run lint with auto-fix:
  ```bash
  pnpm lint:fix
  ```

- [ ] Run formatter:
  ```bash
  pnpm format
  ```

- [ ] Stage and commit any files changed by lint/format:
  ```bash
  git add -A
  git commit -m "chore: lint and format"
  ```
