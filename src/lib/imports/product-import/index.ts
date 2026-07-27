import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/lib/supabase/database.types";

import { createMissingLookups } from "./create-lookups";
import { parseCsv } from "./parse-csv";
import { preloadLookups } from "./preload-lookups";
import { ImportResult, NormalizedRow } from "./types";
import { upsertProducts } from "./upsert-products";
import { upsertStock } from "./upsert-stock";
import { upsertUomConversions } from "./upsert-uom-conversions";
import { validateRow } from "./validate-row";

export async function processCsvImport(
  supabase: SupabaseClient<Database>,
  fileContent: string
): Promise<ImportResult> {
  const result: ImportResult = {
    totalRows: 0,
    insertedProducts: 0,
    updatedProducts: 0,
    insertedStockRows: 0,
    skippedExistingStockRows: 0,
    upsertedUomConversions: 0,
    failedRows: 0,
    errors: [],
  };

  try {
    // Step 1: Parse CSV
    const { rows, errors: parseErrors } = await parseCsv(fileContent);
    result.totalRows = rows.length;

    if (parseErrors.length > 0) {
      result.errors.push(
        ...parseErrors.map((e) => ({ row: 0, error: `Parse error: ${e}` }))
      );
    }

    // Step 2: Validate rows
    const validRows: NormalizedRow[] = [];
    rows.forEach((row, index) => {
      const rowNum = index + 1; // 1-indexed for user display
      const { data, errors } = validateRow(row, rowNum);
      if (data) {
        validRows.push(data);
      } else {
        result.failedRows++;
        errors.forEach((err) =>
          result.errors.push({ row: rowNum, error: err })
        );
      }
    });

    if (validRows.length === 0) {
      return result; // Nothing valid to process
    }

    // Step 3: Preload lookups
    const lookups = await preloadLookups(supabase);

    // Step 4: Create missing lookups
    await createMissingLookups(supabase, validRows, lookups);

    // Step 5: Upsert products
    const productResult = await upsertProducts(supabase, validRows, lookups);
    result.insertedProducts = productResult.insertedProducts;
    result.updatedProducts = productResult.updatedProducts;
    result.failedRows += productResult.failedRows;
    result.errors.push(...productResult.errors);

    // Step 5b: Upsert UOM conversions
    const uomResult = await upsertUomConversions(supabase, validRows, lookups);
    result.upsertedUomConversions = uomResult.upsertedUomConversions;
    result.errors.push(...uomResult.errors);

    // Step 6: Upsert stock
    const stockResult = await upsertStock(supabase, validRows, lookups);
    result.insertedStockRows = stockResult.insertedStockRows;
    result.skippedExistingStockRows = stockResult.skippedExistingStockRows;
    result.failedRows += stockResult.failedRows;
    result.errors.push(...stockResult.errors);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push({ row: 0, error: `Fatal Error: ${message}` });
  }

  return result;
}
