# Stock Movement Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing 5-button stock movement UI with 4 primary action types (IN, OUT, TRANSFER, ADJUSTMENT), each with structured sub-type dropdowns stored in the DB, and change transfers to a pending-first workflow.

**Architecture:** Server actions in `src/actions/admin/stock.ts` are extended to accept `subType` and a new `completeTransfer`/`cancelTransfer` workflow. A new unified `StockMovementModal` component on the user side replaces the fragmented `inventory-dialogs.tsx`. Admin dialogs are updated in place with sub-type dropdowns. Pending transfers surface as a card on the inventory detail page.

**Tech Stack:** Next.js 14 App Router, React Hook Form + Zod, shadcn/ui, Supabase (service-role admin client), TanStack Table

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/actions/admin/stock.ts` | Modify | Add `subType` to `processStockMovement`; rewrite `transferStock` as pending-only; add `completeTransfer`, `cancelTransfer` |
| `src/actions/user/stock.ts` | Modify | Add `getPendingTransfers` for fetching pending transfers by stock item |
| `src/components/user/inventory/stock-movement-modal.tsx` | **Create** | Unified 4-type modal with sub-type dropdowns for user side |
| `src/components/user/inventory/inventory-dialogs.tsx` | Modify | Wire up new `StockMovementModal`; remove old dialog logic |
| `src/components/user/inventory/inventory-detail-view.tsx` | Modify | 4 action buttons (drop Return), add pending transfers card |
| `src/app/(user)/inventory/[stockId]/page.tsx` | Modify | Fetch pending transfers server-side; pass to detail view |
| `src/components/admin/stock/movement-dialog.tsx` | Modify | Add sub-type dropdown per mode; wire `subType` into action call; remove `return` mode |
| `src/components/admin/stock/transfer-dialog.tsx` | Modify | Call updated `transferStock` (pending-only); show status note |
| `src/components/admin/stock/stock-actions.tsx` | Modify | Remove `return` from mode union and dropdown |
| `src/components/admin/stock-movements/columns.tsx` | Modify | Remove stale `return`/`initial_stock` typeConfig entries; add sub_type badge |

---

## Task 1: Update server actions — subType + transfer pending workflow

**Files:**
- Modify: `src/actions/admin/stock.ts`

- [ ] **Step 1: Update `StockMovementType` alias and `verifyUserPermission`**

Replace the `StockMovementType` alias and `verifyUserPermission` to remove the `return` action type (returns are now sub-types of `in`/`out`):

```typescript
// src/actions/admin/stock.ts  — top of file, after imports

export type StockMovementType = Database["public"]["Enums"]["movement_type"];
export type MovementSubType = Database["public"]["Enums"]["movement_sub_type"];

// Replace the entire verifyUserPermission function:
async function verifyUserPermission(
  actionType: "transfer" | "adjustment" | "in" | "out" | "initial_stock"
) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) throw new Error("Unauthorized");

  if (auth.role === "admin") return auth.userId;

  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select(
      "perm_do_transfer, perm_do_adjustment, perm_do_purchase, perm_do_sale"
    )
    .eq("id", auth.userId)
    .single();

  if (error || !profile) throw new Error("Forbidden: Could not verify user permissions");

  let hasPermission = false;
  switch (actionType) {
    case "transfer":
      hasPermission = profile.perm_do_transfer;
      break;
    case "adjustment":
    case "initial_stock":
      hasPermission = profile.perm_do_adjustment;
      break;
    case "in":
      hasPermission = profile.perm_do_purchase;
      break;
    case "out":
      hasPermission = profile.perm_do_sale;
      break;
  }

  if (!hasPermission)
    throw new Error(`Forbidden: You do not have permission to perform ${actionType}`);

  return auth.userId;
}
```

- [ ] **Step 2: Add `subType` to `processStockMovement`**

Update the function signature and the `stock_movements` + `stock_adjustments` inserts to include `sub_type` / `adjustment_type`:

```typescript
export async function processStockMovement(data: {
  productId: string;
  warehouseId: string;
  shopTypeId: string;
  quantityDelta: number;
  type: StockMovementType;
  subType?: MovementSubType;
  notes?: string;
  referenceId?: string;
  transactUomId?: string;
  transactQuantity?: number;
  locationId?: string | null;
}) {
  try {
    const userId = await verifyUserPermission(
      data.type === "transfer_out" || data.type === "transfer_in"
        ? "transfer"
        : data.type === "in" && data.subType === "initial_stock"
          ? "initial_stock"
          : data.type
    );
    const adminClient = createAdminClient();

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
          Math.round(
            data.transactQuantity * Number(conversion.conversion_factor) * 1_000_000
          ) / 1_000_000;
        effectiveTransactUomId = data.transactUomId;
        effectiveTransactQuantity = data.transactQuantity;
      }
    }

    const { data: currentStock, error: fetchError } = await adminClient
      .from("stock")
      .select("id, quantity")
      .eq("product_id", data.productId)
      .eq("warehouse_id", data.warehouseId)
      .eq("shop_type_id", data.shopTypeId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (data.type === "in" && data.subType === "initial_stock" && currentStock) {
      return {
        error:
          "Inventory already exists for this product in the selected warehouse and shop type. Use Adjustment to update the quantity.",
      };
    }

    const previousQuantity = currentStock?.quantity || 0;
    const newQuantity = previousQuantity + effectiveQuantityDelta;

    if (newQuantity < 0) return { error: "Insufficient stock for this operation" };

    let effectiveReferenceId = data.referenceId;

    if (data.type === "adjustment" && !effectiveReferenceId) {
      const { data: adj, error: adjError } = await adminClient
        .from("stock_adjustments")
        .insert({
          product_id: data.productId,
          warehouse_id: data.warehouseId,
          shop_type_id: data.shopTypeId,
          quantity_delta: effectiveQuantityDelta,
          notes: data.notes || null,
          adjusted_by: userId,
          status: "completed",
          adjustment_type: data.subType ?? null,
        })
        .select()
        .single();

      if (adjError) throw adjError;
      effectiveReferenceId = adj.id;
    }

    if (currentStock) {
      const updatePayload: Record<string, unknown> = {
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      };
      if (data.locationId !== undefined) updatePayload.location_id = data.locationId;
      const { error: updateError } = await adminClient
        .from("stock")
        .update(updatePayload)
        .eq("id", currentStock.id);
      if (updateError) throw updateError;
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

    const { error: movementError } = await adminClient
      .from("stock_movements")
      .insert({
        product_id: data.productId,
        warehouse_id: data.warehouseId,
        shop_type_id: data.shopTypeId,
        quantity_delta: effectiveQuantityDelta,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        type: data.type,
        sub_type: data.subType ?? null,
        notes: data.notes || null,
        reference_id: effectiveReferenceId || null,
        created_by: userId,
        transact_uom_id: effectiveTransactUomId,
        transact_quantity: effectiveTransactQuantity,
      });

    if (movementError) throw movementError;

    revalidateTag("admin:stocks", "default");
    revalidateTag("admin:stock-movements", "default");
    revalidateTag("admin:dashboard", "default");
    revalidatePath("/admin");
    revalidatePath("/admin/stock");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error processing stock movement:", err);
    return { error: err instanceof Error ? err.message : "An unknown error occurred" };
  }
}
```

- [ ] **Step 3: Rewrite `transferStock` and add `completeTransfer` / `cancelTransfer`**

`transferStock` now only creates a `pending` record — no stock movement. `completeTransfer` triggers the actual movement:

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
  try {
    const userId = await verifyUserPermission("transfer");
    const adminClient = createAdminClient();

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

    if (data.sourceWarehouseId === data.destWarehouseId)
      return { error: "Source and destination warehouses cannot be the same" };

    const { data: sourceStock, error: sourceError } = await adminClient
      .from("stock")
      .select("quantity")
      .eq("product_id", data.productId)
      .eq("warehouse_id", data.sourceWarehouseId)
      .eq("shop_type_id", data.shopTypeId)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!sourceStock || sourceStock.quantity < baseQuantity)
      return { error: "Insufficient stock in source warehouse" };

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
        status: "pending",
        dest_location_id: data.destLocationId ?? null,
      })
      .select()
      .single();

    if (transferInsertError) throw transferInsertError;

    revalidatePath("/");
    return { success: true, transferId: transfer.id };
  } catch (err: unknown) {
    console.error("Error creating transfer:", err);
    return { error: err instanceof Error ? err.message : "An unknown error occurred" };
  }
}

export async function completeTransfer(transferId: string) {
  try {
    await verifyUserPermission("transfer");
    const adminClient = createAdminClient();

    const { data: transfer, error: fetchError } = await adminClient
      .from("stock_transfers")
      .select("*")
      .eq("id", transferId)
      .single();

    if (fetchError || !transfer) return { error: "Transfer not found" };
    if (transfer.status !== "pending") return { error: "Transfer is not in pending status" };

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
      locationId: transfer.dest_location_id,
    });

    if (inResult.error) {
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

    revalidateTag("admin:stocks", "default");
    revalidateTag("admin:stock-movements", "default");
    revalidateTag("admin:dashboard", "default");
    revalidatePath("/admin/stock");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error completing transfer:", err);
    return { error: err instanceof Error ? err.message : "An unknown error occurred" };
  }
}

export async function cancelTransfer(transferId: string) {
  try {
    await verifyUserPermission("transfer");
    const adminClient = createAdminClient();

    const { data: transfer, error: fetchError } = await adminClient
      .from("stock_transfers")
      .select("status")
      .eq("id", transferId)
      .single();

    if (fetchError || !transfer) return { error: "Transfer not found" };
    if (transfer.status !== "pending") return { error: "Only pending transfers can be cancelled" };

    const { error } = await adminClient
      .from("stock_transfers")
      .update({ status: "cancelled" })
      .eq("id", transferId);

    if (error) throw error;

    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "An unknown error occurred" };
  }
}
```

- [ ] **Step 4: Check TypeScript compiles**

```bash
pnpm typecheck 2>&1 | head -40
```

Expected: only errors in components that reference the old `return` mode — those get fixed in later tasks.

- [ ] **Step 5: Commit**

```bash
git add src/actions/admin/stock.ts
git commit -m "feat: add subType to processStockMovement; pending-first transfer workflow"
```

---

## Task 2: Add `getPendingTransfers` to user actions

**Files:**
- Modify: `src/actions/user/stock.ts`

- [ ] **Step 1: Add `getPendingTransfers`**

Append to the bottom of `src/actions/user/stock.ts`:

```typescript
export type PendingTransfer = {
  id: string;
  product_id: string;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  quantity: number;
  notes: string | null;
  transferred_at: string;
  source_warehouse: { name: string } | null;
  dest_warehouse: { name: string } | null;
};

export async function getPendingTransfers(
  productId: string,
  warehouseId: string,
  shopTypeId: string
): Promise<PendingTransfer[]> {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("stock_transfers")
    .select(
      `
      id,
      product_id,
      source_warehouse_id,
      dest_warehouse_id,
      quantity,
      notes,
      transferred_at,
      source_warehouse:warehouses!stock_transfers_source_warehouse_id_fkey(name),
      dest_warehouse:warehouses!stock_transfers_dest_warehouse_id_fkey(name)
      `
    )
    .eq("product_id", productId)
    .eq("shop_type_id", shopTypeId)
    .or(`source_warehouse_id.eq.${warehouseId},dest_warehouse_id.eq.${warehouseId}`)
    .eq("status", "pending")
    .order("transferred_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending transfers:", error);
    return [];
  }

  return data as unknown as PendingTransfer[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/user/stock.ts
git commit -m "feat: add getPendingTransfers user action"
```

---

## Task 3: Create unified `StockMovementModal` for users

**Files:**
- Create: `src/components/user/inventory/stock-movement-modal.tsx`

This single component handles all four movement types. It replaces the separate `StockMovementDialog` + `StockTransferDialog` usage on the user side.

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  processStockMovement,
  transferStock,
} from "@/actions/admin/stock";
import {
  getProductUomOptions,
  UomOption,
} from "@/actions/admin/product-uom-conversions";
import { getWarehouses } from "@/actions/admin/warehouses";
import { UserStockWithDetails } from "@/actions/user/stock";
import { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

type MovementSubType = Database["public"]["Enums"]["movement_sub_type"];

export type MovementActionType = "in" | "out" | "transfer" | "adjustment";

const IN_SUB_TYPES: { value: MovementSubType; label: string }[] = [
  { value: "supplier_delivery", label: "Supplier Delivery" },
  { value: "customer_return", label: "Customer Return" },
  { value: "sent_from_shop", label: "Sent from Shop" },
  { value: "initial_stock", label: "Initial Stock" },
];

const OUT_SUB_TYPES: { value: MovementSubType; label: string }[] = [
  { value: "sent_to_customer", label: "Sent to Customer" },
  { value: "sent_to_shop", label: "Sent to Shop" },
  { value: "supplier_return", label: "Supplier Return" },
];

const ADJUSTMENT_SUB_TYPES: { value: MovementSubType; label: string }[] = [
  { value: "stock_count_correction", label: "Stock Count Correction" },
  { value: "system_mistake", label: "System Mistake" },
  { value: "damaged_goods", label: "Damaged Goods" },
  { value: "expired_goods", label: "Expired Goods" },
  { value: "missing_lost", label: "Missing / Lost" },
  { value: "found_extra_stock", label: "Found Extra Stock" },
];

// ── Schemas ──────────────────────────────────────────────────────────────────

const inOutSchema = z.object({
  subType: z.string().min(1, "Movement type is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

const transferSchema = z.object({
  destWarehouseId: z.string().min(1, "Destination warehouse is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

const adjustmentSchema = z.object({
  subType: z.string().min(1, "Adjustment type is required"),
  direction: z.enum(["add", "remove"]),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  notes: z.string().optional(),
});

type InOutValues = z.infer<typeof inOutSchema>;
type TransferValues = z.infer<typeof transferSchema>;
type AdjustmentValues = z.infer<typeof adjustmentSchema>;

// ── Sub-components ────────────────────────────────────────────────────────────

interface UomQtyRowProps {
  form: ReturnType<typeof useForm<InOutValues | TransferValues | AdjustmentValues>>;
  uomOptions: UomOption[];
  currentStock: number;
}

function UomQtyRow({ form, uomOptions, currentStock }: UomQtyRowProps) {
  const watchedUomId = form.watch("transactUomId" as never);
  const watchedQty = form.watch("transactQty" as never);
  const selectedUom = uomOptions.find((u) => u.id === watchedUomId);
  const hint =
    selectedUom && !selectedUom.is_base && Number(watchedQty) > 0
      ? `= ${Math.round(Number(watchedQty) * selectedUom.conversion_factor * 1_000_000) / 1_000_000} base units`
      : null;

  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control as never}
        name="transactUomId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Unit of Measure</FormLabel>
            <Select onValueChange={field.onChange} value={field.value as string}>
              <FormControl>
                <SelectTrigger disabled={uomOptions.length === 0}>
                  <SelectValue placeholder="Select UOM..." />
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
      <FormField
        control={form.control as never}
        name="transactQty"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Quantity
              {selectedUom ? ` (${selectedUom.uom_code})` : ""}
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
            {hint ? (
              <FormDescription className="text-xs text-blue-600 dark:text-blue-400">
                {hint}
              </FormDescription>
            ) : (
              <FormDescription>Current stock: {currentStock}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// ── IN Form ───────────────────────────────────────────────────────────────────

interface InFormProps {
  stock: UserStockWithDetails;
  uomOptions: UomOption[];
  onSuccess: () => void;
}

function InForm({ stock, uomOptions, onSuccess }: InFormProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm<InOutValues>({
    resolver: zodResolver(inOutSchema),
    defaultValues: { subType: "", transactUomId: "", transactQty: 1, notes: "" },
  });

  useEffect(() => {
    if (uomOptions.length > 0) {
      const def =
        uomOptions.find((u) => u.is_purchase_default) ?? uomOptions.find((u) => u.is_base);
      if (def) form.setValue("transactUomId", def.id);
    }
  }, [uomOptions, form]);

  async function onSubmit(values: InOutValues) {
    setLoading(true);
    const result = await processStockMovement({
      productId: stock.product_id,
      warehouseId: stock.warehouse_id,
      shopTypeId: stock.shop_type_id,
      quantityDelta: values.transactQty,
      type: "in",
      subType: values.subType as MovementSubType,
      notes: values.notes,
      transactUomId: values.transactUomId,
      transactQuantity: values.transactQty,
    });
    setLoading(false);
    if (result.error) return toast.error(result.error);
    toast.success("Stock In recorded");
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="subType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Movement Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {IN_SUB_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <UomQtyRow form={form as never} uomOptions={uomOptions} currentStock={stock.quantity} />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Invoice number, supplier name, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Stock In
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── OUT Form ──────────────────────────────────────────────────────────────────

interface OutFormProps {
  stock: UserStockWithDetails;
  uomOptions: UomOption[];
  onSuccess: () => void;
}

function OutForm({ stock, uomOptions, onSuccess }: OutFormProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm<InOutValues>({
    resolver: zodResolver(inOutSchema),
    defaultValues: { subType: "", transactUomId: "", transactQty: 1, notes: "" },
  });

  useEffect(() => {
    if (uomOptions.length > 0) {
      const def =
        uomOptions.find((u) => u.is_sales_default) ?? uomOptions.find((u) => u.is_base);
      if (def) form.setValue("transactUomId", def.id);
    }
  }, [uomOptions, form]);

  async function onSubmit(values: InOutValues) {
    setLoading(true);
    const result = await processStockMovement({
      productId: stock.product_id,
      warehouseId: stock.warehouse_id,
      shopTypeId: stock.shop_type_id,
      quantityDelta: -values.transactQty,
      type: "out",
      subType: values.subType as MovementSubType,
      notes: values.notes,
      transactUomId: values.transactUomId,
      transactQuantity: -values.transactQty,
    });
    setLoading(false);
    if (result.error) return toast.error(result.error);
    toast.success("Stock Out recorded");
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="subType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Movement Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {OUT_SUB_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <UomQtyRow form={form as never} uomOptions={uomOptions} currentStock={stock.quantity} />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Customer name, order number, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
          <Button type="submit" variant="destructive" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Stock Out
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── TRANSFER Form ─────────────────────────────────────────────────────────────

interface TransferFormProps {
  stock: UserStockWithDetails;
  uomOptions: UomOption[];
  onSuccess: () => void;
}

function TransferForm({ stock, uomOptions, onSuccess }: TransferFormProps) {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { destWarehouseId: "", transactUomId: "", transactQty: 1, notes: "" },
  });

  useEffect(() => {
    getWarehouses({ pageSize: 100 }).then((r) =>
      setWarehouses(r.warehouses.filter((w) => w.id !== stock.warehouse_id))
    );
  }, [stock.warehouse_id]);

  useEffect(() => {
    if (uomOptions.length > 0) {
      const def =
        uomOptions.find((u) => u.is_purchase_default) ?? uomOptions.find((u) => u.is_base);
      if (def) form.setValue("transactUomId", def.id);
    }
  }, [uomOptions, form]);

  const watchedUomId = form.watch("transactUomId");
  const watchedQty = form.watch("transactQty");
  const selectedUom = uomOptions.find((u) => u.id === watchedUomId);
  const hint =
    selectedUom && !selectedUom.is_base && Number(watchedQty) > 0
      ? `= ${Math.round(Number(watchedQty) * selectedUom.conversion_factor * 1_000_000) / 1_000_000} base units`
      : null;

  async function onSubmit(values: TransferValues) {
    setLoading(true);
    const result = await transferStock({
      productId: stock.product_id,
      sourceWarehouseId: stock.warehouse_id,
      destWarehouseId: values.destWarehouseId,
      shopTypeId: stock.shop_type_id,
      quantity: values.transactQty,
      notes: values.notes,
      transactUomId: values.transactUomId,
      transactQty: values.transactQty,
    });
    setLoading(false);
    if (result.error) return toast.error(result.error);
    toast.success("Transfer created — pending completion");
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <FormLabel>Source Warehouse</FormLabel>
            <div className="border-input bg-muted h-10 rounded-md border px-3 py-2 text-sm">
              {stock.warehouses?.name} (qty: {stock.quantity})
            </div>
          </div>
          <FormField
            control={form.control}
            name="destWarehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Warehouse</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transactUomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={uomOptions.length === 0}>
                      <SelectValue placeholder="Select UOM..." />
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
          <FormField
            control={form.control}
            name="transactQty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Quantity{selectedUom ? ` (${selectedUom.uom_code})` : ""}
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
                {hint ? (
                  <FormDescription className="text-xs text-blue-600 dark:text-blue-400">
                    {hint}
                  </FormDescription>
                ) : (
                  <FormDescription>Current stock: {stock.quantity}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Reason for transfer..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Transfer
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── ADJUSTMENT Form ───────────────────────────────────────────────────────────

interface AdjustmentFormProps {
  stock: UserStockWithDetails;
  uomOptions: UomOption[];
  onSuccess: () => void;
}

function AdjustmentForm({ stock, uomOptions, onSuccess }: AdjustmentFormProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { subType: "", direction: "add", transactUomId: "", transactQty: 1, notes: "" },
  });

  useEffect(() => {
    if (uomOptions.length > 0) {
      const def = uomOptions.find((u) => u.is_base);
      if (def) form.setValue("transactUomId", def.id);
    }
  }, [uomOptions, form]);

  async function onSubmit(values: AdjustmentValues) {
    setLoading(true);
    const delta = values.direction === "add" ? values.transactQty : -values.transactQty;
    const result = await processStockMovement({
      productId: stock.product_id,
      warehouseId: stock.warehouse_id,
      shopTypeId: stock.shop_type_id,
      quantityDelta: delta,
      type: "adjustment",
      subType: values.subType as MovementSubType,
      notes: values.notes,
      transactUomId: values.transactUomId,
      transactQuantity: delta,
    });
    setLoading(false);
    if (result.error) return toast.error(result.error);
    toast.success("Adjustment recorded");
    onSuccess();
  }

  const direction = form.watch("direction");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="subType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adjustment Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select adjustment type..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ADJUSTMENT_SUB_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
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
          name="direction"
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
        <UomQtyRow form={form as never} uomOptions={uomOptions} currentStock={stock.quantity} />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Reason for adjustment..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
          <Button
            type="submit"
            variant={direction === "remove" ? "destructive" : "default"}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Adjustment
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface StockMovementModalProps {
  actionType: MovementActionType;
  stock: UserStockWithDetails;
  onSuccess: () => void;
}

export function StockMovementModal({
  actionType,
  stock,
  onSuccess,
}: StockMovementModalProps) {
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);

  useEffect(() => {
    if (!stock.product_id) return;
    getProductUomOptions(stock.product_id)
      .then((r) => setUomOptions(r.allOptions))
      .catch(() => toast.error("Failed to load UOM options"));
  }, [stock.product_id]);

  if (actionType === "in")
    return <InForm stock={stock} uomOptions={uomOptions} onSuccess={onSuccess} />;
  if (actionType === "out")
    return <OutForm stock={stock} uomOptions={uomOptions} onSuccess={onSuccess} />;
  if (actionType === "transfer")
    return <TransferForm stock={stock} uomOptions={uomOptions} onSuccess={onSuccess} />;
  return <AdjustmentForm stock={stock} uomOptions={uomOptions} onSuccess={onSuccess} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/user/inventory/stock-movement-modal.tsx
git commit -m "feat: create unified StockMovementModal with sub-type dropdowns"
```

---

## Task 4: Update `inventory-dialogs.tsx` and `inventory-detail-view.tsx`

**Files:**
- Modify: `src/components/user/inventory/inventory-dialogs.tsx`
- Modify: `src/components/user/inventory/inventory-detail-view.tsx`

- [ ] **Step 1: Rewrite `inventory-dialogs.tsx`**

Replace entire file content:

```typescript
"use client";

import { UserStockWithDetails } from "@/actions/user/stock";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { MovementActionType, StockMovementModal } from "./stock-movement-modal";

const TITLES: Record<MovementActionType, string> = {
  in: "Stock In",
  out: "Stock Out",
  transfer: "Transfer Stock",
  adjustment: "Stock Adjustment",
};

const DESCRIPTIONS: Record<MovementActionType, string> = {
  in: "Record incoming inventory for this item.",
  out: "Record outgoing inventory for this item.",
  transfer: "Move this item to another warehouse. Transfer will be pending until completed.",
  adjustment: "Correct the stock quantity for this item.",
};

interface InventoryDialogsProps {
  activeDialog: {
    type: MovementActionType;
    stock: UserStockWithDetails;
  } | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function InventoryDialogs({
  activeDialog,
  onClose,
  onRefresh,
}: InventoryDialogsProps) {
  return (
    <Dialog open={activeDialog !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {activeDialog ? TITLES[activeDialog.type] : ""}:{" "}
            {activeDialog?.stock.products?.name}
          </DialogTitle>
          <DialogDescription>
            {activeDialog ? DESCRIPTIONS[activeDialog.type] : ""}
          </DialogDescription>
        </DialogHeader>
        {activeDialog && (
          <StockMovementModal
            actionType={activeDialog.type}
            stock={activeDialog.stock}
            onSuccess={() => {
              onClose();
              onRefresh();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update `inventory-detail-view.tsx`**

Replace the actions sidebar section and the props/state types. Key changes:
- Remove `return` from active dialog type union
- Drop Return button; add IN, OUT, TRANSFER, ADJUSTMENT buttons (4 total)
- Add pending transfers card
- Import `PendingTransfer`, `completeTransfer`, `cancelTransfer`

Replace entire file with:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Edit,
  Info,
  MapPin,
  Minus,
  Package,
  Plus,
  Store,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { cancelTransfer, completeTransfer } from "@/actions/admin/stock";
import { PendingTransfer, UserStockWithDetails } from "@/actions/user/stock";
import { getLargestFittingUom } from "@/lib/uom/convert";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { InventoryDialogs } from "./inventory-dialogs";
import { MovementActionType } from "./stock-movement-modal";

interface InventoryDetailViewProps {
  stock: UserStockWithDetails;
  permissions: {
    perm_do_transfer: boolean;
    perm_do_adjustment: boolean;
    perm_do_purchase: boolean;
    perm_do_sale: boolean;
  };
  pendingTransfers: PendingTransfer[];
}

export function InventoryDetailView({
  stock,
  permissions,
  pendingTransfers,
}: InventoryDetailViewProps) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<{
    type: MovementActionType;
    stock: UserStockWithDetails;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isLowStock = stock.quantity <= (stock.products?.minimum_stock_quantity ?? 10);

  const handleAction = (type: MovementActionType) => {
    setActiveDialog({ type, stock });
  };

  const handleRefresh = () => router.refresh();

  const handleComplete = (transferId: string) => {
    startTransition(async () => {
      const result = await completeTransfer(transferId);
      if (result.error) return toast.error(result.error);
      toast.success("Transfer completed — stock moved");
      router.refresh();
    });
  };

  const handleCancel = (transferId: string) => {
    startTransition(async () => {
      const result = await cancelTransfer(transferId);
      if (result.error) return toast.error(result.error);
      toast.success("Transfer cancelled");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Inventory Details
          </h1>
          <p className="text-muted-foreground text-[11px] sm:text-xs">
            Manage stock movements and product specifications
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Section */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-0 sm:p-6">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-foreground text-xl font-semibold sm:text-2xl">
                    {stock.products?.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]">
                      {stock.products?.sku || "No SKU"}
                    </span>
                    <Badge variant="secondary" className="h-5 text-[10px] font-medium">
                      {stock.products?.categories?.category_name || "Uncategorized"}
                    </Badge>
                  </div>
                </div>

                <Separator className="opacity-60" />

                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1">
                    <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <Store className="h-3.5 w-3.5 opacity-70" /> Shop Location
                    </label>
                    <p className="text-sm font-medium">{stock.shop_types?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <Package className="h-3.5 w-3.5 opacity-70" /> Warehouse
                    </label>
                    <p className="text-sm font-medium">{stock.warehouses?.name}</p>
                  </div>
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
                          stock.locations.rack && `Rack ${stock.locations.rack}`,
                          stock.locations.level && `Level ${stock.locations.level}`,
                          stock.locations.slot && `Slot ${stock.locations.slot}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="opacity-60" />

                <div className="space-y-3 py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs font-medium">
                        Current Stock
                      </label>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            "text-3xl font-semibold tracking-tight sm:text-4xl",
                            isLowStock ? "text-red-600" : "text-foreground"
                          )}
                        >
                          {stock.quantity}
                        </span>
                        <span className="text-muted-foreground text-sm font-medium">
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
                            <span className="text-muted-foreground/60 text-xs">
                              · {alt.display_qty} {alt.uom_code}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={isLowStock ? "destructive" : "secondary"}
                        className="text-[10px] font-bold"
                      >
                        {isLowStock ? "Low Stock" : "Healthy Status"}
                      </Badge>
                      <div className="text-right">
                        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                          Updated
                        </p>
                        <p className="text-[11px] font-medium">
                          {format(new Date(stock.updated_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Pending Transfers */}
          {pendingTransfers.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <ArrowRightLeft className="h-4 w-4 opacity-70" />
                  Pending Transfers ({pendingTransfers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                {pendingTransfers.map((t) => (
                  <div
                    key={t.id}
                    className="bg-muted/50 flex items-center justify-between rounded-md p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">
                        {(t.source_warehouse as { name: string } | null)?.name} →{" "}
                        {(t.dest_warehouse as { name: string } | null)?.name}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        Qty: {t.quantity} · {format(new Date(t.transferred_at), "MMM d, hh:mm a")}
                      </p>
                      {t.notes && (
                        <p className="text-muted-foreground text-[10px] italic">{t.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-[11px] text-emerald-600"
                        disabled={isPending}
                        onClick={() => handleComplete(t.id)}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-[11px] text-red-600"
                        disabled={isPending}
                        onClick={() => handleCancel(t.id)}
                      >
                        <XCircle className="h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="space-y-3">
            <h3 className="px-1 text-sm font-medium">Actions</h3>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <Button
                onClick={() => handleAction("out")}
                disabled={!permissions.perm_do_sale}
                variant="secondary"
                className="h-10 justify-start gap-2.5 rounded-md border-none bg-red-50 text-sm text-red-700 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400"
              >
                <Minus className="h-4 w-4" /> Stock Out
              </Button>
              <Button
                onClick={() => handleAction("in")}
                disabled={!permissions.perm_do_purchase}
                variant="secondary"
                className="h-10 justify-start gap-2.5 rounded-md border-none bg-green-50 text-sm text-green-700 hover:bg-green-100 dark:bg-green-900/10 dark:text-green-400"
              >
                <Plus className="h-4 w-4" /> Stock In
              </Button>
              <Button
                onClick={() => handleAction("transfer")}
                disabled={!permissions.perm_do_transfer}
                variant="secondary"
                className="h-10 justify-start gap-2.5 rounded-md border-none bg-blue-50 text-sm text-blue-700 hover:bg-blue-100 dark:bg-blue-900/10 dark:text-blue-400"
              >
                <ArrowRightLeft className="h-4 w-4" /> Transfer
              </Button>
              <Button
                onClick={() => handleAction("adjustment")}
                disabled={!permissions.perm_do_adjustment}
                variant="secondary"
                className="h-10 justify-start gap-2.5 rounded-md border-none bg-amber-50 text-sm text-amber-700 hover:bg-amber-100 dark:bg-amber-900/10 dark:text-amber-400"
              >
                <Edit className="h-4 w-4" /> Adjust
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <Card className="border shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 opacity-70" /> Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={cn("font-medium", isLowStock ? "text-red-600" : "text-emerald-600")}>
                  {isLowStock ? "Low Stock" : "Healthy"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subcategory</span>
                <span className="font-medium">
                  {stock.products?.subcategories?.subcategory_name || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-mono text-[11px] font-medium">
                  {stock.products?.units_of_measure?.full_name || "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <InventoryDialogs
        activeDialog={activeDialog}
        onClose={() => setActiveDialog(null)}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/user/inventory/inventory-dialogs.tsx \
        src/components/user/inventory/inventory-detail-view.tsx
git commit -m "feat: 4-button action sidebar + pending transfers card on inventory detail"
```

---

## Task 5: Update inventory detail page to fetch pending transfers

**Files:**
- Modify: `src/app/(user)/inventory/[stockId]/page.tsx`

- [ ] **Step 1: Update the page**

```typescript
import { notFound } from "next/navigation";

import { getMyProfile, getPendingTransfers, getUserStockById } from "@/actions/user/stock";
import { InventoryDetailView } from "@/components/user/inventory/inventory-detail-view";

interface InventoryDetailPageProps {
  params: Promise<{ stockId: string }>;
}

export default async function InventoryDetailPage({
  params,
}: InventoryDetailPageProps) {
  const { stockId } = await params;

  const [stock, profile] = await Promise.all([
    getUserStockById(stockId),
    getMyProfile(),
  ]);

  if (!stock) notFound();

  const pendingTransfers = await getPendingTransfers(
    stock.product_id,
    stock.warehouse_id,
    stock.shop_type_id
  );

  const permissions = {
    perm_do_transfer: profile.perm_do_transfer,
    perm_do_adjustment: profile.perm_do_adjustment,
    perm_do_purchase: profile.perm_do_purchase,
    perm_do_sale: profile.perm_do_sale,
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <InventoryDetailView
        stock={stock}
        permissions={permissions}
        pendingTransfers={pendingTransfers}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(user)/inventory/[stockId]/page.tsx
git commit -m "feat: fetch and pass pending transfers to inventory detail page"
```

---

## Task 6: Update admin `movement-dialog.tsx` — sub-type dropdowns + remove return mode

**Files:**
- Modify: `src/components/admin/stock/movement-dialog.tsx`

- [ ] **Step 1: Add sub-type constants and update the schema**

At the top of the file, after imports, add the sub-type maps:

```typescript
import { MovementSubType } from "@/actions/admin/stock";

const SUB_TYPE_OPTIONS: Record<
  "in" | "out" | "adjustment" | "initial",
  { value: MovementSubType; label: string }[]
> = {
  in: [
    { value: "supplier_delivery", label: "Supplier Delivery" },
    { value: "customer_return", label: "Customer Return" },
    { value: "sent_from_shop", label: "Sent from Shop" },
    { value: "initial_stock", label: "Initial Stock" },
  ],
  out: [
    { value: "sent_to_customer", label: "Sent to Customer" },
    { value: "sent_to_shop", label: "Sent to Shop" },
    { value: "supplier_return", label: "Supplier Return" },
  ],
  adjustment: [
    { value: "stock_count_correction", label: "Stock Count Correction" },
    { value: "system_mistake", label: "System Mistake" },
    { value: "damaged_goods", label: "Damaged Goods" },
    { value: "expired_goods", label: "Expired Goods" },
    { value: "missing_lost", label: "Missing / Lost" },
    { value: "found_extra_stock", label: "Found Extra Stock" },
  ],
  initial: [{ value: "initial_stock", label: "Initial Stock" }],
};
```

Update the Zod schema to include `subType`:

```typescript
const movementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  shopTypeId: z.string().min(1, "Shop type is required"),
  transactUomId: z.string().min(1, "UOM is required"),
  transactQty: z.coerce.number().positive("Quantity must be greater than 0"),
  adjustmentDirection: z.enum(["add", "remove"]).default("add"),
  subType: z.string().min(1, "Movement type is required"),
  notes: z.string().optional(),
  locationId: z.string().optional(),
});
```

Update the `StockMovementDialogProps` interface:

```typescript
interface StockMovementDialogProps {
  mode: "initial" | "adjustment" | "in" | "out";
  initialData?: StockWithDetails;
  onSuccess: () => void;
}
```

Update `defaultValues` in `useForm` to add `subType: ""`:

```typescript
defaultValues: {
  productId: initialData?.product_id || "",
  warehouseId: initialData?.warehouse_id || "",
  shopTypeId: initialData?.shop_type_id || "",
  transactUomId: "",
  transactQty: 1,
  adjustmentDirection: "add",
  subType: "",
  notes: "",
},
```

- [ ] **Step 2: Add subType FormField**

Add the sub-type Select field before the UOM/Qty row inside the `<form>` (after the `initial` mode product/warehouse fields block and before the `grid grid-cols-1 gap-4 md:grid-cols-2` div):

```tsx
{/* Sub-type selector — not shown for initial mode (always initial_stock) */}
{mode !== "initial" && (
  <FormField
    control={form.control}
    name="subType"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Movement Type</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {SUB_TYPE_OPTIONS[mode].map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

- [ ] **Step 3: Update `onSubmit` to pass `subType`**

Update the `processStockMovement` call in `onSubmit`:

```typescript
const result = await processStockMovement({
  productId: values.productId,
  warehouseId: values.warehouseId,
  shopTypeId: values.shopTypeId,
  quantityDelta: signedTransactQty,
  type: mode === "initial" ? "in" : mode,
  subType: (mode === "initial" ? "initial_stock" : values.subType) as MovementSubType,
  notes: values.notes,
  transactUomId: values.transactUomId,
  transactQuantity: signedTransactQty,
  locationId: values.locationId ?? null,
});
```

Also update the `isSubtraction` logic (remove `return`):

```typescript
const isSubtraction =
  mode === "out" ||
  (mode === "adjustment" && values.adjustmentDirection === "remove");
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/stock/movement-dialog.tsx
git commit -m "feat: add sub-type dropdown to admin movement dialog; remove return mode"
```

---

## Task 7: Update admin `transfer-dialog.tsx` and `stock-actions.tsx`

**Files:**
- Modify: `src/components/admin/stock/transfer-dialog.tsx`
- Modify: `src/components/admin/stock/stock-actions.tsx`

- [ ] **Step 1: Update `transfer-dialog.tsx`**

The dialog now creates a pending transfer. Update the success toast only — the `transferStock` action signature is unchanged:

Find and replace the toast in `onSubmit`:

```typescript
// old:
toast.success("Stock transfer successful");
// new:
toast.success("Transfer created — pending completion");
```

- [ ] **Step 2: Update `stock-actions.tsx` — remove `return` mode**

Update the state type and remove the Return dropdown item:

```typescript
// Change:
const [movementMode, setMovementMode] = useState<
  "adjustment" | "in" | "out" | "return" | null
>(null);
// To:
const [movementMode, setMovementMode] = useState<
  "adjustment" | "in" | "out" | null
>(null);
```

Remove the Return `DropdownMenuItem`:

```tsx
// Delete this block:
<DropdownMenuItem onClick={() => setMovementMode("return")}>
  <RotateCcw className="text-primary mr-2 h-4 w-4" />
  Return
</DropdownMenuItem>
```

Remove unused imports: `RotateCcw` from lucide-react.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/stock/transfer-dialog.tsx \
        src/components/admin/stock/stock-actions.tsx
git commit -m "feat: update admin transfer dialog to pending workflow; remove return action"
```

---

## Task 8: Update admin stock movements columns

**Files:**
- Modify: `src/components/admin/stock-movements/columns.tsx`

- [ ] **Step 1: Update `typeConfig` and add `sub_type` badge**

Replace the `typeConfig` object (remove stale `return` and `initial_stock` entries — they no longer exist in the DB enum):

```typescript
const typeConfig = {
  in: {
    label: "Stock In",
    icon: TrendingUp,
    className: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  out: {
    label: "Stock Out",
    icon: TrendingDown,
    className: "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-400",
  },
  transfer_in: {
    label: "Transfer In",
    icon: ArrowRightLeft,
    className: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
  },
  transfer_out: {
    label: "Transfer Out",
    icon: ArrowRightLeft,
    className: "bg-orange-500/10 text-orange-700 dark:bg-orange-400/10 dark:text-orange-400",
  },
  adjustment: {
    label: "Adjustment",
    icon: SlidersHorizontal,
    className: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  },
};

const SUB_TYPE_LABELS: Record<string, string> = {
  supplier_delivery: "Supplier Delivery",
  customer_return: "Customer Return",
  sent_from_shop: "Sent from Shop",
  initial_stock: "Initial Stock",
  sent_to_customer: "Sent to Customer",
  sent_to_shop: "Sent to Shop",
  supplier_return: "Supplier Return",
  stock_count_correction: "Stock Count Correction",
  system_mistake: "System Mistake",
  damaged_goods: "Damaged Goods",
  expired_goods: "Expired Goods",
  missing_lost: "Missing / Lost",
  found_extra_stock: "Found Extra Stock",
};
```

Update the `type` column cell renderer to also show sub_type:

```tsx
cell: ({ row }) => {
  const type = row.original.type;
  const subType = row.original.sub_type;
  const config = typeConfig[type as keyof typeof typeConfig];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <div className="flex flex-col gap-1">
      <Badge
        variant="outline"
        className={cn(
          "gap-1 w-fit rounded-full border border-current/20 px-2.5 py-0.5 text-[11px] font-semibold shadow-none",
          config.className
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      {subType && (
        <span className="text-muted-foreground text-[10px] pl-1">
          {SUB_TYPE_LABELS[subType] ?? subType}
        </span>
      )}
    </div>
  );
},
```

Remove unused lucide imports: `RotateCcw`, `PackagePlus`.

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/stock-movements/columns.tsx
git commit -m "feat: update movements table to show sub_type; remove stale type configs"
```

---

## Task 9: Final typecheck + lint

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck 2>&1
```

Expected: 0 errors. Fix any remaining type errors by checking for any missed references to the old `return` or `initial_stock` movement types.

- [ ] **Step 2: Run lint**

```bash
pnpm lint:fix && pnpm format
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: typecheck and lint cleanup after stock movement refactor"
```
