import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/lib/supabase/database.types";

import { BrandImportResult, NormalizedBrandRow } from "./types";

export async function upsertBrands(
  supabase: SupabaseClient<Database>,
  rows: NormalizedBrandRow[],
  existingNames: Set<string> // lower-cased existing brand names
): Promise<BrandImportResult> {
  const result: BrandImportResult = {
    totalRows: rows.length,
    inserted: 0,
    skipped: 0,
    failedRows: 0,
    errors: [],
  };

  for (const row of rows) {
    const rowNum = row._originalRowIndex;

    if (existingNames.has(row.name.toLowerCase())) {
      result.skipped++;
      continue;
    }

    const { error } = await supabase.from("brands").insert({
      name: row.name,
      is_active: true,
    });

    if (error) {
      result.failedRows++;
      result.errors.push({ row: rowNum, error: error.message });
    } else {
      result.inserted++;
      existingNames.add(row.name.toLowerCase());
    }
  }

  return result;
}
