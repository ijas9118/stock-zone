import { createAdminClient } from "@/lib/supabase/admin";

export interface StockLocationOption {
  id: string;
  location_code: string;
  zone: string | null;
  rack: string | null;
  level: string | null;
  slot: string | null;
}

/**
 * Batched fetch of every bin location assigned to a set of stock rows via
 * the `stock_locations` junction table — one query for the whole page,
 * never one query per row.
 *
 * NOTE: `stock_locations` isn't in the generated Database types yet — run
 * `pnpm db:types` and this can drop the `any` cast.
 */
export async function getLocationsForStockIds(
  adminClient: ReturnType<typeof createAdminClient>,
  stockIds: string[]
): Promise<Map<string, StockLocationOption[]>> {
  const map = new Map<string, StockLocationOption[]>();
  if (stockIds.length === 0) return map;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data, error } = await (adminClient as any)
    .from("stock_locations")
    .select("stock_id, locations(id, location_code, zone, rack, level, slot)")
    .in("stock_id", stockIds);

  if (error) {
    console.error("Error batch-fetching stock locations:", error);
    return map;
  }

  (
    (data || []) as {
      stock_id: string;
      locations: StockLocationOption | null;
    }[]
  ).forEach((row) => {
    if (!row.locations) return;
    const existing = map.get(row.stock_id);
    if (existing) existing.push(row.locations);
    else map.set(row.stock_id, [row.locations]);
  });

  return map;
}
