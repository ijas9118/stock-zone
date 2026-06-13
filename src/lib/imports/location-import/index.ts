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
    const { rows: rawRows, errors: parseErrors } = await parseFile(input);
    result.totalRows = rawRows.length;
    if (parseErrors.length > 0) {
      parseErrors.forEach((e) =>
        result.errors.push({ row: 0, error: `Parse error: ${e}` })
      );
    }

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

    const { data: whs } = await supabase.from("warehouses").select("id, name");
    const warehouseMap = new Map<string, string>(
      (whs ?? []).map((w) => [w.name.toLowerCase(), w.id])
    );

    const upsertResult = await upsertLocations(
      supabase,
      validRows,
      warehouseMap
    );
    result.inserted += upsertResult.inserted;
    result.skipped += upsertResult.skipped;
    result.failedRows += upsertResult.failedRows;
    result.errors.push(...upsertResult.errors);
  } catch (err: unknown) {
    result.errors.push({
      row: 0,
      error: `Fatal: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  return result;
}

export type { LocationImportResult };
