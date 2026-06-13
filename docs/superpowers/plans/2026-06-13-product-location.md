# Product Location (Zone-Aisle-Rack-Bin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add warehouse bin-level location tracking (Zone → Aisle → Rack → Bin) to stock records, with admin CRUD, location selection on stock-in and transfers, a location column in the stock table, and location display in the user inventory detail view.

**Architecture:** A new `locations` table (scoped to warehouse) stores zone/aisle/rack/bin parts plus a pre-computed `location_code` string (e.g. `A-01-02-B3`). The `stock` table gains a nullable `location_id` FK; `stock_transfers` gains `dest_location_id` for audit. Admins pre-create locations per warehouse; movement and transfer dialogs expose a location `Select` filtered to the relevant warehouse.

**Tech Stack:** Next.js 15 server actions, Supabase (PostgreSQL), TypeScript, React Hook Form + Zod, shadcn/ui, TanStack Table. No test framework (project has none).

---

## File Map

### New files
| Path | Responsibility |
|------|---------------|
| `src/actions/admin/locations.ts` | Server actions: CRUD + list for locations |
| `src/components/admin/locations/columns.tsx` | TanStack Table column defs for locations |
| `src/components/admin/locations/location-dialog.tsx` | Create/edit dialog for a location |
| `src/components/admin/locations/location-actions.tsx` | Row action dropdown (edit/delete) |
| `src/components/admin/locations/location-header.tsx` | Page header with "Add Location" button |
| `src/app/(admin)/admin/locations/page.tsx` | Admin locations list page (server component) |
| `src/app/(admin)/admin/locations/loading.tsx` | Loading skeleton for the list page |

### Modified files
| Path | Change |
|------|--------|
| `src/lib/supabase/database.types.ts` | Regenerated — never edit manually |
| `src/components/icons.tsx` | Add `locations` icon (MapPin) |
| `src/components/dashboard/app-sidebar.tsx` | Add "Locations" link under Inventory & Operations |
| `src/actions/admin/stock.ts` | Add `location_id` to `StockWithDetails`; accept `locationId` / `destLocationId` in mutations |
| `src/actions/user/stock.ts` | Add `locations` join to `UserStockWithDetails` |
| `src/components/admin/stock/movement-dialog.tsx` | Add location Select for "initial" mode |
| `src/components/admin/stock/transfer-dialog.tsx` | Add destination location Select |
| `src/components/admin/stock/columns.tsx` | Add Location column |
| `src/components/user/inventory/inventory-detail-view.tsx` | Show location badge/info |

---

## Task 1: Database Migration

**Files:**
- Run SQL in Supabase SQL editor
- Regenerate: `src/lib/supabase/database.types.ts`

- [ ] **Step 1: Run the migration in the Supabase SQL editor**

Open the Supabase dashboard → SQL Editor and run:

```sql
-- 1. locations table
CREATE TABLE locations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id  uuid        NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  zone          text,
  aisle         text,
  rack          text,
  bin           text,
  location_code text        NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, zone, aisle, rack, bin)
);

-- 2. Nullable FK on stock
ALTER TABLE stock
  ADD COLUMN location_id uuid REFERENCES locations(id) ON DELETE SET NULL;

-- 3. Nullable FK on stock_transfers (destination location for audit)
ALTER TABLE stock_transfers
  ADD COLUMN dest_location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Regenerate TypeScript types**

```bash
pnpm db:types
```

Verify the output contains `locations` in `database.types.ts`:
```bash
grep -n "locations" src/lib/supabase/database.types.ts | head -10
```
Expected: Lines referencing `locations` table Row/Insert/Update and its FK relationships in `stock` and `stock_transfers`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/database.types.ts
git commit -m "feat: add locations table and location_id FKs to stock and stock_transfers"
```

---

## Task 2: Location Server Actions

**Files:**
- Create: `src/actions/admin/locations.ts`

- [ ] **Step 1: Create the server actions file**

Create `src/actions/admin/locations.ts`:

```typescript
"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
export type LocationWithWarehouse = LocationRow & {
  warehouses: { name: string } | null;
};

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || auth.role !== "admin")
    throw new Error("Unauthorized");
  return auth.userId!;
}

export function buildLocationCode(
  zone?: string | null,
  aisle?: string | null,
  rack?: string | null,
  bin?: string | null
): string {
  const parts = [zone, aisle, rack, bin].filter((p) => p && p.trim());
  return parts.length > 0 ? parts.join("-") : "—";
}

export async function getLocations(
  params: {
    warehouseId?: string;
    page?: number;
    pageSize?: number;
    includeInactive?: boolean;
  } = {}
) {
  await verifyAdmin();
  const {
    warehouseId,
    page = 1,
    pageSize = 50,
    includeInactive = false,
  } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      let query = adminClient
        .from("locations")
        .select("*, warehouses(name)", { count: "exact" })
        .order("location_code", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      if (warehouseId) {
        query = query.eq("warehouse_id", warehouseId);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw new Error("Failed to fetch locations");
      return {
        locations: data as LocationWithWarehouse[],
        totalCount: count || 0,
      };
    },
    [
      "admin-locations",
      warehouseId || "",
      String(page),
      String(pageSize),
      String(includeInactive),
    ],
    { tags: ["admin:locations"], revalidate: 300 }
  )();
}

export async function createLocation(data: {
  warehouse_id: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  bin?: string;
}) {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const location_code = buildLocationCode(
    data.zone,
    data.aisle,
    data.rack,
    data.bin
  );

  const { error } = await adminClient.from("locations").insert({
    warehouse_id: data.warehouse_id,
    zone: data.zone || null,
    aisle: data.aisle || null,
    rack: data.rack || null,
    bin: data.bin || null,
    location_code,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A location with these coordinates already exists in this warehouse." };
    }
    return { error: error.message };
  }

  revalidateTag("admin:locations");
  revalidatePath("/admin/locations");
  return { success: true };
}

export async function updateLocation(
  id: string,
  data: {
    warehouse_id: string;
    zone?: string;
    aisle?: string;
    rack?: string;
    bin?: string;
    is_active?: boolean;
  }
) {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const location_code = buildLocationCode(
    data.zone,
    data.aisle,
    data.rack,
    data.bin
  );

  const { error } = await adminClient
    .from("locations")
    .update({
      warehouse_id: data.warehouse_id,
      zone: data.zone || null,
      aisle: data.aisle || null,
      rack: data.rack || null,
      bin: data.bin || null,
      location_code,
      is_active: data.is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "A location with these coordinates already exists in this warehouse." };
    }
    return { error: error.message };
  }

  revalidateTag("admin:locations");
  revalidatePath("/admin/locations");
  return { success: true };
}

export async function deleteLocation(id: string) {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("locations")
    .delete()
    .eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return { error: "Cannot delete: this location is referenced by existing stock records." };
    }
    return { error: error.message };
  }

  revalidateTag("admin:locations");
  revalidatePath("/admin/locations");
  return { success: true };
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | head -30
```
Expected: No errors in `src/actions/admin/locations.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/actions/admin/locations.ts
git commit -m "feat: add location server actions (getLocations, createLocation, updateLocation, deleteLocation)"
```

---

## Task 3: Icons + Sidebar

**Files:**
- Modify: `src/components/icons.tsx`
- Modify: `src/components/dashboard/app-sidebar.tsx`

- [ ] **Step 1: Add `locations` icon**

In `src/components/icons.tsx`, add `MapPin` to the lucide import and export it:

```typescript
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Ruler,
  Settings,
  Store,
  Tag,
  User,
  Users,
  Warehouse,
  XCircle,
} from "lucide-react";

export const Icons = {
  // ... existing entries ...
  locations: MapPin,
};
```

- [ ] **Step 2: Add Locations to sidebar**

In `src/components/dashboard/app-sidebar.tsx`, find the `adminGroups` array. Inside the `"Inventory & Operations"` group items array, add after `"Warehouses"`:

```typescript
{
  title: "Locations",
  href: "/admin/locations",
  icon: Icons.locations,
},
```

- [ ] **Step 3: Lint + typecheck**

```bash
pnpm lint:fix && pnpm typecheck 2>&1 | head -20
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/icons.tsx src/components/dashboard/app-sidebar.tsx
git commit -m "feat: add locations icon and sidebar nav link"
```

---

## Task 4: Admin Locations CRUD UI

**Files:**
- Create: `src/components/admin/locations/columns.tsx`
- Create: `src/components/admin/locations/location-dialog.tsx`
- Create: `src/components/admin/locations/location-actions.tsx`
- Create: `src/components/admin/locations/location-header.tsx`
- Create: `src/app/(admin)/admin/locations/page.tsx`
- Create: `src/app/(admin)/admin/locations/loading.tsx`

- [ ] **Step 1: Create columns.tsx**

Create `src/components/admin/locations/columns.tsx`:

```typescript
"use client";

import { LocationWithWarehouse } from "@/actions/admin/locations";
import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { LocationActions } from "./location-actions";

export const columns: ColumnDef<LocationWithWarehouse>[] = [
  {
    accessorKey: "location_code",
    header: "Code",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">
        {row.original.location_code}
      </span>
    ),
  },
  {
    accessorKey: "warehouses.name",
    header: "Warehouse",
    cell: ({ row }) => row.original.warehouses?.name ?? "—",
  },
  {
    accessorKey: "zone",
    header: "Zone",
    cell: ({ row }) => row.original.zone ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "aisle",
    header: "Aisle",
    cell: ({ row }) => row.original.aisle ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "rack",
    header: "Rack",
    cell: ({ row }) => row.original.rack ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "bin",
    header: "Bin",
    cell: ({ row }) => row.original.bin ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) =>
      row.original.is_active ? (
        <Badge variant="secondary" className="text-[10px]">Active</Badge>
      ) : (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => <LocationActions location={row.original} />,
  },
];
```

- [ ] **Step 2: Create location-dialog.tsx**

Create `src/components/admin/locations/location-dialog.tsx`:

```typescript
"use client";

import { useEffect, useTransition } from "react";
import {
  buildLocationCode,
  createLocation,
  LocationRow,
  updateLocation,
} from "@/actions/admin/locations";
import { getWarehouses } from "@/actions/admin/warehouses";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

const locationSchema = z
  .object({
    warehouse_id: z.string().min(1, "Warehouse is required"),
    zone: z.string().max(20).optional(),
    aisle: z.string().max(20).optional(),
    rack: z.string().max(20).optional(),
    bin: z.string().max(20).optional(),
  })
  .refine((d) => d.zone || d.aisle || d.rack || d.bin, {
    message: "At least one of zone, aisle, rack, or bin is required",
    path: ["zone"],
  });

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationDialogProps {
  location?: LocationRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationDialog({
  location,
  open,
  onOpenChange,
}: LocationDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      warehouse_id: location?.warehouse_id ?? "",
      zone: location?.zone ?? "",
      aisle: location?.aisle ?? "",
      rack: location?.rack ?? "",
      bin: location?.bin ?? "",
    },
  });

  const watchedZone = form.watch("zone");
  const watchedAisle = form.watch("aisle");
  const watchedRack = form.watch("rack");
  const watchedBin = form.watch("bin");
  const previewCode = buildLocationCode(watchedZone, watchedAisle, watchedRack, watchedBin);

  useEffect(() => {
    getWarehouses({ pageSize: 100 }).then((r) => setWarehouses(r.warehouses));
  }, []);

  useEffect(() => {
    if (open) {
      form.reset({
        warehouse_id: location?.warehouse_id ?? "",
        zone: location?.zone ?? "",
        aisle: location?.aisle ?? "",
        rack: location?.rack ?? "",
        bin: location?.bin ?? "",
      });
    }
  }, [open, location, form]);

  function onSubmit(values: LocationFormValues) {
    startTransition(async () => {
      const result = location
        ? await updateLocation(location.id, values)
        : await createLocation(values);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(location ? "Location updated" : "Location created");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "Create Location"}</DialogTitle>
          <DialogDescription>
            {location
              ? "Update zone, aisle, rack, or bin details."
              : "Define a new bin location inside a warehouse."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="warehouse_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouse</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aisle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aisle</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rack</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. R2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. B03" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted/50 rounded-md border px-3 py-2">
              <p className="text-muted-foreground text-[11px] font-medium uppercase">
                Location Code Preview
              </p>
              <p className="font-mono text-sm font-semibold">{previewCode}</p>
              <FormDescription className="text-[10px] mt-0.5">
                Auto-generated from zone, aisle, rack, and bin.
              </FormDescription>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? location
                    ? "Saving..."
                    : "Creating..."
                  : location
                    ? "Save Changes"
                    : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create location-actions.tsx**

Create `src/components/admin/locations/location-actions.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { deleteLocation, LocationWithWarehouse } from "@/actions/admin/locations";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { LocationDialog } from "./location-dialog";

interface LocationActionsProps {
  location: LocationWithWarehouse;
}

export function LocationActions({ location }: LocationActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete location "${location.location_code}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteLocation(location.id);
      if (result.error) toast.error(result.error);
      else toast.success("Location deleted");
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LocationDialog
        location={location}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  );
}
```

- [ ] **Step 4: Create location-header.tsx**

Create `src/components/admin/locations/location-header.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LocationDialog } from "./location-dialog";

export function LocationHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Locations</h1>
        <p className="text-muted-foreground text-sm">
          Manage bin locations (Zone → Aisle → Rack → Bin) within warehouses.
        </p>
      </div>
      <Button size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        Add Location
      </Button>

      <LocationDialog open={isOpen} onOpenChange={setIsOpen} />
    </div>
  );
}
```

- [ ] **Step 5: Create the page**

Create `src/app/(admin)/admin/locations/page.tsx`:

```typescript
import { getLocations } from "@/actions/admin/locations";

import { DataTable } from "@/components/admin/data-table";

import { columns } from "@/components/admin/locations/columns";
import { LocationHeader } from "@/components/admin/locations/location-header";

export default async function LocationsPage() {
  const { locations } = await getLocations({ pageSize: 100, includeInactive: true });

  return (
    <div className="space-y-6">
      <LocationHeader />
      <DataTable columns={columns} data={locations} />
    </div>
  );
}
```

- [ ] **Step 6: Create loading.tsx**

Create `src/app/(admin)/admin/locations/loading.tsx`:

```typescript
import { Skeleton } from "@/components/ui/skeleton";

export default function LocationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck + lint**

```bash
pnpm typecheck 2>&1 | head -30
pnpm lint:fix
```
Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/locations/ src/app/(admin)/admin/locations/
git commit -m "feat: add admin locations CRUD page (list, create, edit, delete)"
```

---

## Task 5: Update Stock Server Actions + Types

**Files:**
- Modify: `src/actions/admin/stock.ts`
- Modify: `src/actions/user/stock.ts`

- [ ] **Step 1: Update `StockWithDetails` type and `getStocks` query**

In `src/actions/admin/stock.ts`:

1. Update the `StockWithDetails` type to include `locations`:

```typescript
export type StockWithDetails = StockRow & {
  products: {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    sub_category: string | null;
    categories: { category_name: string } | null;
    subcategories: { subcategory_name: string } | null;
    product_uom_conversions: Array<{
      conversion_factor: number;
      units_of_measure: { uom_code: string; full_name: string } | null;
    }>;
  } | null;
  warehouses: { name: string } | null;
  shop_types: { name: string } | null;
  locations: {
    id: string;
    location_code: string;
    zone: string | null;
    aisle: string | null;
    rack: string | null;
    bin: string | null;
  } | null;
};
```

2. Update the `getStocks` select string to include `locations(id, location_code, zone, aisle, rack, bin)`:

```typescript
let supabaseQuery = adminClient.from("stock").select(
  `
    *,
    products!inner(
      id,
      name,
      sku,
      category,
      sub_category,
      categories(category_name),
      subcategories(subcategory_name),
      product_uom_conversions(conversion_factor, units_of_measure(uom_code, full_name))
    ),
    warehouses(name),
    shop_types(name),
    locations(id, location_code, zone, aisle, rack, bin)
  `,
  { count: "exact" }
);
```

- [ ] **Step 2: Update `processStockMovement` to accept `locationId`**

Add `locationId?: string | null` to the `data` parameter object:

```typescript
export async function processStockMovement(data: {
  productId: string;
  warehouseId: string;
  shopTypeId: string;
  quantityDelta: number;
  type: StockMovementType;
  notes?: string;
  referenceId?: string;
  transactUomId?: string;
  transactQuantity?: number;
  locationId?: string | null;
}) {
```

In the stock **insert** block, include `location_id`:

```typescript
} else {
  const { error: insertError } = await adminClient.from("stock").insert({
    product_id: data.productId,
    warehouse_id: data.warehouseId,
    shop_type_id: data.shopTypeId,
    quantity: newQuantity,
    location_id: data.locationId ?? null,
  });

  if (insertError) throw insertError;
}
```

In the stock **update** block, also update `location_id` when explicitly provided:

```typescript
if (currentStock) {
  const updatePayload: Record<string, unknown> = {
    quantity: newQuantity,
    updated_at: new Date().toISOString(),
  };
  if (data.locationId !== undefined) {
    updatePayload.location_id = data.locationId;
  }
  const { error: updateError } = await adminClient
    .from("stock")
    .update(updatePayload)
    .eq("id", currentStock.id);

  if (updateError) throw updateError;
}
```

- [ ] **Step 3: Update `transferStock` to accept `destLocationId`**

Add `destLocationId?: string | null` to the data parameter:

```typescript
export async function transferStock(data: {
  productId: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  shopTypeId: string;
  quantity: number;
  notes?: string;
  transactUomId?: string;
  transactQty?: number;
  destLocationId?: string | null;
}) {
```

Include `dest_location_id` in the `stock_transfers` insert:

```typescript
const { data: transfer, error: transferInsertError } = await adminClient
  .from("stock_transfers")
  .insert({
    product_id: data.productId,
    source_warehouse_id: data.sourceWarehouseId,
    dest_warehouse_id: data.destWarehouseId,
    shop_type_id: data.shopTypeId,
    quantity: baseQuantity,
    notes: data.notes || null,
    transferred_by: userId,
    status: "approved",
    dest_location_id: data.destLocationId ?? null,
  })
  .select()
  .single();
```

Pass `locationId` to the inbound `processStockMovement` call:

```typescript
const inResult = await processStockMovement({
  productId: data.productId,
  warehouseId: data.destWarehouseId,
  shopTypeId: data.shopTypeId,
  quantityDelta: baseQuantity,
  type: "transfer_in",
  referenceId: transferId,
  notes: data.notes || `Transfer from warehouse ${data.sourceWarehouseId}`,
  transactUomId: data.transactUomId,
  transactQuantity: data.transactQty,
  locationId: data.destLocationId,
});
```

- [ ] **Step 4: Update `UserStockWithDetails` type and queries**

In `src/actions/user/stock.ts`:

1. Update `UserStockWithDetails` type:

```typescript
export type UserStockWithDetails =
  Database["public"]["Tables"]["stock"]["Row"] & {
    products: {
      id: string;
      name: string;
      sku: string | null;
      category: string | null;
      sub_category: string | null;
      minimum_stock_quantity: number;
      categories: { category_name: string } | null;
      subcategories: { subcategory_name: string } | null;
      units_of_measure: { full_name: string; uom_code: string } | null;
      brands: { name: string } | null;
      product_uom_conversions: Array<{
        conversion_factor: number;
        units_of_measure: { uom_code: string; full_name: string } | null;
      }>;
    } | null;
    warehouses: { name: string } | null;
    shop_types: { name: string } | null;
    locations: {
      id: string;
      location_code: string;
      zone: string | null;
      aisle: string | null;
      rack: string | null;
      bin: string | null;
    } | null;
  };
```

2. Update the `getUserStocks` select string to include `locations`:

```typescript
let supabaseQuery = adminClient.from("stock").select(
  `
  id,
  product_id,
  quantity,
  shop_type_id,
  warehouse_id,
  updated_at,
  location_id,
  products!inner(
    id,
    name,
    sku,
    category,
    sub_category,
    minimum_stock_quantity,
    categories(category_name),
    subcategories(subcategory_name),
    units_of_measure(full_name, uom_code),
    brands(name),
    product_uom_conversions(conversion_factor, units_of_measure(uom_code, full_name))
  ),
  warehouses(name),
  shop_types(name),
  locations(id, location_code, zone, aisle, rack, bin)
  `,
  { count: "exact" }
);
```

3. Update the `getUserStockById` select string similarly to add `locations(id, location_code, zone, aisle, rack, bin)` at the end of the select.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck 2>&1 | head -30
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/actions/admin/stock.ts src/actions/user/stock.ts
git commit -m "feat: add location_id to stock types, queries, and mutations"
```

---

## Task 6: Update Movement Dialog with Location Selector

**Files:**
- Modify: `src/components/admin/stock/movement-dialog.tsx`

The location selector is only shown in "initial" mode (when placing new stock). In all other movement types (in/out/adjustment/return), location doesn't change.

- [ ] **Step 1: Add `locationId` to the form schema**

At the top of the `movementSchema` in `movement-dialog.tsx`, add the optional field:

```typescript
const movementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  shopTypeId: z.string().min(1, "Shop type is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  adjustmentDirection: z.enum(["add", "remove"]).default("add"),
  notes: z.string().optional(),
  locationId: z.string().optional(),
});
```

- [ ] **Step 2: Add location state and fetch logic**

Add location state and the warehouse-reactive fetch inside the component, after the existing state declarations:

```typescript
const [locations, setLocations] = useState<{ id: string; location_code: string }[]>([]);
```

Import `getLocations` at the top:
```typescript
import { getLocations } from "@/actions/admin/locations";
```

Add a `useEffect` that loads locations when the warehouse changes (only in "initial" mode):

```typescript
const watchedWarehouseId = form.watch("warehouseId");

useEffect(() => {
  if (mode !== "initial" || !watchedWarehouseId) return;
  getLocations({ warehouseId: watchedWarehouseId, pageSize: 200 }).then((r) =>
    setLocations(r.locations)
  );
}, [mode, watchedWarehouseId]);
```

- [ ] **Step 3: Add location Select to the "initial" mode JSX**

Inside the `mode === "initial"` conditional block (the `<div className="grid ...">` containing Product, Warehouse, Shop Type selects), add after the Shop Type field:

```typescript
{locations.length > 0 && (
  <FormField
    control={form.control}
    name="locationId"
    render={({ field }) => (
      <FormItem className="flex flex-col text-sm">
        <FormLabel>
          Location{" "}
          <span className="text-muted-foreground font-normal">(Optional)</span>
        </FormLabel>
        <Select
          onValueChange={field.onChange}
          value={field.value ?? ""}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select bin location..." />
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
        <FormMessage />
      </FormItem>
    )}
  />
)}
{mode === "initial" && watchedWarehouseId && locations.length === 0 && (
  <p className="text-muted-foreground text-[11px] col-span-full">
    No locations defined for this warehouse.{" "}
    <a href="/admin/locations" className="underline">Create locations</a> first.
  </p>
)}
```

Note: `watchedWarehouseId` is already declared in Step 2.

- [ ] **Step 4: Pass `locationId` to `processStockMovement`**

In the `onSubmit` function, add `locationId` to the call:

```typescript
const result = await processStockMovement({
  productId: values.productId,
  warehouseId: values.warehouseId,
  shopTypeId: values.shopTypeId,
  quantityDelta: signedTransactQty,
  type: mode === "initial" ? "initial_stock" : mode,
  notes: values.notes,
  transactUomId: values.transactUomId,
  transactQuantity: signedTransactQty,
  locationId: values.locationId ?? null,
});
```

- [ ] **Step 5: Typecheck + lint**

```bash
pnpm typecheck 2>&1 | head -30 && pnpm lint:fix
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/stock/movement-dialog.tsx
git commit -m "feat: add location selector to initial stock movement dialog"
```

---

## Task 7: Update Transfer Dialog with Destination Location

**Files:**
- Modify: `src/components/admin/stock/transfer-dialog.tsx`

- [ ] **Step 1: Add `destLocationId` to the transfer schema**

```typescript
const transferSchema = z.object({
  destWarehouseId: z.string().min(1, "Destination warehouse is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be at least 0.000001"),
  notes: z.string().optional(),
  destLocationId: z.string().optional(),
});
```

- [ ] **Step 2: Add location state and fetch logic**

Add import at the top:
```typescript
import { getLocations } from "@/actions/admin/locations";
```

Add state inside the component:
```typescript
const [destLocations, setDestLocations] = useState<{ id: string; location_code: string }[]>([]);
```

Add a `useEffect` that reloads locations when `destWarehouseId` changes:

```typescript
const watchedDestWarehouseId = form.watch("destWarehouseId");

useEffect(() => {
  if (!watchedDestWarehouseId) return;
  getLocations({ warehouseId: watchedDestWarehouseId, pageSize: 200 }).then(
    (r) => setDestLocations(r.locations)
  );
}, [watchedDestWarehouseId]);
```

- [ ] **Step 3: Add destination location Select to JSX**

After the existing `<div className="grid ...">` containing UOM and Quantity fields, add a new section for the destination location:

```typescript
{destLocations.length > 0 && (
  <FormField
    control={form.control}
    name="destLocationId"
    render={({ field }) => (
      <FormItem>
        <FormLabel>
          Destination Location{" "}
          <span className="text-muted-foreground font-normal">(Optional)</span>
        </FormLabel>
        <Select
          onValueChange={field.onChange}
          value={field.value ?? ""}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select bin location in destination..." />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {destLocations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.location_code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
)}
{watchedDestWarehouseId && destLocations.length === 0 && (
  <p className="text-muted-foreground text-[11px]">
    No locations defined for the destination warehouse.
  </p>
)}
```

- [ ] **Step 4: Pass `destLocationId` to `transferStock`**

In `onSubmit`:

```typescript
const result = await transferStock({
  productId: initialData.product_id,
  sourceWarehouseId: initialData.warehouse_id,
  destWarehouseId: values.destWarehouseId,
  shopTypeId: initialData.shop_type_id,
  quantity: values.transactQty,
  notes: values.notes,
  transactUomId: values.transactUomId,
  transactQty: values.transactQty,
  destLocationId: values.destLocationId ?? null,
});
```

- [ ] **Step 5: Typecheck + lint**

```bash
pnpm typecheck 2>&1 | head -30 && pnpm lint:fix
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/stock/transfer-dialog.tsx
git commit -m "feat: add destination location selector to stock transfer dialog"
```

---

## Task 8: Admin Stock Table — Add Location Column

**Files:**
- Modify: `src/components/admin/stock/columns.tsx`

- [ ] **Step 1: Add Location column**

In `src/components/admin/stock/columns.tsx`, add a new column definition after the `"Warehouse"` column and before `"Shop Type"`:

```typescript
{
  id: "location",
  header: "Location",
  meta: { className: "hidden lg:table-cell" },
  cell: ({ row }) => {
    const loc = row.original.locations;
    if (!loc) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    return (
      <span className="font-mono text-xs font-medium">{loc.location_code}</span>
    );
  },
},
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck 2>&1 | head -20 && pnpm lint:fix
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/stock/columns.tsx
git commit -m "feat: add location column to admin stock table"
```

---

## Task 9: User Inventory Detail — Show Location

**Files:**
- Modify: `src/components/user/inventory/inventory-detail-view.tsx`

- [ ] **Step 1: Add location row to the info grid**

In `inventory-detail-view.tsx`, find the two-column grid that shows "Shop Location" and "Warehouse" (currently around the `grid-cols-2 gap-4 py-2` block). Add a third/fourth info entry for location immediately after the warehouse entry:

```typescript
{stock.locations && (
  <div className="space-y-1">
    <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
      <MapPin className="h-3.5 w-3.5 opacity-70" /> Bin Location
    </label>
    <p className="font-mono text-sm font-semibold">
      {stock.locations.location_code}
    </p>
    <p className="text-muted-foreground text-[10px]">
      {[
        stock.locations.zone && `Zone ${stock.locations.zone}`,
        stock.locations.aisle && `Aisle ${stock.locations.aisle}`,
        stock.locations.rack && `Rack ${stock.locations.rack}`,
        stock.locations.bin && `Bin ${stock.locations.bin}`,
      ]
        .filter(Boolean)
        .join(" · ")}
    </p>
  </div>
)}
```

Import `MapPin` from lucide-react at the top of the file (add to the existing import):
```typescript
import {
  ArrowLeft,
  ArrowRightLeft,
  Edit,
  Info,
  MapPin,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Store,
} from "lucide-react";
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck 2>&1 | head -20 && pnpm lint:fix
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/user/inventory/inventory-detail-view.tsx
git commit -m "feat: show bin location in user inventory detail view"
```

---

## Task 10: Final Cleanup + Format

- [ ] **Step 1: Full lint + format**

```bash
pnpm lint:fix && pnpm format && pnpm typecheck
```
Expected: No errors, all files formatted.

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | tail -20
```
Expected: Build completes without errors. Any pre-render errors indicate a type mismatch between the regenerated DB types and the query select strings — fix by cross-referencing `database.types.ts` column names.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: lint and format for product location feature"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| `locations` table with zone/aisle/rack/bin/location_code | Task 1 |
| `stock.location_id` FK | Task 1 |
| `stock_transfers.dest_location_id` FK | Task 1 |
| Locations CRUD admin page | Tasks 2, 3, 4 |
| Locations in sidebar nav | Task 3 |
| Location auto-code generation from parts | Task 2 (`buildLocationCode`) + Task 4 (live preview in dialog) |
| Location selector when adding initial stock | Task 6 |
| Location column in admin stock table | Task 8 |
| Location in user inventory detail | Task 9 |
| Destination location when transferring | Task 7 |

**Placeholder scan:** No TBDs or "implement later" in code blocks above.

**Type consistency:**
- `LocationRow` and `LocationWithWarehouse` defined in Task 2, used in Tasks 3, 4.
- `StockWithDetails.locations` shape defined in Task 5 Step 1, matches select string.
- `UserStockWithDetails.locations` same shape, defined in Task 5 Step 4.
- `buildLocationCode` defined in `src/actions/admin/locations.ts` (Task 2), imported in dialog (Task 4).
- `getLocations` defined in Task 2, imported in Tasks 6 and 7.
- `locationId` added to `processStockMovement` in Task 5, used in Task 6.
- `destLocationId` added to `transferStock` in Task 5, used in Task 7.
