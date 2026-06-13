import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/lib/supabase/database.types";

import { parseFile } from "./parse-file";
import { BrandImportResult, NormalizedBrandRow } from "./types";
import { upsertBrands } from "./upsert-brands";
import { validateRow } from "./validate-row";

export async function processBrandImport(
  supabase: SupabaseClient<Database>,
  input: string | ArrayBuffer
): Promise<BrandImportResult> {
  const result: BrandImportResult = {
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

    const validRows: NormalizedBrandRow[] = [];
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

    const { data: existing } = await supabase
      .from("brands")
      .select("name")
      .in(
        "name",
        validRows.map((r) => r.name)
      );

    const existingNames = new Set<string>(
      (existing ?? []).map((b) => b.name.toLowerCase())
    );

    const upsertResult = await upsertBrands(supabase, validRows, existingNames);
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

export type { BrandImportResult };
