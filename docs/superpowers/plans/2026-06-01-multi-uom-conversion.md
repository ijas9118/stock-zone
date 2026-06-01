# Multi-UOM Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store stock in one base unit per product; allow transactions in configured alternate units; convert to base before recording; display base + largest-fitting alternate in inventory views.

**Architecture:** App-layer conversion in TypeScript server actions. A new `product_uom_conversions` table holds per-product alternate UOM factors. `processStockMovement` accepts an optional `transactUomId`+`transactQuantity` pair; if the UOM has a conversion entry, the server derives `quantityDelta`; otherwise it falls back to the caller-supplied `quantityDelta`. Both the transacted UOM and base delta are recorded in `stock_movements` for auditability.

**Tech Stack:** Next.js 15 (server actions), Supabase (Postgres + JS SDK), React Hook Form + Zod, shadcn/ui, TanStack Table, Sonner toasts.

**Spec:** `docs/superpowers/specs/2026-06-01-multi-uom-conversion-design.md`

---

## File Map

### New files
- `src/actions/admin/product-uom-conversions.ts` — CRUD + `getProductUomOptions` helper
- `src/components/admin/products/product-uom-conversions-card.tsx` — inline add/list card for edit page
- `src/lib/uom/convert.ts` — pure `convertToBase` + `getLargestFittingUom` utilities
- `src/lib/imports/product-import/upsert-uom-conversions.ts` — import pipeline step

### Modified files
- `src/actions/admin/stock.ts` — add UOM params to `processStockMovement` + `transferStock`
- `src/actions/admin/stock-movements.ts` — add `transact_uom` join + type
- `src/actions/user/stock.ts` — add `product_uom_conversions` to product join + type
- `src/components/admin/products/product-form.tsx` — label update + wire card
- `src/components/admin/stock/movement-dialog.tsx` — full UOM selector rewrite
- `src/components/admin/stock/transfer-dialog.tsx` — add UOM selector
- `src/components/admin/stock-movements/stock-movement-detail-view.tsx` — "Transacted As" card
- `src/components/user/inventory/inventory-table.tsx` — two-line quantity display
- `src/components/user/inventory/inventory-detail-view.tsx` — two-line quantity stat
- `src/lib/imports/product-import/types.ts` — add `alternate_uoms` field + new types
- `src/lib/imports/product-import/validate-row.ts` — parse + validate `alternate_uoms`
- `src/lib/imports/product-import/index.ts` — wire new pipeline step

---

## Phase 1 — Foundation (DB + Admin CRUD)

### Task 1: Run DB migration and regenerate types

**Files:**
- Run SQL in Supabase Dashboard → SQL Editor
- Regenerate: `src/lib/supabase/database.types.ts`

- [ ] **Step 1: Run this SQL in the Supabase Dashboard SQL Editor**

```sql
-- New table for per-product alternate UOM definitions
CREATE TABLE product_uom_conversions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  uom_id              uuid NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT,
  conversion_factor   numeric(18,6) NOT NULL CHECK (conversion_factor > 0),
  is_purchase_default boolean NOT NULL DEFAULT false,
  is_sales_default    boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, uom_id)
);

-- Audit columns on the stock movements ledger
ALTER TABLE stock_movements
  ADD COLUMN transact_uom_id  uuid REFERENCES units_of_measure(id) ON DELETE SET NULL,
  ADD COLUMN transact_quantity numeric(18,6);
```

- [ ] **Step 2: Regenerate TypeScript types**

```bash
pnpm db:types
```

Expected: `src/lib/supabase/database.types.ts` is updated. Verify the new table exists:

```bash
grep "product_uom_conversions" src/lib/supabase/database.types.ts | head -3
```

Expected output contains: `product_uom_conversions:`

- [ ] **Step 3: Verify transact columns on stock_movements**

```bash
grep "transact_uom_id\|transact_quantity" src/lib/supabase/database.types.ts
```

Expected: two lines showing `transact_uom_id` and `transact_quantity` in the stock_movements Row type.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/database.types.ts
git commit -m "feat: add product_uom_conversions table and transact columns to stock_movements"
```

---

### Task 2: Create product-uom-conversions server action

**Files:**
- Create: `src/actions/admin/product-uom-conversions.ts`

- [ ] **Step 1: Create the file**

```typescript
"use server";

import { unstable_cache, revalidateTag } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type ProductUomConversion =
  Database["public"]["Tables"]["product_uom_conversions"]["Row"];

export type ProductUomConversionWithUom = ProductUomConversion & {
  units_of_measure: { uom_code: string; full_name: string } | null;
};

export type UomOption = {
  id: string;
  uom_code: string;
  full_name: string;
  conversion_factor: number;
  is_base: boolean;
  is_purchase_default: boolean;
  is_sales_default: boolean;
};

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin") throw new Error("Forbidden: Admin access required");
}

export async function getProductUomConversions(productId: string) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from("product_uom_conversions")
        .select("*, units_of_measure(uom_code, full_name)")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

      if (error) throw new Error("Failed to fetch product UOM conversions");
      return data as ProductUomConversionWithUom[];
    },
    ["product-uom-conversions", productId],
    { tags: ["products:uom-conversions"], revalidate: 3600 }
  )();
}

/**
 * Returns base UOM + all alternate UOMs for a product as a unified option list.
 * Used by transaction dialogs to populate the UOM selector.
 */
export async function getProductUomOptions(productId: string): Promise<{
  baseUom: UomOption;
  allOptions: UomOption[];
}> {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");

  const adminClient = createAdminClient();

  const [{ data: product, error: productError }, { data: conversions, error: convError }] =
    await Promise.all([
      adminClient
        .from("products")
        .select("uom, units_of_measure(id, uom_code, full_name)")
        .eq("id", productId)
        .single(),
      adminClient
        .from("product_uom_conversions")
        .select(
          "uom_id, conversion_factor, is_purchase_default, is_sales_default, units_of_measure(id, uom_code, full_name)"
        )
        .eq("product_id", productId)
        .order("created_at", { ascending: true }),
    ]);

  if (productError || !product) throw new Error("Product not found");
  if (convError) throw new Error("Failed to fetch UOM conversions");

  const baseUomRaw = product.units_of_measure as unknown as {
    id: string;
    uom_code: string;
    full_name: string;
  } | null;

  if (!baseUomRaw) throw new Error("Product has no base UOM configured");

  const baseUom: UomOption = {
    id: baseUomRaw.id,
    uom_code: baseUomRaw.uom_code,
    full_name: baseUomRaw.full_name,
    conversion_factor: 1,
    is_base: true,
    is_purchase_default: false,
    is_sales_default: false,
  };

  const alternateOptions: UomOption[] = (conversions || []).map((c) => {
    const uom = c.units_of_measure as unknown as {
      id: string;
      uom_code: string;
      full_name: string;
    };
    return {
      id: uom.id,
      uom_code: uom.uom_code,
      full_name: uom.full_name,
      conversion_factor: Number(c.conversion_factor),
      is_base: false,
      is_purchase_default: c.is_purchase_default,
      is_sales_default: c.is_sales_default,
    };
  });

  return {
    baseUom,
    allOptions: [baseUom, ...alternateOptions],
  };
}

export async function createProductUomConversion(data: {
  product_id: string;
  uom_id: string;
  conversion_factor: number;
  is_purchase_default?: boolean;
  is_sales_default?: boolean;
}) {
  try {
    await verifyAdmin();

    if (data.conversion_factor <= 0) {
      return { error: "Conversion factor must be greater than 0" };
    }

    const adminClient = createAdminClient();

    const { data: product, error: productError } = await adminClient
      .from("products")
      .select("uom")
      .eq("id", data.product_id)
      .single();

    if (productError || !product) return { error: "Product not found" };
    if (product.uom === data.uom_id) {
      return { error: "Alternate UOM cannot be the same as the base UOM" };
    }

    if (data.is_purchase_default) {
      await adminClient
        .from("product_uom_conversions")
        .update({ is_purchase_default: false })
        .eq("product_id", data.product_id)
        .eq("is_purchase_default", true);
    }
    if (data.is_sales_default) {
      await adminClient
        .from("product_uom_conversions")
        .update({ is_sales_default: false })
        .eq("product_id", data.product_id)
        .eq("is_sales_default", true);
    }

    const { error } = await adminClient.from("product_uom_conversions").insert({
      product_id: data.product_id,
      uom_id: data.uom_id,
      conversion_factor: data.conversion_factor,
      is_purchase_default: data.is_purchase_default ?? false,
      is_sales_default: data.is_sales_default ?? false,
    });

    if (error) {
      if (error.code === "23505") return { error: "This UOM is already configured for the product" };
      return { error: error.message };
    }

    revalidateTag("products:uom-conversions", "default");
    revalidateTag("admin:products", "default");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "An unknown error occurred" };
  }
}

export async function updateProductUomConversion(
  id: string,
  data: {
    conversion_factor?: number;
    is_purchase_default?: boolean;
    is_sales_default?: boolean;
  }
) {
  try {
    await verifyAdmin();

    if (data.conversion_factor !== undefined && data.conversion_factor <= 0) {
      return { error: "Conversion factor must be greater than 0" };
    }

    const adminClient = createAdminClient();

    const { data: existing, error: fetchError } = await adminClient
      .from("product_uom_conversions")
      .select("product_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) return { error: "Conversion not found" };

    if (data.is_purchase_default) {
      await adminClient
        .from("product_uom_conversions")
        .update({ is_purchase_default: false })
        .eq("product_id", existing.product_id)
        .eq("is_purchase_default", true);
    }
    if (data.is_sales_default) {
      await adminClient
        .from("product_uom_conversions")
        .update({ is_sales_default: false })
        .eq("product_id", existing.product_id)
        .eq("is_sales_default", true);
    }

    const { error } = await adminClient
      .from("product_uom_conversions")
      .update(data)
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateTag("products:uom-conversions", "default");
    revalidateTag("admin:products", "default");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "An unknown error occurred" };
  }
}

export async function deleteProductUomConversion(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("product_uom_conversions")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateTag("products:uom-conversions", "default");
    revalidateTag("admin:products", "default");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "An unknown error occurred" };
  }
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/admin/product-uom-conversions.ts
git commit -m "feat: add product UOM conversions server action"
```

---

### Task 3: Create ProductUomConversionsCard component

**Files:**
- Create: `src/components/admin/products/product-uom-conversions-card.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createProductUomConversion,
  deleteProductUomConversion,
  getProductUomConversions,
  ProductUomConversionWithUom,
} from "@/actions/admin/product-uom-conversions";
import { getUnitsOfMeasure, UnitOfMeasure } from "@/actions/admin/uom";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const addUomSchema = z.object({
  uom_id: z.string().min(1, "UOM is required"),
  conversion_factor: z.coerce.number().positive("Factor must be greater than 0"),
  is_purchase_default: z.boolean().default(false),
  is_sales_default: z.boolean().default(false),
});

type AddUomFormValues = z.infer<typeof addUomSchema>;

interface ProductUomConversionsCardProps {
  productId: string;
  baseUomId: string | null;
}

export function ProductUomConversionsCard({
  productId,
  baseUomId,
}: ProductUomConversionsCardProps) {
  const [conversions, setConversions] = useState<ProductUomConversionWithUom[]>([]);
  const [allUoms, setAllUoms] = useState<UnitOfMeasure[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<AddUomFormValues>({
    resolver: zodResolver(addUomSchema),
    defaultValues: {
      uom_id: "",
      conversion_factor: 1,
      is_purchase_default: false,
      is_sales_default: false,
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [convRes, uomRes] = await Promise.all([
        getProductUomConversions(productId),
        getUnitsOfMeasure({ pageSize: 1000 }),
      ]);
      setConversions(convRes);
      setAllUoms(uomRes.unitsOfMeasure);
    } catch {
      toast.error("Failed to load UOM data");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableUoms = allUoms.filter(
    (u) => u.id !== baseUomId && !conversions.some((c) => c.uom_id === u.id)
  );

  async function onAdd(values: AddUomFormValues) {
    const result = await createProductUomConversion({ product_id: productId, ...values });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Alternate UOM added");
      form.reset();
      setIsAddOpen(false);
      await loadData();
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    const result = await deleteProductUomConversion(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Alternate UOM removed");
      await loadData();
    }
    setDeletingId(null);
  }

  return (
    <Card className="border-border/50 bg-background/40 shadow-sm backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Alternate Units of Measure
        </CardTitle>
        <CardDescription>
          Define other units this product can be transacted in. All quantities
          convert to the base unit when recorded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <>
            {conversions.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UOM</TableHead>
                    <TableHead>Factor</TableHead>
                    <TableHead className="hidden sm:table-cell">Defaults</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">
                            {c.units_of_measure?.uom_code ?? "—"}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {c.units_of_measure?.full_name ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        1 {c.units_of_measure?.uom_code} = {Number(c.conversion_factor)} base
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex gap-1">
                          {c.is_purchase_default && (
                            <Badge variant="outline" className="text-[10px]">
                              Purchase
                            </Badge>
                          )}
                          {c.is_sales_default && (
                            <Badge variant="outline" className="text-[10px]">
                              Sales
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={deletingId === c.id}
                          onClick={() => onDelete(c.id)}
                        >
                          {deletingId === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="text-destructive h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isAddOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={availableUoms.length === 0}
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Alternate UOM
              </Button>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onAdd)}
                  className="space-y-3 rounded-md border p-3"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="uom_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">UOM</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select UOM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableUoms.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.uom_code} — {u.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="conversion_factor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Conversion Factor</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              min="0.000001"
                              placeholder="e.g. 12"
                              className="h-8 text-xs"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="is_purchase_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-normal">
                            Purchase default
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_sales_default"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-normal">
                            Sales default
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting && (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      )}
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        form.reset();
                        setIsAddOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/products/product-uom-conversions-card.tsx
git commit -m "feat: add ProductUomConversionsCard component"
```

---

### Task 4: Update product-form.tsx — relabel Base UOM field and wire card

**Files:**
- Modify: `src/components/admin/products/product-form.tsx`

- [ ] **Step 1: Read the file**

Read `src/components/admin/products/product-form.tsx` to locate the UOM FormField (search for `name="uom"`).

- [ ] **Step 2: Add the import at the top of the file**

After the existing imports, add:

```typescript
import { ProductUomConversionsCard } from "@/components/admin/products/product-uom-conversions-card";
```

- [ ] **Step 3: Update the UOM FormLabel and add a FormDescription**

Find this block (around the `name="uom"` FormField):

```tsx
<FormItem>
  <FormLabel>Unit of Measure</FormLabel>
  <Select
```

Replace `<FormLabel>Unit of Measure</FormLabel>` with:

```tsx
<FormLabel>Base / Stock UOM</FormLabel>
```

And add a `<FormDescription>` after the `<Select>` closing tag but before `<FormMessage />`:

```tsx
<FormDescription className="text-[11px]">
  All stock quantities are stored in this unit.
</FormDescription>
```

- [ ] **Step 4: Add the ProductUomConversionsCard below the existing form cards**

Inside the `<form>` element, after the closing `</div>` of the last grid column (the right column with the UOM card), add:

```tsx
{product?.id && (
  <ProductUomConversionsCard
    productId={product.id}
    baseUomId={product.uom}
  />
)}
```

Place this just before the closing `</form>` tag or after the last `<Card>` in the grid.

- [ ] **Step 5: Type-check and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Start dev server and manually verify**

```bash
pnpm dev
```

1. Navigate to `/admin/products` → click Edit on any product
2. The UOM field label should read "Base / Stock UOM"
3. Below the existing cards, an "Alternate Units of Measure" card should appear
4. Click "Add Alternate UOM" → fill in a UOM and factor → Save → row appears in the table
5. Delete the row → it disappears

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/products/product-form.tsx
git commit -m "feat: add alternate UOM card to product edit form"
```

---

## Phase 2 — Conversion at Transaction Time

### Task 5: Create UOM conversion utilities

**Files:**
- Create: `src/lib/uom/convert.ts`

- [ ] **Step 1: Create the file**

```typescript
/**
 * Convert a quantity in an alternate UOM to the base unit.
 * factor = "how many base units = 1 of this alternate UOM"
 */
export function convertToBase(transactQty: number, factor: number): number {
  return Math.round(transactQty * factor * 1_000_000) / 1_000_000;
}

/**
 * Find the largest alternate UOM where at least 1 whole unit fits into baseQty.
 * Sorts by conversion_factor descending; returns the first where floor(baseQty / factor) >= 1.
 * Returns null if baseQty <= 0 or no conversion qualifies.
 */
export function getLargestFittingUom(
  baseQty: number,
  conversions: Array<{
    uom_code: string;
    full_name: string;
    conversion_factor: number;
  }>
): { uom_code: string; full_name: string; display_qty: number } | null {
  if (baseQty <= 0 || conversions.length === 0) return null;

  const sorted = [...conversions].sort(
    (a, b) => b.conversion_factor - a.conversion_factor
  );

  for (const c of sorted) {
    const displayQty = Math.floor(baseQty / c.conversion_factor);
    if (displayQty >= 1) {
      return { uom_code: c.uom_code, full_name: c.full_name, display_qty: displayQty };
    }
  }

  return null;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/uom/convert.ts
git commit -m "feat: add convertToBase and getLargestFittingUom utilities"
```

---

### Task 6: Add UOM conversion to processStockMovement and transferStock

**Files:**
- Modify: `src/actions/admin/stock.ts`

- [ ] **Step 1: Read the file**

Read `src/actions/admin/stock.ts` in full.

- [ ] **Step 2: Update the processStockMovement signature**

Find the `processStockMovement` function signature. Replace the `data` parameter type with:

```typescript
data: {
  productId: string;
  warehouseId: string;
  shopTypeId: string;
  quantityDelta: number;
  type: StockMovementType;
  notes?: string;
  referenceId?: string;
  transactUomId?: string;
  transactQuantity?: number;
}
```

- [ ] **Step 3: Add conversion logic inside processStockMovement**

After the `const userId = await verifyUserPermission(...)` line and before the first Supabase query, insert:

```typescript
const adminClient = createAdminClient();

// UOM conversion: if an alternate UOM was transacted, derive the base-unit delta
let effectiveQuantityDelta = data.quantityDelta;
let effectiveTransactUomId: string | null = null;
let effectiveTransactQuantity: number | null = null;

if (data.transactUomId && data.transactQuantity !== undefined) {
  const { data: conversion, error: convError } = await adminClient
    .from("product_uom_conversions")
    .select("conversion_factor")
    .eq("product_id", data.productId)
    .eq("uom_id", data.transactUomId)
    .maybeSingle();

  if (convError) throw convError;

  if (conversion) {
    effectiveQuantityDelta =
      Math.round(data.transactQuantity * Number(conversion.conversion_factor) * 1_000_000) /
      1_000_000;
    effectiveTransactUomId = data.transactUomId;
    effectiveTransactQuantity = data.transactQuantity;
  }
}
```

> Note: The existing code already declares `const adminClient = createAdminClient();` further down. Move that line up to replace the one you just added, or remove the duplicate. There should be exactly one `const adminClient = createAdminClient();` at the top of the try block.

- [ ] **Step 4: Replace all uses of data.quantityDelta inside the function body with effectiveQuantityDelta**

Search for `data.quantityDelta` in the function body (after the conversion block). There are uses in:
1. `if (data.type === "initial_stock" && currentStock)` check — keep as-is (no change needed)
2. `const previousQuantity = currentStock?.quantity || 0;`
3. `const newQuantity = previousQuantity + data.quantityDelta;` → change to `effectiveQuantityDelta`
4. The `stock_adjustments` insert `quantity_delta: data.quantityDelta` → change to `effectiveQuantityDelta`

- [ ] **Step 5: Update the stock_movements insert to include transact fields**

Find the `stock_movements` insert in `processStockMovement`. Add two fields:

```typescript
const { error: movementError } = await adminClient
  .from("stock_movements")
  .insert({
    product_id: data.productId,
    warehouse_id: data.warehouseId,
    shop_type_id: data.shopTypeId,
    quantity_delta: effectiveQuantityDelta,     // changed from data.quantityDelta
    previous_quantity: previousQuantity,
    new_quantity: newQuantity,
    type: data.type,
    notes: data.notes || null,
    reference_id: effectiveReferenceId || null,
    created_by: userId,
    transact_uom_id: effectiveTransactUomId,    // NEW
    transact_quantity: effectiveTransactQuantity, // NEW
  });
```

- [ ] **Step 6: Update transferStock signature and add UOM passthrough**

Find the `transferStock` function. Add to its `data` parameter type:

```typescript
transactUomId?: string;
transactQty?: number;
```

Inside `transferStock`, before the source stock check, add a conversion block to derive the effective base quantity:

```typescript
// Resolve base quantity for availability check and transfer record
let baseQuantity = data.quantity;
if (data.transactUomId && data.transactQty) {
  const { data: conversion } = await adminClient
    .from("product_uom_conversions")
    .select("conversion_factor")
    .eq("product_id", data.productId)
    .eq("uom_id", data.transactUomId)
    .maybeSingle();

  if (conversion) {
    baseQuantity =
      Math.round(data.transactQty * Number(conversion.conversion_factor) * 1_000_000) /
      1_000_000;
  }
}
```

> Note: `transferStock` also already has `const adminClient = createAdminClient();` — place the conversion block after that line, before the source stock check.

Replace `data.quantity` with `baseQuantity` in:
1. `sourceStock.quantity < data.quantity` check → `sourceStock.quantity < baseQuantity`
2. `stock_transfers` insert `quantity: data.quantity` → `quantity: baseQuantity`
3. Both `processStockMovement` calls `quantityDelta: -data.quantity` / `+data.quantity` → use `-baseQuantity` / `+baseQuantity`

And pass transact fields to both `processStockMovement` calls:

```typescript
// transfer_out call — add:
transactUomId: data.transactUomId,
transactQuantity: data.transactQty ? -data.transactQty : undefined,

// transfer_in call — add:
transactUomId: data.transactUomId,
transactQuantity: data.transactQty ? data.transactQty : undefined,
```

- [ ] **Step 7: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/actions/admin/stock.ts
git commit -m "feat: add UOM conversion to processStockMovement and transferStock"
```

---

### Task 7: Rewrite StockMovementDialog with UOM selector

**Files:**
- Modify: `src/components/admin/stock/movement-dialog.tsx`

- [ ] **Step 1: Read the full file**

Read `src/components/admin/stock/movement-dialog.tsx`.

- [ ] **Step 2: Replace the entire file content**

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  getProductUomOptions,
  UomOption,
} from "@/actions/admin/product-uom-conversions";
import { getProducts } from "@/actions/admin/products";
import { getShops } from "@/actions/admin/shops";
import { processStockMovement, StockWithDetails } from "@/actions/admin/stock";
import { getWarehouses } from "@/actions/admin/warehouses";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const movementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  shopTypeId: z.string().min(1, "Shop type is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  adjustmentDirection: z.enum(["add", "remove"]).default("add"),
  notes: z.string().optional(),
});

type MovementFormValues = z.infer<typeof movementSchema>;

interface StockMovementDialogProps {
  mode: "initial" | "adjustment" | "in" | "out" | "return";
  initialData?: StockWithDetails;
  onSuccess: () => void;
}

export function StockMovementDialog({
  mode,
  initialData,
  onSuccess,
}: StockMovementDialogProps) {
  const [products, setProducts] = useState<
    { id: string; name: string; sku: string | null }[]
  >([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [shopTypes, setShopTypes] = useState<{ id: string; name: string }[]>([]);
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      productId: initialData?.product_id || "",
      warehouseId: initialData?.warehouse_id || "",
      shopTypeId: initialData?.shop_type_id || "",
      transactUomId: "",
      transactQty: 1,
      adjustmentDirection: "add",
      notes: "",
    },
  });

  const watchedProductId = form.watch("productId");
  const watchedUomId = form.watch("transactUomId");
  const watchedQty = form.watch("transactQty");

  // Fetch reference data for initial mode
  useEffect(() => {
    if (mode !== "initial") return;
    const fetchData = async () => {
      setFetching(true);
      try {
        const [pResult, wResult, sResult] = await Promise.all([
          getProducts({ pageSize: 1000 }),
          getWarehouses({ pageSize: 100 }),
          getShops({ pageSize: 100 }),
        ]);
        setProducts(pResult.products);
        setWarehouses(wResult.warehouses);
        setShopTypes(sResult.shops);
      } catch {
        toast.error("Failed to fetch reference data");
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [mode]);

  // Fetch UOM options whenever the product ID is known
  useEffect(() => {
    const effectiveProductId = initialData?.product_id || watchedProductId;
    if (!effectiveProductId) return;

    getProductUomOptions(effectiveProductId)
      .then((result) => {
        setUomOptions(result.allOptions);
        // Pre-select the appropriate default UOM for this mode
        const defaultOption =
          mode === "in" || mode === "initial"
            ? result.allOptions.find((u) => u.is_purchase_default) ??
              result.baseUom
            : mode === "out" || mode === "return"
              ? result.allOptions.find((u) => u.is_sales_default) ??
                result.baseUom
              : result.baseUom;
        form.setValue("transactUomId", defaultOption.id);
      })
      .catch(() => toast.error("Failed to fetch UOM options"));
  }, [initialData?.product_id, watchedProductId, mode, form]);

  const selectedUomOption = uomOptions.find((u) => u.id === watchedUomId);
  const conversionHint =
    selectedUomOption && !selectedUomOption.is_base && watchedQty > 0
      ? `= ${Math.round(watchedQty * selectedUomOption.conversion_factor * 1_000_000) / 1_000_000} base units`
      : null;

  async function onSubmit(values: MovementFormValues) {
    setLoading(true);
    try {
      const isSubtraction =
        mode === "out" ||
        (mode === "adjustment" && values.adjustmentDirection === "remove");

      const signedTransactQty = isSubtraction ? -values.transactQty : values.transactQty;

      const result = await processStockMovement({
        productId: values.productId,
        warehouseId: values.warehouseId,
        shopTypeId: values.shopTypeId,
        quantityDelta: signedTransactQty, // fallback when base UOM selected (no conversion entry)
        type: mode === "initial" ? "initial_stock" : mode,
        notes: values.notes,
        transactUomId: values.transactUomId,
        transactQuantity: signedTransactQty,
      });

      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Stock ${mode} processed successfully`);
        onSuccess();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        {mode === "initial" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Product</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={fetching}
                        >
                          {field.value
                            ? products.find((p) => p.id === field.value)?.name
                            : "Select product..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search product..." />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {products.map((p) => (
                              <CommandItem
                                value={p.name}
                                key={p.id}
                                onSelect={() => form.setValue("productId", p.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    p.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {p.name}
                                {p.sku && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    ({p.sku})
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem className="flex flex-col text-sm">
                  <FormLabel>Warehouse</FormLabel>
                  <select
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                    disabled={fetching}
                  >
                    <option value="">Select warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shopTypeId"
              render={({ field }) => (
                <FormItem className="flex flex-col text-sm">
                  <FormLabel>Shop Type</FormLabel>
                  <select
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                    disabled={fetching}
                  >
                    <option value="">Select shop type...</option>
                    {shopTypes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* UOM selector */}
          <FormField
            control={form.control}
            name="transactUomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={uomOptions.length === 0}>
                      <SelectValue placeholder="Loading..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {uomOptions.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.uom_code}
                        {u.is_base ? " (base)" : ` (1 = ${u.conversion_factor} base)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quantity */}
          <FormField
            control={form.control}
            name="transactQty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Quantity
                  {selectedUomOption
                    ? ` (${selectedUomOption.uom_code})`
                    : ""}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.000001"
                    step="any"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                {conversionHint ? (
                  <FormDescription className="text-xs text-blue-600 dark:text-blue-400">
                    {conversionHint}
                  </FormDescription>
                ) : (
                  <FormDescription>
                    Current stock: {initialData?.quantity ?? 0}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Adjustment direction toggle */}
        {mode === "adjustment" && (
          <FormField
            control={form.control}
            name="adjustmentDirection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direction</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={field.value === "add" ? "default" : "outline"}
                    size="sm"
                    onClick={() => field.onChange("add")}
                  >
                    + Add
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === "remove" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => field.onChange("remove")}
                  >
                    − Remove
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Reason for adjustment, invoice number, etc."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm {mode}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Start dev server and manually verify**

```bash
pnpm dev
```

1. Open a stock movement dialog (e.g., on `/admin/stock` → click any action)
2. The UOM dropdown should appear pre-selected based on mode
3. Select an alternate UOM → the conversion hint `= X base units` appears below quantity
4. Submit → movement is recorded; check `/admin/stock-movements` for the new entry

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/stock/movement-dialog.tsx
git commit -m "feat: add UOM selector with live conversion hint to stock movement dialog"
```

---

### Task 8: Add UOM selector to StockTransferDialog

**Files:**
- Modify: `src/components/admin/stock/transfer-dialog.tsx`

- [ ] **Step 1: Read the file**

Read `src/components/admin/stock/transfer-dialog.tsx`.

- [ ] **Step 2: Add import at the top**

```typescript
import {
  getProductUomOptions,
  UomOption,
} from "@/actions/admin/product-uom-conversions";
```

Also add shadcn imports `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` if not already present.

- [ ] **Step 3: Update the schema**

Replace the current `transferSchema`:

```typescript
const transferSchema = z.object({
  destWarehouseId: z.string().min(1, "Destination warehouse is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be at least 0.000001"),
  notes: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;
```

- [ ] **Step 4: Add uomOptions state and useEffect**

Add state:
```typescript
const [uomOptions, setUomOptions] = useState<UomOption[]>([]);
```

Add a useEffect after the existing warehouse-fetch useEffect:

```typescript
useEffect(() => {
  getProductUomOptions(initialData.product_id)
    .then((result) => {
      setUomOptions(result.allOptions);
      const defaultOption =
        result.allOptions.find((u) => u.is_purchase_default) ?? result.baseUom;
      form.setValue("transactUomId", defaultOption.id);
    })
    .catch(() => toast.error("Failed to fetch UOM options"));
}, [initialData.product_id, form]);
```

- [ ] **Step 5: Update form defaultValues**

```typescript
defaultValues: {
  destWarehouseId: "",
  transactUomId: "",
  transactQty: 1,
  notes: "",
},
```

- [ ] **Step 6: Update onSubmit**

Replace the current `onSubmit` body:

```typescript
async function onSubmit(values: TransferFormValues) {
  setLoading(true);
  try {
    const result = await transferStock({
      productId: initialData.product_id,
      sourceWarehouseId: initialData.warehouse_id,
      destWarehouseId: values.destWarehouseId,
      shopTypeId: initialData.shop_type_id,
      quantity: values.transactQty,
      notes: values.notes,
      transactUomId: values.transactUomId,
      transactQty: values.transactQty,
    });

    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Stock transfer successful");
      onSuccess();
    }
  } catch {
    toast.error("Something went wrong");
  } finally {
    setLoading(false);
  }
}
```

- [ ] **Step 7: Add UOM selector to JSX**

In the form JSX, before the existing quantity `<Input>`, add a UOM selector field:

```tsx
<FormField
  control={form.control}
  name="transactUomId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Unit of Measure</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger disabled={uomOptions.length === 0}>
            <SelectValue placeholder="Loading..." />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {uomOptions.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.uom_code}
              {u.is_base ? " (base)" : ` (1 = ${u.conversion_factor} base)`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

And replace the `name="quantity"` field with `name="transactQty"`:

```tsx
<FormField
  control={form.control}
  name="transactQty"
  render={({ field }) => (
    <FormItem>
      <FormLabel>
        Quantity to Transfer
        {uomOptions.find((u) => u.id === form.watch("transactUomId"))?.uom_code
          ? ` (${uomOptions.find((u) => u.id === form.watch("transactUomId"))?.uom_code})`
          : ""}
      </FormLabel>
      <FormControl>
        <Input
          type="number"
          step="any"
          min="0.000001"
          {...field}
          onChange={(e) => field.onChange(Number(e.target.value))}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Also remove the `max={initialData.quantity}` prop from the old quantity input — the server validates stock availability.

- [ ] **Step 8: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/stock/transfer-dialog.tsx
git commit -m "feat: add UOM selector to stock transfer dialog"
```

---

### Task 9: Update stock-movements type and detail view

**Files:**
- Modify: `src/actions/admin/stock-movements.ts`
- Modify: `src/components/admin/stock-movements/stock-movement-detail-view.tsx`

- [ ] **Step 1: Update StockMovementWithDetails type**

In `src/actions/admin/stock-movements.ts`, find `StockMovementWithDetails` and add one field:

```typescript
export type StockMovementWithDetails = StockMovementRow & {
  products: {
    name: string;
    sku: string | null;
    brands?: { name: string } | null;
    description?: string | null;
  } | null;
  warehouses: { name: string; location?: string | null } | null;
  shop_types: { name: string } | null;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  } | null;
  transact_uom: { uom_code: string; full_name: string } | null; // NEW
};
```

- [ ] **Step 2: Update getStockMovementById query**

In `getStockMovementById`, update the select string to add the UOM join:

```typescript
const { data, error } = await adminClient
  .from("stock_movements")
  .select(
    `
    *,
    products(name, sku, description, brands(name)),
    warehouses(name, location),
    shop_types(name),
    profiles:created_by(full_name, email, avatar_url),
    transact_uom:units_of_measure!stock_movements_transact_uom_id_fkey(uom_code, full_name)
  `
  )
  .eq("id", id)
  .single();
```

> Note: if Supabase returns a type error about the FK name `stock_movements_transact_uom_id_fkey`, open `src/lib/supabase/database.types.ts`, find the `stock_movements` Relationships array, and locate the actual FK name for the `transact_uom_id` column. Use that name in the join hint.

- [ ] **Step 3: Add "Transacted As" card to the detail view**

In `src/components/admin/stock-movements/stock-movement-detail-view.tsx`, inside the `<div className="grid ...">` that holds the `<DetailCard>` components, add one new card at the end of the grid:

```tsx
{movement.transact_uom && movement.transact_quantity !== null && (
  <DetailCard
    label="Transacted As"
    icon={ArrowRightLeft}
    value={`${Math.abs(movement.transact_quantity)} ${movement.transact_uom.uom_code}`}
    subvalue={`→ ${movement.quantity_delta} base units`}
  />
)}
```

`ArrowRightLeft` is already imported in this file. `movement.transact_quantity` is `number | null` after the type regeneration.

- [ ] **Step 4: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/actions/admin/stock-movements.ts src/components/admin/stock-movements/stock-movement-detail-view.tsx
git commit -m "feat: show transacted UOM in stock movement detail view"
```

---

## Phase 3 — Display Conversion in Inventory

### Task 10: Update getUserStocks, getUserStockById, and UserStockWithDetails

**Files:**
- Modify: `src/actions/user/stock.ts`

- [ ] **Step 1: Read the file**

Read `src/actions/user/stock.ts`.

- [ ] **Step 2: Update UserStockWithDetails type**

Find the `UserStockWithDetails` type export and add `product_uom_conversions` to the products shape:

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
      product_uom_conversions: Array<{   // NEW
        conversion_factor: number;
        units_of_measure: { uom_code: string; full_name: string } | null;
      }>;
    } | null;
    warehouses: { name: string } | null;
    shop_types: { name: string } | null;
  };
```

- [ ] **Step 3: Update the products join in getUserStocks**

Find the `.select(...)` string inside `getUserStocks` that contains `products!inner(`. Add `product_uom_conversions` to the products sub-select:

```typescript
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
```

- [ ] **Step 4: Update the products join in getUserStockById**

Same change — find the `.select(...)` in `getUserStockById` and add:

```
product_uom_conversions(conversion_factor, units_of_measure(uom_code, full_name))
```

inside the `products(...)` sub-select.

- [ ] **Step 5: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/actions/user/stock.ts
git commit -m "feat: include product_uom_conversions in user stock queries"
```

---

### Task 11: Update admin getStocks and StockWithDetails

**Files:**
- Modify: `src/actions/admin/stock.ts`

- [ ] **Step 1: Update StockWithDetails type**

Find `StockWithDetails` in `src/actions/admin/stock.ts` and add `product_uom_conversions` to the products shape:

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
    product_uom_conversions: Array<{   // NEW
      conversion_factor: number;
      units_of_measure: { uom_code: string; full_name: string } | null;
    }>;
  } | null;
  warehouses: { name: string } | null;
  shop_types: { name: string } | null;
};
```

- [ ] **Step 2: Update getStocks query**

Inside `getStocks`, find the `.select(...)` string with `products!inner(`. Add to the products sub-select:

```
product_uom_conversions(conversion_factor, units_of_measure(uom_code, full_name))
```

- [ ] **Step 3: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/actions/admin/stock.ts
git commit -m "feat: include product_uom_conversions in admin stock query"
```

---

### Task 12: Two-line quantity display in inventory table, admin stock columns, and detail view

**Files:**
- Modify: `src/components/user/inventory/inventory-table.tsx`
- Modify: `src/components/admin/stock/columns.tsx`
- Modify: `src/components/user/inventory/inventory-detail-view.tsx`

- [ ] **Step 1: Add the import to inventory-table.tsx**

At the top of `src/components/user/inventory/inventory-table.tsx`, add:

```typescript
import { getLargestFittingUom } from "@/lib/uom/convert";
```

- [ ] **Step 2: Replace the quantity cell in inventory-table.tsx**

Find this block (around line 118):

```tsx
<TableCell className="py-2 pr-4 pl-0 text-right">
  <div className="flex flex-col items-end">
    <span
      className={`text-sm leading-none font-bold ${isLowStock ? "text-destructive" : "text-primary"}`}
    >
      {stock.quantity}
    </span>
    <span className="text-muted-foreground mt-0.5 text-[9px] font-bold tracking-tight uppercase">
      {stock.products?.units_of_measure?.uom_code || "units"}
    </span>
  </div>
</TableCell>
```

Replace it with:

```tsx
<TableCell className="py-2 pr-4 pl-0 text-right">
  <div className="flex flex-col items-end">
    <span
      className={`text-sm leading-none font-bold ${isLowStock ? "text-destructive" : "text-primary"}`}
    >
      {stock.quantity}
    </span>
    <span className="text-muted-foreground mt-0.5 text-[9px] font-bold tracking-tight uppercase">
      {stock.products?.units_of_measure?.uom_code || "units"}
    </span>
    {(() => {
      const alt = getLargestFittingUom(
        stock.quantity,
        (stock.products?.product_uom_conversions ?? []).map((c) => ({
          uom_code: c.units_of_measure?.uom_code ?? "",
          full_name: c.units_of_measure?.full_name ?? "",
          conversion_factor: Number(c.conversion_factor),
        }))
      );
      return alt ? (
        <span className="text-muted-foreground/60 mt-0.5 text-[9px] tracking-tight">
          {alt.display_qty} {alt.uom_code}
        </span>
      ) : null;
    })()}
  </div>
</TableCell>
```

- [ ] **Step 3: Add two-line display to admin stock columns.tsx**

Read `src/components/admin/stock/columns.tsx`.

Add the import at the top:

```typescript
import { getLargestFittingUom } from "@/lib/uom/convert";
```

Find the `quantity` column cell (currently just renders `{quantity}`). Replace the cell renderer:

```tsx
cell: ({ row }) => {
  const quantity = row.original.quantity;
  const alt = getLargestFittingUom(
    quantity,
    (row.original.products?.product_uom_conversions ?? []).map((c) => ({
      uom_code: c.units_of_measure?.uom_code ?? "",
      full_name: c.units_of_measure?.full_name ?? "",
      conversion_factor: Number(c.conversion_factor),
    }))
  );
  return (
    <div className="flex flex-col">
      <span
        className={`font-mono text-[10px] font-bold sm:text-xs ${quantity <= 5 ? "text-destructive" : ""}`}
      >
        {quantity}
      </span>
      {alt && (
        <span className="text-muted-foreground/60 text-[9px]">
          {alt.display_qty} {alt.uom_code}
        </span>
      )}
    </div>
  );
},
```

- [ ] **Step 4: Add two-line display to inventory-detail-view.tsx**

Read `src/components/user/inventory/inventory-detail-view.tsx`.

At the top, add:

```typescript
import { getLargestFittingUom } from "@/lib/uom/convert";
```

Find the "Current Stock" display block (around the `{stock.quantity}` span). After the existing UOM code span:

```tsx
<span className="text-muted-foreground text-sm font-medium">
  {stock.products?.units_of_measure?.uom_code || "units"}
</span>
```

Add:

```tsx
{(() => {
  const alt = getLargestFittingUom(
    stock.quantity,
    (stock.products?.product_uom_conversions ?? []).map((c) => ({
      uom_code: c.units_of_measure?.uom_code ?? "",
      full_name: c.units_of_measure?.full_name ?? "",
      conversion_factor: Number(c.conversion_factor),
    }))
  );
  return alt ? (
    <span className="text-muted-foreground/60 text-xs">
      · {alt.display_qty} {alt.uom_code}
    </span>
  ) : null;
})()}
```

- [ ] **Step 5: Type-check and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Manually verify in browser**

```bash
pnpm dev
```

1. Navigate to the user inventory list — a product with alternates configured shows two-line quantity
2. Navigate to `/admin/stock` — same two-line quantity in the Quantity column
3. Click into a stock item detail view — the Current Stock stat shows the alternate UOM hint
4. For products with no alternates configured, only the base quantity line appears

- [ ] **Step 7: Commit**

```bash
git add src/components/user/inventory/inventory-table.tsx src/components/admin/stock/columns.tsx src/components/user/inventory/inventory-detail-view.tsx
git commit -m "feat: show base + largest-fitting alternate UOM in inventory quantity display"
```

---

## Phase 4 — CSV Import Pipeline

### Task 13: Update import types and validate-row

**Files:**
- Modify: `src/lib/imports/product-import/types.ts`
- Modify: `src/lib/imports/product-import/validate-row.ts`

- [ ] **Step 1: Update types.ts**

Read `src/lib/imports/product-import/types.ts`.

Add `ParsedAlternateUom` type and update `CsvRow`, `CsvRowSchema`, and `NormalizedRow`:

In `CsvRow`, add:

```typescript
alternate_uoms: string;
```

In `CsvRowSchema`, add:

```typescript
alternate_uoms: z.string().nullable().optional(),
```

Add the new type after the existing types:

```typescript
export interface ParsedAlternateUom {
  uom_code: string;
  conversion_factor: number;
  is_purchase_default: boolean;
  is_sales_default: boolean;
}
```

Update `NormalizedRow`:

```typescript
export interface NormalizedRow extends ValidatedRow {
  _originalRowIndex: number;
  _parsedAlternateUoms: ParsedAlternateUom[];  // NEW
}
```

- [ ] **Step 2: Add parseAlternateUoms helper to validate-row.ts**

Read `src/lib/imports/product-import/validate-row.ts`.

Add the following function to `validate-row.ts` (above `validateRow`):

```typescript
import { CsvRow, CsvRowSchema, NormalizedRow, ParsedAlternateUom } from "./types";

function parseAlternateUoms(
  raw: string | null | undefined,
  baseUomCode: string | null | undefined
): { data: ParsedAlternateUom[]; errors: string[] } {
  if (!raw || raw.trim() === "") return { data: [], errors: [] };

  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const results: ParsedAlternateUom[] = [];
  const errors: string[] = [];
  let purchaseDefaultCount = 0;
  let salesDefaultCount = 0;

  for (const entry of entries) {
    const parts = entry.split(":");
    if (parts.length < 2) {
      errors.push(
        `Invalid alternate UOM entry "${entry}": expected "UOM_CODE:FACTOR[:purchase][:sales]"`
      );
      continue;
    }

    const uom_code = parts[0].trim().toUpperCase();
    const factor = Number(parts[1].trim());

    if (isNaN(factor) || factor <= 0) {
      errors.push(
        `Invalid conversion factor for UOM "${uom_code}": must be a positive number`
      );
      continue;
    }

    if (baseUomCode && uom_code === baseUomCode.toUpperCase()) {
      errors.push(`Alternate UOM "${uom_code}" cannot be the same as the base UOM`);
      continue;
    }

    const flags = parts.slice(2).map((f) => f.trim().toLowerCase());
    const is_purchase_default = flags.includes("purchase");
    const is_sales_default = flags.includes("sales");

    if (is_purchase_default) purchaseDefaultCount++;
    if (is_sales_default) salesDefaultCount++;

    results.push({ uom_code, conversion_factor: factor, is_purchase_default, is_sales_default });
  }

  if (purchaseDefaultCount > 1)
    errors.push("At most one alternate UOM can be the purchase default");
  if (salesDefaultCount > 1)
    errors.push("At most one alternate UOM can be the sales default");

  return { data: results, errors };
}
```

- [ ] **Step 3: Update validateRow to parse alternate_uoms and populate _parsedAlternateUoms**

Inside `validateRow`, after the `CsvRowSchema.safeParse` call and before the `return`, add:

```typescript
const { data: parsedAlts, errors: altErrors } = parseAlternateUoms(
  cleanedRow.alternate_uoms,
  cleanedRow.uom_code
);

if (altErrors.length > 0) {
  return { data: null, errors: altErrors };
}

return {
  data: {
    ...parsed.data,
    _originalRowIndex: index,
    _parsedAlternateUoms: parsedAlts,
  },
  errors: [],
};
```

Also update the early return (when `!parsed.success`) to not include `_parsedAlternateUoms` — it already returns `null`.

The function signature's return type is inferred, so no explicit annotation change is needed.

- [ ] **Step 4: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/imports/product-import/types.ts src/lib/imports/product-import/validate-row.ts
git commit -m "feat: add alternate_uoms parsing to CSV import pipeline"
```

---

### Task 14: Create upsert-uom-conversions pipeline step

**Files:**
- Create: `src/lib/imports/product-import/upsert-uom-conversions.ts`

- [ ] **Step 1: Create the file**

```typescript
import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/lib/supabase/database.types";

import { normalizeKey } from "./helpers";
import { LookupMaps, NormalizedRow } from "./types";

interface UomConversionUpsertResult {
  upsertedUomConversions: number;
  errors: { row: number; error: string }[];
}

export async function upsertUomConversions(
  supabase: SupabaseClient<Database>,
  rows: NormalizedRow[],
  lookups: LookupMaps
): Promise<UomConversionUpsertResult> {
  const result: UomConversionUpsertResult = {
    upsertedUomConversions: 0,
    errors: [],
  };

  for (const row of rows) {
    if (!row._parsedAlternateUoms || row._parsedAlternateUoms.length === 0) continue;

    // Resolve the product
    const product = row.sku
      ? lookups.productsBySku.get(normalizeKey(row.sku))
      : lookups.productsByName.get(normalizeKey(row.product_name));

    if (!product) continue;

    for (const alt of row._parsedAlternateUoms) {
      const uom = lookups.uoms.get(normalizeKey(alt.uom_code));
      if (!uom) {
        result.errors.push({
          row: row._originalRowIndex,
          error: `Alternate UOM "${alt.uom_code}" not found in units_of_measure table`,
        });
        continue;
      }

      // Clear existing purchase/sales defaults before setting new ones
      if (alt.is_purchase_default) {
        await supabase
          .from("product_uom_conversions")
          .update({ is_purchase_default: false })
          .eq("product_id", product.id)
          .eq("is_purchase_default", true);
      }
      if (alt.is_sales_default) {
        await supabase
          .from("product_uom_conversions")
          .update({ is_sales_default: false })
          .eq("product_id", product.id)
          .eq("is_sales_default", true);
      }

      const { error } = await supabase
        .from("product_uom_conversions")
        .upsert(
          {
            product_id: product.id,
            uom_id: uom.id,
            conversion_factor: alt.conversion_factor,
            is_purchase_default: alt.is_purchase_default,
            is_sales_default: alt.is_sales_default,
          },
          { onConflict: "product_id,uom_id", ignoreDuplicates: false }
        );

      if (error) {
        result.errors.push({
          row: row._originalRowIndex,
          error: `Failed to upsert UOM conversion for "${alt.uom_code}": ${error.message}`,
        });
      } else {
        result.upsertedUomConversions++;
      }
    }
  }

  return result;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/imports/product-import/upsert-uom-conversions.ts
git commit -m "feat: add upsertUomConversions import pipeline step"
```

---

### Task 15: Wire upsertUomConversions into the pipeline and update ImportResult

**Files:**
- Modify: `src/lib/imports/product-import/types.ts`
- Modify: `src/lib/imports/product-import/index.ts`

- [ ] **Step 1: Add upsertedUomConversions to ImportResult**

In `src/lib/imports/product-import/types.ts`, find `ImportResult` and add one field:

```typescript
export interface ImportResult {
  totalRows: number;
  insertedProducts: number;
  updatedProducts: number;
  insertedStockRows: number;
  upsertedUomConversions: number;  // NEW
  failedRows: number;
  errors: { row: number; error: string }[];
}
```

- [ ] **Step 2: Initialize and populate in index.ts**

Read `src/lib/imports/product-import/index.ts`.

Add the import at the top:

```typescript
import { upsertUomConversions } from "./upsert-uom-conversions";
```

In the `result` initialization object, add:

```typescript
upsertedUomConversions: 0,
```

After Step 5 (upsert products) and before Step 6 (upsert stock), add:

```typescript
// Step 5b: Upsert UOM conversions
const uomResult = await upsertUomConversions(supabase, validRows, lookups);
result.upsertedUomConversions = uomResult.upsertedUomConversions;
result.errors.push(...uomResult.errors);
```

- [ ] **Step 3: Type-check and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Manually verify import**

```bash
pnpm dev
```

1. Navigate to `/admin/products/import`
2. Upload a CSV with a row like:

```csv
product_name,uom_code,uom_full_name,alternate_uoms,...
Test Widget,PC,Piece,"BOX:12:purchase,CTN:144:sales",...
```

3. After import, navigate to the product's edit page → the "Alternate Units of Measure" card should show BOX and CTN with their factors and default badges.

- [ ] **Step 5: Commit**

```bash
git add src/lib/imports/product-import/types.ts src/lib/imports/product-import/index.ts
git commit -m "feat: wire UOM conversions step into CSV import pipeline"
```

---

## Final verification

- [ ] **Run full type-check and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors on either command.

- [ ] **Run a production build**

```bash
pnpm build
```

Expected: build completes with no errors. Address any build-time errors before shipping.
