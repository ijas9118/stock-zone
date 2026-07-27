import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/lib/supabase/database.types";

import { normalizeKey } from "./helpers";
import { LookupMaps, NormalizedRow } from "./types";

interface StockUpsertResult {
  insertedStockRows: number;
  skippedExistingStockRows: number;
  failedRows: number;
  errors: { row: number; error: string }[];
}

export async function upsertStock(
  supabase: SupabaseClient<Database>,
  rows: NormalizedRow[],
  lookups: LookupMaps
): Promise<StockUpsertResult> {
  const result: StockUpsertResult = {
    insertedStockRows: 0,
    skippedExistingStockRows: 0,
    failedRows: 0,
    errors: [],
  };

  const stockMap = new Map<
    string,
    Database["public"]["Tables"]["stock"]["Insert"]
  >();

  rows.forEach((row) => {
    // Only process if stock is provided
    if (
      row.initial_stock_quantity === undefined ||
      row.initial_stock_quantity === null
    )
      return;

    // We need shop_type and warehouse to be present if stock is given.
    if (!row.shop_type_name || !row.warehouse_name) {
      // Step 10: Missing warehouse but stock quantity exists -> validation error
      if (row.initial_stock_quantity > 0) {
        result.failedRows++;
        result.errors.push({
          row: row._originalRowIndex,
          error:
            "Stock quantity provided but shop_type_name or warehouse_name is missing.",
        });
      }
      return;
    }

    const product = row.sku
      ? lookups.productsBySku.get(normalizeKey(row.sku))
      : lookups.productsByName.get(normalizeKey(row.product_name));

    if (!product) {
      result.failedRows++;
      result.errors.push({
        row: row._originalRowIndex,
        error: "Product not found for stock insertion.",
      });
      return;
    }

    const shopType = lookups.shopTypes.get(normalizeKey(row.shop_type_name));
    const warehouse = lookups.warehouses.get(normalizeKey(row.warehouse_name));

    if (!shopType || !warehouse) {
      result.failedRows++;
      result.errors.push({
        row: row._originalRowIndex,
        error: "Shop Type or Warehouse not found for stock insertion.",
      });
      return;
    }

    const key = `${product.id}:${warehouse.id}:${shopType.id}`;

    // Step 10: Duplicate stock row -> update quantity (accumulate or override?
    // Usually override or accumulate, we will take the last one or accumulate. Let's override as per standard "initial_stock" meaning)
    stockMap.set(key, {
      product_id: product.id,
      warehouse_id: warehouse.id,
      shop_type_id: shopType.id,
      quantity: row.initial_stock_quantity,
    });
  });

  const candidateStocks = Array.from(stockMap.values());

  // A CSV import must never overwrite the live quantity of a stock row that
  // already exists — that quantity may have moved via adjustments/sales/
  // transfers since the row was created, and the CSV only knows the
  // product's *initial* stock figure. Only genuinely new (product,
  // warehouse, shop_type) combinations get their quantity set here.
  const productIds = Array.from(
    new Set(candidateStocks.map((s) => s.product_id))
  );
  const existingKeys = new Set<string>();
  if (productIds.length > 0) {
    const { data: existingStock, error: existingError } = await supabase
      .from("stock")
      .select("product_id, warehouse_id, shop_type_id")
      .in("product_id", productIds);

    if (existingError) {
      result.failedRows += candidateStocks.length;
      result.errors.push({
        row: -1,
        error: `Failed to check existing stock rows: ${existingError.message}`,
      });
      return result;
    }

    (existingStock || []).forEach((s) => {
      existingKeys.add(`${s.product_id}:${s.warehouse_id}:${s.shop_type_id}`);
    });
  }

  const stocksToInsert = candidateStocks.filter(
    (s) =>
      !existingKeys.has(`${s.product_id}:${s.warehouse_id}:${s.shop_type_id}`)
  );
  result.skippedExistingStockRows =
    candidateStocks.length - stocksToInsert.length;

  const CHUNK_SIZE = 500;
  for (let i = 0; i < stocksToInsert.length; i += CHUNK_SIZE) {
    const chunk = stocksToInsert.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabase.from("stock").insert(chunk).select();

    if (error) {
      result.failedRows += chunk.length; // Approximate, as we aggregated
      result.errors.push({
        row: -1, // Cannot easily trace back to specific row here due to aggregation
        error: `Batch stock insert failed: ${error.message}`,
      });
    } else if (data) {
      result.insertedStockRows += data.length;
    }
  }

  return result;
}
