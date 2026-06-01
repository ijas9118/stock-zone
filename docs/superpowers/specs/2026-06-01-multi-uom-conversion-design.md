# Multi-UOM Conversion Design

**Date:** 2026-06-01
**Status:** Approved
**Approach:** Option A — App-layer conversion (TypeScript server actions)

## Overview

Store stock in exactly one base unit per product. Allow users to transact in any configured alternate unit. Convert everything to the base unit before updating inventory. Record both the transacted form and the base unit delta in the movement ledger for full auditability.

This follows the ERPNext/Odoo model of product-level UOM conversions with per-operation-type defaults.

---

## Database Schema

### New table: `product_uom_conversions`

```sql
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
```

**Conversion factor semantics:** `1 alternate unit = conversion_factor base units`
- Example: 1 Box = 12 Pieces → `conversion_factor = 12`

**Invariants (enforced at server action level):**
- The product's base UOM (`products.uom`) must never appear in this table
- At most one row per product may have `is_purchase_default = true`
- At most one row per product may have `is_sales_default = true`

### Modified table: `stock_movements`

Two new nullable columns (existing rows unaffected):

```sql
ALTER TABLE stock_movements
  ADD COLUMN transact_uom_id  uuid REFERENCES units_of_measure(id) ON DELETE SET NULL,
  ADD COLUMN transact_quantity numeric(18,6);
```

Both are `NULL` when the user transacted directly in the base unit. Both are populated when an alternate UOM was used.

### No changes to `products` table

`products.uom` is already the base/stock UOM. Only the UI label changes: "Unit of Measure" → "Base / Stock UOM".

---

## Backend Logic

### New file: `src/actions/admin/product-uom-conversions.ts`

All functions call `verifyAdmin()` at the top. Cache tag: `"products:uom-conversions"`.

| Function | Description |
|---|---|
| `getProductUomConversions(productId)` | Returns all alternate UOM rows joined with `units_of_measure` |
| `createProductUomConversion(data)` | Inserts row; validates base UOM exclusion; clears existing default flag before setting new one |
| `updateProductUomConversion(id, data)` | Updates factor or defaults with same flag-clearing logic |
| `deleteProductUomConversion(id)` | Deletes row |

All mutations revalidate `"products:uom-conversions"` and `"admin:products"`.

### Modified: `processStockMovement` (`src/actions/admin/stock.ts`)

Two new optional fields added to the input:

```ts
transactUomId?: string;    // UOM the user entered quantity in
transactQuantity?: number; // quantity in that UOM
```

**Conversion step** (inserted before the stock update):

```
if transactUomId is provided and transactUomId !== product.base_uom:
  fetch conversion factor from product_uom_conversions
    WHERE product_id = data.productId AND uom_id = data.transactUomId
  if not found → return { error: "UOM not configured for this product" }
  quantityDelta = round(transactQuantity × conversionFactor, 6 decimal places)
else:
  quantityDelta = data.quantityDelta  // base unit entered directly
```

`stock_movements` insert gains:
```ts
transact_uom_id: data.transactUomId ?? null,
transact_quantity: data.transactQuantity ?? null,
```

`transferStock` passes the new fields through to `processStockMovement`.

### New utility: `src/lib/uom/convert.ts`

Pure functions, no I/O:

```ts
// Convert transacted quantity to base units
convertToBase(transactQty: number, factor: number): number

// Find the largest alternate UOM that fits into a base quantity
// Returns null if no conversions configured or none qualify
getLargestFittingUom(
  baseQty: number,
  conversions: { uom_code: string; full_name: string; conversion_factor: number }[]
): { uom_code: string; full_name: string; display_qty: number } | null
```

`getLargestFittingUom` sorts conversions by `conversion_factor` descending. Returns the first entry where `Math.floor(baseQty / factor) >= 1`, using `Math.floor(baseQty / factor)` as the display quantity. Example: 25 Pieces with Box=12 → displays "2 Box" (not nothing). Returns `null` only if no conversion has a factor ≤ baseQty.

---

## Admin UI

### Product form (`src/components/admin/products/product-form.tsx`)

- UOM `<Select>` label: "Unit of Measure" → "Base / Stock UOM"
- Description added: *"All stock quantities are stored in this unit. Alternate units convert into it."*

### New component: `src/components/admin/products/product-uom-conversions-card.tsx`

Rendered on the product **edit** page only (requires existing `product.id`). On the new product page, a muted note says: *"You can configure alternate units after saving the product."*

Card contains:
- Table: UOM Code | Full Name | Factor | Purchase Default | Sales Default | Delete action
- "Add Alternate UOM" button opens an inline form with: UOM selector (excludes base UOM + already-added UOMs), Conversion Factor input, "Set as purchase default" checkbox, "Set as sales default" checkbox
- Inline save/cancel buttons

### Stock movement dialog (`src/components/admin/stock/movement-dialog.tsx`)

When `initialData` is provided, fetches `getProductUomConversions(productId)` on mount.

New UOM selector field above the quantity input:
- Options: base UOM + all configured alternates
- Pre-selected: `is_purchase_default` for `in`/`initial_stock`; `is_sales_default` for `out`/`return`; base UOM for `adjustment`
- Live hint below quantity: *"= 24 Pieces (base unit)"* — computed as `qty × factor`
- Quantity field label: "Quantity (Box)" — updates to selected UOM code

On submit: passes `transactUomId` + `transactQuantity` when alternate UOM selected; omits when base UOM selected.

### Stock transfer dialog (`src/components/admin/stock/transfer-dialog.tsx`)

Same UOM selector pattern, pre-selecting `is_purchase_default` UOM.

### Stock movements history (`src/app/(admin)/admin/stock-movements/[movementId]/page.tsx`)

New display row: **"Transacted As"** — shown only when `transact_uom_id` is not null.
Format: *"2 Box → 24 Pieces"*

---

## User UI

### `getUserStocks` and `getUserStockById` (`src/actions/user/stock.ts`)

Join updated to include `product_uom_conversions`:

```ts
products!inner(
  ...existing fields...
  units_of_measure(full_name, uom_code),
  product_uom_conversions(uom_id, conversion_factor, units_of_measure(uom_code, full_name))
)
```

`UserStockWithDetails` type updated accordingly.

### Inventory table (`src/components/user/inventory/inventory-table.tsx`)

Quantity column becomes a two-line display:
- Line 1: base quantity + base UOM code (e.g., "240 Pieces")
- Line 2 (muted, if a fitting alternate exists): largest-fitting alternate (e.g., "20 Box")

Uses `getLargestFittingUom` from `src/lib/uom/convert.ts`.

### Inventory detail view (`src/components/user/inventory/inventory-detail-view.tsx`)

Same two-line quantity display on stat cards.

### Inventory dialogs (`src/components/user/inventory/inventory-dialogs.tsx`)

No structural changes — UOM selector flows through `StockMovementDialog` and `StockTransferDialog` automatically.

### Admin stock view

Same join update as user stock view. Admin `getStocks` updated to include `product_uom_conversions` in the products join for the two-line display.

---

## CSV Import Pipeline

### New CSV column: `alternate_uoms`

Optional column with pipe-delimited entries: `uom_code:conversion_factor[:flags]`

```
alternate_uoms = "BOX:12:purchase,CTN:144:sales,DOZEN:12:purchase:sales"
```

Flags (optional): `purchase` sets `is_purchase_default = true`; `sales` sets `is_sales_default = true`. Multiple flags on one entry allowed.

### Files changed

| File | Change |
|---|---|
| `types.ts` | Add `alternate_uoms` optional field to `CsvRow`/`CsvRowSchema`; add `ParsedAlternateUom` type |
| `validate-row.ts` | Parse and validate `alternate_uoms` string; errors for malformed entries, non-positive factors, circular UOM (same as base), duplicate defaults |
| `upsert-products.ts` | Forward parsed alternate UOM entries to new step |
| `upsert-uom-conversions.ts` | New file — upserts `product_uom_conversions` rows with `ON CONFLICT ... DO UPDATE` (idempotent) |
| `index.ts` | Wire in `upsertUomConversions` step after `upsertProducts` |
| `preload-lookups.ts` | No changes — `uoms` map already keyed by `uom_code.toLowerCase()` |
| `parse-csv.ts` | No changes |

`ImportResult` gains one new counter: `upsertedUomConversions: number`.

---

## Implementation Phases

### Phase 1 — Foundation (DB + Admin CRUD)
- Create `product_uom_conversions` table in Supabase
- Add `transact_uom_id` + `transact_quantity` to `stock_movements`
- Regenerate `database.types.ts` via `pnpm db:types`
- New `product-uom-conversions.ts` server action file
- New `product-uom-conversions-card.tsx` on product edit page
- UI label: "Unit of Measure" → "Base / Stock UOM"

### Phase 2 — Conversion at Transaction Time
- New `src/lib/uom/convert.ts` utility
- Modify `processStockMovement` for UOM conversion
- Update `StockMovementDialog` with UOM selector + live hint
- Update `StockTransferDialog` with UOM selector
- Update stock movements detail view with "Transacted As" row

### Phase 3 — Display Conversion in Inventory
- Update `getUserStocks`, `getUserStockById`, `getStocks` joins
- Update `UserStockWithDetails` type
- Update inventory table quantity column (two-line display)
- Update inventory detail view stat cards

### Phase 4 — CSV Import Pipeline
- Update `CsvRow`/`CsvRowSchema` with `alternate_uoms` field
- Add parsing/validation in `validate-row.ts`
- New `upsert-uom-conversions.ts` step
- Wire into `index.ts`, update `ImportResult`

---

## Type Updates Required

After `pnpm db:types`, the following types are regenerated automatically. Manual type extensions needed:

- `UserStockWithDetails` — add `product_uom_conversions` nested array
- `StockWithDetails` (admin) — same
- `ProductWithDetails` — optionally include `product_uom_conversions` for edit page
