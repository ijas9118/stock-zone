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
    if (!row._parsedAlternateUoms || row._parsedAlternateUoms.length === 0)
      continue;

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

      if (alt.is_purchase_default) {
        const { error: clearError } = await supabase
          .from("product_uom_conversions")
          .update({ is_purchase_default: false })
          .eq("product_id", product.id)
          .eq("is_purchase_default", true);
        if (clearError) {
          result.errors.push({
            row: row._originalRowIndex,
            error: `Failed to clear purchase default for product "${row.product_name}": ${clearError.message}`,
          });
          continue;
        }
      }

      if (alt.is_sales_default) {
        const { error: clearError } = await supabase
          .from("product_uom_conversions")
          .update({ is_sales_default: false })
          .eq("product_id", product.id)
          .eq("is_sales_default", true);
        if (clearError) {
          result.errors.push({
            row: row._originalRowIndex,
            error: `Failed to clear sales default for product "${row.product_name}": ${clearError.message}`,
          });
          continue;
        }
      }

      const { error } = await supabase.from("product_uom_conversions").upsert(
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
