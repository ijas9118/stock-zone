# Plan: Location Status Toggle + Bulk CSV/Excel Import

**Branch:** `feat/product-location`
**Date:** 2026-06-13

## Context

The admin locations page (`/admin/locations`) shows a Status column (Active/Inactive badge) but
there is no way to toggle it. Also, locations currently can only be created one at a time; admins
need bulk import from CSV or Excel.

Key existing files for context:
- `src/actions/admin/locations.ts` — CRUD server actions; `updateLocation(id, data)` already accepts `is_active`
- `src/components/admin/locations/location-actions.tsx` — row actions dropdown (Edit + Delete only)
- `src/lib/imports/product-import/` — reference pipeline (parse → validate → preload → upsert)
- `src/app/(admin)/admin/products/import/page.tsx` — reference import page UI
- `src/actions/admin/import.ts` — reference import server action
- PapaParse already installed; no xlsx library installed yet

## Task 1 — Status Toggle in Location Actions

**Scope:** 2 files changed.

### 1a. Add `toggleLocationStatus` server action
File: `src/actions/admin/locations.ts`

Add at the bottom (before the final export, after `deleteLocation`):

```ts
export async function toggleLocationStatus(id: string, is_active: boolean) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("locations")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error toggling location status:", error);
      return { error: error.message };
    }

    revalidateTag("admin:locations", "default");
    revalidatePath("/admin/locations");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
```

### 1b. Add toggle action to LocationActions dropdown
File: `src/components/admin/locations/location-actions.tsx`

- Import `toggleLocationStatus` from `@/actions/admin/locations`
- Import `Power` icon from lucide-react
- Add `isToggling` state (`useState(false)`)
- Add toggle handler:
```ts
function handleToggle() {
  setIsToggling(true);
  toggleLocationStatus(location.id, !location.is_active)
    .then((result) => {
      if (result.error) toast.error(result.error);
      else toast.success(location.is_active ? "Location deactivated" : "Location activated");
    })
    .finally(() => setIsToggling(false));
}
```
- Add menu item between Edit and the separator before Delete:
```tsx
<DropdownMenuItem onClick={handleToggle} disabled={isToggling || isDeleting}>
  <Power className="mr-2 h-4 w-4" />
  {location.is_active ? "Deactivate" : "Activate"}
</DropdownMenuItem>
```
- Set `disabled={isDeleting || isToggling}` on the trigger button.

Run `pnpm lint:fix && pnpm format && pnpm typecheck`, then commit.

---

## Task 2 — Location Import Pipeline (lib module)

**Scope:** New directory `src/lib/imports/location-import/` with 5 files.

Install xlsx: `pnpm add xlsx` then `pnpm add -D @types/xlsx` (types are bundled in xlsx, so just `pnpm add xlsx`).

### CSV/Excel columns (case-insensitive header matching):
| Column | Required | Notes |
|--------|----------|-------|
| `warehouse_name` | Yes | Must match an existing warehouse (case-insensitive) |
| `zone` | No* | At least one of zone/aisle/rack/bin required |
| `aisle` | No* | |
| `rack` | No* | |
| `bin` | No* | |

### 2a. `src/lib/imports/location-import/types.ts`

```ts
import { z } from "zod";

export interface LocationCsvRow {
  warehouse_name: string;
  zone: string;
  aisle: string;
  rack: string;
  bin: string;
}

export const LocationRowSchema = z
  .object({
    warehouse_name: z.string().min(1, "warehouse_name is required"),
    zone: z.string().optional(),
    aisle: z.string().optional(),
    rack: z.string().optional(),
    bin: z.string().optional(),
  })
  .refine((d) => d.zone || d.aisle || d.rack || d.bin, {
    message: "At least one of zone, aisle, rack, or bin must be non-empty",
    path: ["zone"],
  });

export type ValidatedLocationRow = z.infer<typeof LocationRowSchema>;

export interface NormalizedLocationRow extends ValidatedLocationRow {
  _originalRowIndex: number;
}

export interface LocationImportResult {
  totalRows: number;
  inserted: number;
  skipped: number; // duplicate — already exists
  failedRows: number;
  errors: { row: number; error: string }[];
}
```

### 2b. `src/lib/imports/location-import/parse-file.ts`

Supports both CSV (PapaParse) and Excel (xlsx library). Accepts file content as:
- `string` → treat as CSV via PapaParse
- `ArrayBuffer` → treat as Excel via `xlsx.read()`

Normalizes all header names to lowercase + trim before returning `LocationCsvRow[]`.

```ts
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { LocationCsvRow } from "./types";

function normalizeHeaders(obj: Record<string, string>): LocationCsvRow {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    normalized[k.toLowerCase().trim()] = v ?? "";
  }
  return normalized as LocationCsvRow;
}

export async function parseFile(
  input: string | ArrayBuffer
): Promise<{ rows: LocationCsvRow[]; errors: string[] }> {
  if (typeof input === "string") {
    // CSV path
    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(input, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const errors = results.errors.map((e) => `Row ${e.row}: ${e.message}`);
          resolve({ rows: results.data.map(normalizeHeaders), errors });
        },
        error: (err: Error) => resolve({ rows: [], errors: [err.message] }),
      });
    });
  } else {
    // Excel path
    try {
      const wb = XLSX.read(input, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
      });
      return { rows: raw.map(normalizeHeaders), errors: [] };
    } catch (err: unknown) {
      return {
        rows: [],
        errors: [err instanceof Error ? err.message : "Failed to parse Excel file"],
      };
    }
  }
}
```

### 2c. `src/lib/imports/location-import/validate-row.ts`

```ts
import { buildLocationCode } from "@/lib/locations";
import { LocationCsvRow, LocationRowSchema, NormalizedLocationRow } from "./types";

function cleanStr(s: string | undefined | null): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  return t || undefined;
}

export function validateRow(
  row: LocationCsvRow,
  index: number
): { data: NormalizedLocationRow | null; errors: string[] } {
  const cleaned = {
    warehouse_name: (row.warehouse_name || "").trim(),
    zone: cleanStr(row.zone),
    aisle: cleanStr(row.aisle),
    rack: cleanStr(row.rack),
    bin: cleanStr(row.bin),
  };

  const parsed = LocationRowSchema.safeParse(cleaned);
  if (!parsed.success) {
    return { data: null, errors: parsed.error.errors.map((e) => e.message) };
  }

  return {
    data: { ...parsed.data, _originalRowIndex: index },
    errors: [],
  };
}
```

### 2d. `src/lib/imports/location-import/upsert-locations.ts`

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import { buildLocationCode } from "@/lib/locations";
import { Database } from "@/lib/supabase/database.types";
import { LocationImportResult, NormalizedLocationRow } from "./types";

type WarehouseMap = Map<string, string>; // name.toLowerCase() → id

export async function upsertLocations(
  supabase: SupabaseClient<Database>,
  rows: NormalizedLocationRow[],
  warehouses: WarehouseMap
): Promise<LocationImportResult> {
  const result: LocationImportResult = {
    totalRows: rows.length,
    inserted: 0,
    skipped: 0,
    failedRows: 0,
    errors: [],
  };

  for (const row of rows) {
    const rowNum = row._originalRowIndex;
    const warehouseId = warehouses.get(row.warehouse_name.toLowerCase());
    if (!warehouseId) {
      result.failedRows++;
      result.errors.push({
        row: rowNum,
        error: `Warehouse "${row.warehouse_name}" not found`,
      });
      continue;
    }

    const location_code = buildLocationCode(row.zone, row.aisle, row.rack, row.bin);

    // Check for existing (same warehouse + same code)
    const { data: existing } = await supabase
      .from("locations")
      .select("id")
      .eq("warehouse_id", warehouseId)
      .eq("location_code", location_code)
      .maybeSingle();

    if (existing) {
      result.skipped++;
      continue;
    }

    const { error } = await supabase.from("locations").insert({
      warehouse_id: warehouseId,
      zone: row.zone ?? null,
      aisle: row.aisle ?? null,
      rack: row.rack ?? null,
      bin: row.bin ?? null,
      location_code,
      is_active: true,
    });

    if (error) {
      result.failedRows++;
      result.errors.push({ row: rowNum, error: error.message });
    } else {
      result.inserted++;
    }
  }

  return result;
}
```

### 2e. `src/lib/imports/location-import/index.ts`

Orchestrator — parse → validate → preload warehouses → upsert:

```ts
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/supabase/database.types";
import { parseFile } from "./parse-file";
import { LocationImportResult, NormalizedLocationRow } from "./types";
import { upsertLocations } from "./upsert-locations";
import { validateRow } from "./validate-row";

export async function processLocationImport(
  supabase: SupabaseClient<Database>,
  input: string | ArrayBuffer
): Promise<LocationImportResult> {
  const result: LocationImportResult = {
    totalRows: 0,
    inserted: 0,
    skipped: 0,
    failedRows: 0,
    errors: [],
  };

  try {
    // Step 1: Parse
    const { rows: rawRows, errors: parseErrors } = await parseFile(input);
    result.totalRows = rawRows.length;
    if (parseErrors.length > 0) {
      parseErrors.forEach((e) => result.errors.push({ row: 0, error: `Parse error: ${e}` }));
    }

    // Step 2: Validate
    const validRows: NormalizedLocationRow[] = [];
    rawRows.forEach((row, i) => {
      const rowNum = i + 1;
      const { data, errors } = validateRow(row, rowNum);
      if (data) {
        validRows.push(data);
      } else {
        result.failedRows++;
        errors.forEach((e) => result.errors.push({ row: rowNum, error: e }));
      }
    });

    if (validRows.length === 0) return result;

    // Step 3: Preload warehouses
    const { data: whs } = await supabase.from("warehouses").select("id, name");
    const warehouseMap = new Map<string, string>(
      (whs ?? []).map((w) => [w.name.toLowerCase(), w.id])
    );

    // Step 4: Upsert
    const upsertResult = await upsertLocations(supabase, validRows, warehouseMap);
    result.inserted += upsertResult.inserted;
    result.skipped += upsertResult.skipped;
    result.failedRows += upsertResult.failedRows;
    result.errors.push(...upsertResult.errors);
  } catch (err: unknown) {
    result.errors.push({ row: 0, error: `Fatal: ${err instanceof Error ? err.message : String(err)}` });
  }

  return result;
}

export type { LocationImportResult };
```

Run `pnpm lint:fix && pnpm format && pnpm typecheck`, then commit.

---

## Task 3 — Import Server Action + Page + Header Button

**Scope:** 3 new files + 1 updated file.

### 3a. `src/actions/admin/import-locations.ts`

```ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { processLocationImport, LocationImportResult } from "@/lib/imports/location-import";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

export async function importLocationsAction(
  input: string | ArrayBuffer
): Promise<{ success: boolean; result?: LocationImportResult; error?: string }> {
  try {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || auth.role !== "admin") {
      return { success: false, error: "Only admins can import locations" };
    }

    const adminClient = createAdminClient();
    const result = await processLocationImport(adminClient, input);

    revalidateTag("admin:locations", "default");
    revalidatePath("/admin/locations");

    return { success: true, result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error during import",
    };
  }
}
```

### 3b. `src/app/(admin)/admin/locations/import/page.tsx`

Client component — closely mirrors `src/app/(admin)/admin/products/import/page.tsx` but:
- Accepts `.csv`, `.xlsx`, `.xls` (update `accept` attribute and validation)
- For Excel files, reads as `ArrayBuffer` and passes to action
- For CSV files, reads as text string and passes to action
- Summary shows: Total Rows, Failed Rows, Inserted, Skipped (duplicate)
- Template download button generates a minimal example CSV inline (no server round-trip):
  ```
  warehouse_name,zone,aisle,rack,bin
  Main Warehouse,A,01,R1,B01
  ```
- Download button: `Download Template`
- Page title: `Import Locations`
- CardDescription: `Upload a CSV or Excel file to bulk import locations. Duplicate location codes in the same warehouse are skipped.`

Key difference from products page:
```ts
const handleFileChange = (e) => {
  const selected = e.target.files[0];
  const validTypes = [".csv", ".xlsx", ".xls"];
  const isValid = validTypes.some(ext => selected.name.endsWith(ext));
  if (!isValid) { toast.error("Please upload a CSV or Excel file"); return; }
  setFile(selected);
};

const startImport = async () => {
  let input: string | ArrayBuffer;
  if (file.name.endsWith(".csv")) {
    input = await file.text();
  } else {
    input = await file.arrayBuffer();
  }
  const response = await importLocationsAction(input);
  ...
};
```

The result summary shows 4 stat cards: Total Rows, Failed Rows, Inserted, Skipped.

### 3c. `src/components/admin/locations/location-header.tsx` — add Import button

Add an "Import" button next to "Add Location":
```tsx
import { Upload, Plus } from "lucide-react";
import Link from "next/link";
```

Change the button row to:
```tsx
<div className="flex gap-2">
  <Button size="sm" variant="outline" asChild>
    <Link href="/admin/locations/import">
      <Upload className="mr-1.5 h-4 w-4" />
      Import
    </Link>
  </Button>
  <Button size="sm" onClick={() => setIsOpen(true)}>
    <Plus className="mr-1.5 h-4 w-4" />
    Add Location
  </Button>
</div>
```

Run `pnpm lint:fix && pnpm format && pnpm typecheck`, then commit.
