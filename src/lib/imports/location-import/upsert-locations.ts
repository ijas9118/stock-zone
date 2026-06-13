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

    const location_code = buildLocationCode(
      row.zone,
      row.aisle,
      row.rack,
      row.bin
    );

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
