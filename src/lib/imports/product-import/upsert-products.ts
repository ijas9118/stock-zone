import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/lib/supabase/database.types";

import { normalizeKey } from "./helpers";
import { LookupMaps, NormalizedRow } from "./types";

interface ProductUpsertResult {
  insertedProducts: number;
  updatedProducts: number;
  failedRows: number;
  errors: { row: number; error: string }[];
}

export async function upsertProducts(
  supabase: SupabaseClient<Database>,
  rows: NormalizedRow[],
  lookups: LookupMaps
): Promise<ProductUpsertResult> {
  const result: ProductUpsertResult = {
    insertedProducts: 0,
    updatedProducts: 0,
    failedRows: 0,
    errors: [],
  };

  // De-duplicate products by SKU (if present) or by Product Name (if SKU is null)
  const uniqueProductsMap = new Map<string, NormalizedRow>();
  rows.forEach((row) => {
    const key = row.sku
      ? `sku:${normalizeKey(row.sku)}`
      : `name:${normalizeKey(row.product_name)}`;
    uniqueProductsMap.set(key, row);
  });
  const uniqueRows = Array.from(uniqueProductsMap.values());

  const CHUNK_SIZE = 500;
  for (let i = 0; i < uniqueRows.length; i += CHUNK_SIZE) {
    const chunk = uniqueRows.slice(i, i + CHUNK_SIZE);

    // Prepare data
    const withSkuData: Database["public"]["Tables"]["products"]["Insert"][] =
      [];
    const withSkuRows: NormalizedRow[] = [];

    const withoutSkuData: Database["public"]["Tables"]["products"]["Insert"][] =
      [];
    const withoutSkuRows: NormalizedRow[] = [];

    for (const row of chunk) {
      try {
        const cat = row.category_name
          ? lookups.categories.get(normalizeKey(row.category_name))
          : undefined;
        let subcatId = undefined;
        if (cat && row.subcategory_name) {
          const subcat = lookups.subcategories.get(
            `${cat.id}:${normalizeKey(row.subcategory_name)}`
          );
          if (subcat) subcatId = subcat.id;
        }

        const brand = row.brand_name
          ? lookups.brands.get(normalizeKey(row.brand_name))
          : undefined;
        const uom = row.uom_code
          ? lookups.uoms.get(normalizeKey(row.uom_code))
          : undefined;

        const productData: Database["public"]["Tables"]["products"]["Insert"] =
          {
            name: row.product_name,
            sku: row.sku || null,
            description: row.description || null,
            category: cat?.id || null,
            sub_category: subcatId || null,
            brand_id: brand?.id || null,
            uom: uom?.id || null,
            minimum_stock_quantity: row.minimum_stock_quantity || 0,
            is_active: true,
          };

        if (row.sku) {
          withSkuData.push(productData);
          withSkuRows.push(row);
        } else {
          const existingProduct = lookups.productsByName.get(
            normalizeKey(row.product_name)
          );
          if (existingProduct) {
            productData.id = existingProduct.id;
          }
          withoutSkuData.push(productData);
          withoutSkuRows.push(row);
        }
      } catch (err: unknown) {
        result.failedRows++;
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({ row: row._originalRowIndex, error: message });
      }
    }

    // 1. Process products with SKU (upsert on conflict 'sku')
    if (withSkuData.length > 0) {
      const { data: upsertedProducts, error } = await supabase
        .from("products")
        .upsert(withSkuData, { onConflict: "sku", ignoreDuplicates: false })
        .select();

      if (error) {
        result.failedRows += withSkuRows.length;
        result.errors.push({
          row: withSkuRows[0]._originalRowIndex,
          error: `Batch SKU upsert failed: ${error.message}`,
        });
      } else if (upsertedProducts) {
        upsertedProducts.forEach((p) => {
          const wasExisting = p.sku
            ? lookups.productsBySku.has(normalizeKey(p.sku))
            : false;

          if (wasExisting) {
            result.updatedProducts++;
          } else {
            result.insertedProducts++;
          }

          // Add to lookups for stock processing
          if (p.sku) lookups.productsBySku.set(normalizeKey(p.sku), p);
          if (p.name) lookups.productsByName.set(normalizeKey(p.name), p);
        });
      }
    }

    // 2. Process products without SKU (upsert on conflict 'id')
    if (withoutSkuData.length > 0) {
      const { data: upsertedProducts, error } = await supabase
        .from("products")
        .upsert(withoutSkuData, { onConflict: "id", ignoreDuplicates: false })
        .select();

      if (error) {
        result.failedRows += withoutSkuRows.length;
        result.errors.push({
          row: withoutSkuRows[0]._originalRowIndex,
          error: `Batch ID upsert failed: ${error.message}`,
        });
      } else if (upsertedProducts) {
        upsertedProducts.forEach((p) => {
          const wasExisting = p.name
            ? lookups.productsByName.has(normalizeKey(p.name))
            : false;

          if (wasExisting) {
            result.updatedProducts++;
          } else {
            result.insertedProducts++;
          }

          // Add to lookups for stock processing
          if (p.sku) lookups.productsBySku.set(normalizeKey(p.sku), p);
          if (p.name) lookups.productsByName.set(normalizeKey(p.name), p);
        });
      }
    }
  }

  return result;
}
