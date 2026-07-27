"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import {
  getLocationsForStockIds,
  StockLocationOption,
} from "@/lib/stock-locations";
import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type StockMovementType = Database["public"]["Enums"]["movement_type"];
export type MovementSubType = Database["public"]["Enums"]["movement_sub_type"];

export type StockRow = Database["public"]["Tables"]["stock"]["Row"];
export type StockWithDetails = StockRow & {
  products: {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    sub_category: string | null;
    categories: { category_name: string } | null;
    subcategories: { subcategory_name: string } | null;
    product_uom_conversions: Array<{
      conversion_factor: number;
      units_of_measure: { uom_code: string; full_name: string } | null;
    }>;
  } | null;
  warehouses: { name: string } | null;
  shop_types: { name: string } | null;
  locations: {
    id: string;
    location_code: string;
    zone: string | null;
    rack: string | null;
    level: string | null;
    slot: string | null;
  } | null;
  all_locations?: StockLocationOption[];
};

async function verifyUserPermission(
  actionType: "transfer" | "adjustment" | "in" | "out" | "initial_stock"
) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) throw new Error("Unauthorized");

  if (auth.role === "admin") return auth.userId;

  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select(
      "perm_do_transfer, perm_do_adjustment, perm_do_purchase, perm_do_sale"
    )
    .eq("id", auth.userId)
    .single();

  if (error || !profile)
    throw new Error("Forbidden: Could not verify user permissions");

  let hasPermission = false;
  switch (actionType) {
    case "transfer":
      hasPermission = profile.perm_do_transfer;
      break;
    case "adjustment":
    case "initial_stock":
      hasPermission = profile.perm_do_adjustment;
      break;
    case "in":
      hasPermission = profile.perm_do_purchase;
      break;
    case "out":
      hasPermission = profile.perm_do_sale;
      break;
  }

  if (!hasPermission)
    throw new Error(
      `Forbidden: You do not have permission to perform ${actionType}`
    );

  return auth.userId;
}

// Keep a generic verifyAdmin for reads (or use RLS) if needed, but we'll use auth context directly in getStocks
async function verifyAdminRead() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  // For getting stocks, if they are active they can hit the endpoint, RLS handles visibility
  return auth.userId;
}

export type StockSortBy = "name" | "sku" | "quantity";
export type StockSortDir = "asc" | "desc";

export async function getStocks(
  params: {
    warehouseId?: string;
    shopTypeId?: string;
    categoryId?: string;
    subCategoryId?: string;
    query?: string;
    stockStatus?: "out";
    sortBy?: StockSortBy;
    sortDir?: StockSortDir;
    page?: number;
    pageSize?: number;
  } = {}
) {
  await verifyAdminRead();
  const {
    warehouseId,
    shopTypeId,
    categoryId,
    subCategoryId,
    query,
    stockStatus,
    sortBy,
    sortDir = "asc",
    page = 1,
    pageSize = 8,
  } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();

      let supabaseQuery = adminClient.from("stock").select(
        `
          *,
          products!inner(
            id,
            name,
            sku,
            category,
            sub_category,
            categories(category_name),
            subcategories(subcategory_name),
            product_uom_conversions(conversion_factor, units_of_measure(uom_code, full_name))
          ),
          warehouses(name),
          shop_types(name),
          locations(id, location_code, zone, rack, level, slot)
        `,
        { count: "exact" }
      );

      if (warehouseId && warehouseId !== "all") {
        supabaseQuery = supabaseQuery.eq("warehouse_id", warehouseId);
      }

      if (shopTypeId && shopTypeId !== "all") {
        supabaseQuery = supabaseQuery.eq("shop_type_id", shopTypeId);
      }

      if (categoryId && categoryId !== "all") {
        supabaseQuery = supabaseQuery.eq("products.category", categoryId);
      }

      if (subCategoryId && subCategoryId !== "all") {
        supabaseQuery = supabaseQuery.eq(
          "products.sub_category",
          subCategoryId
        );
      }

      if (query) {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${query}%,sku.ilike.%${query}%`,
          { referencedTable: "products" }
        );
      }

      if (stockStatus === "out") {
        supabaseQuery = supabaseQuery.eq("quantity", 0);
      }

      const ascending = sortDir === "asc";
      let stocks: StockWithDetails[];
      let count: number | null;

      if (sortBy === "name" || sortBy === "sku") {
        // PostgREST can't reorder the parent (stock) rows by a to-one
        // embedded resource's column — `products.order=...` is silently a
        // no-op at the server level. Fetch the full filtered set in one
        // query and sort in-memory instead; this table is small enough
        // (product x warehouse x shop_type rows) that this stays a single,
        // cheap query rather than N+1 or a full scan concern.
        const {
          data,
          error,
          count: totalCount,
        } = await supabaseQuery.range(0, 4999);

        if (error) {
          console.error("Error fetching stocks:", error);
          throw new Error("Failed to fetch stocks");
        }

        const allStocks = data as unknown as StockWithDetails[];
        allStocks.sort((a, b) => {
          const aVal = (a.products?.[sortBy] ?? "").toLowerCase();
          const bVal = (b.products?.[sortBy] ?? "").toLowerCase();
          return ascending
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        });

        const from = (page - 1) * pageSize;
        stocks = allStocks.slice(from, from + pageSize);
        count = totalCount;
      } else {
        if (sortBy === "quantity") {
          supabaseQuery = supabaseQuery.order("quantity", { ascending });
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const {
          data,
          error,
          count: totalCount,
        } = await supabaseQuery.range(from, to);

        if (error) {
          console.error("Error fetching stocks:", error);
          throw new Error("Failed to fetch stocks");
        }

        stocks = data as unknown as StockWithDetails[];
        count = totalCount;
      }

      // Batched (single-query) lookup of all bin locations for this page's
      // stock rows — never loop-query per row.
      const locationsByStockId = await getLocationsForStockIds(
        adminClient,
        stocks.map((s) => s.id)
      );
      stocks.forEach((s) => {
        s.all_locations = locationsByStockId.get(s.id) ?? [];
      });

      return {
        stocks,
        totalCount: count || 0,
      };
    },
    [
      "admin-stocks",
      warehouseId || "",
      shopTypeId || "",
      categoryId || "",
      subCategoryId || "",
      query || "",
      stockStatus || "",
      sortBy || "",
      sortDir,
      String(page),
      String(pageSize),
    ],
    {
      tags: ["admin:stocks"],
      revalidate: 300,
    }
  )();
}

/**
 * Perform a stock movement (Adjustment, Purchase, Sale, Transfer)
 * This handles updating the stock table and adding a ledger entry.
 */
export async function processStockMovement(data: {
  productId: string;
  warehouseId: string;
  shopTypeId: string;
  quantityDelta: number;
  type: StockMovementType;
  subType?: MovementSubType;
  notes?: string;
  referenceId?: string;
  transactUomId?: string;
  transactQuantity?: number;
  locationId?: string | null;
}) {
  try {
    const userId = await verifyUserPermission(
      data.type === "transfer_out" || data.type === "transfer_in"
        ? "transfer"
        : data.type === "in" && data.subType === "initial_stock"
          ? "initial_stock"
          : data.type
    );
    const adminClient = createAdminClient();

    let effectiveQuantityDelta = data.quantityDelta;
    let effectiveTransactUomId: string | null = null;
    let effectiveTransactQuantity: number | null = null;

    if (data.transactUomId && data.transactQuantity !== undefined) {
      const { data: conversion, error: convError } = await adminClient
        .from("product_uom_conversions")
        .select("conversion_factor")
        .eq("product_id", data.productId)
        .eq("uom_id", data.transactUomId)
        .maybeSingle();

      if (convError) throw convError;

      if (conversion) {
        effectiveQuantityDelta =
          Math.round(
            data.transactQuantity *
              Number(conversion.conversion_factor) *
              1_000_000
          ) / 1_000_000;
        effectiveTransactUomId = data.transactUomId;
        effectiveTransactQuantity = data.transactQuantity;
      }
    }

    const { data: currentStock, error: fetchError } = await adminClient
      .from("stock")
      .select("id, quantity")
      .eq("product_id", data.productId)
      .eq("warehouse_id", data.warehouseId)
      .eq("shop_type_id", data.shopTypeId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (
      data.type === "in" &&
      data.subType === "initial_stock" &&
      currentStock
    ) {
      return {
        error:
          "Inventory already exists for this product in the selected warehouse and shop type. Use Adjustment to update the quantity.",
      };
    }

    const previousQuantity = currentStock?.quantity || 0;
    const newQuantity = previousQuantity + effectiveQuantityDelta;

    if (newQuantity < 0)
      return { error: "Insufficient stock for this operation" };

    let effectiveReferenceId = data.referenceId;

    if (data.type === "adjustment" && !effectiveReferenceId) {
      const { data: adj, error: adjError } = await adminClient
        .from("stock_adjustments")
        .insert({
          product_id: data.productId,
          warehouse_id: data.warehouseId,
          shop_type_id: data.shopTypeId,
          quantity_delta: effectiveQuantityDelta,
          notes: data.notes || null,
          adjusted_by: userId,
          status: "completed",
          adjustment_type: data.subType ?? null,
        })
        .select()
        .single();

      if (adjError) throw adjError;
      effectiveReferenceId = adj.id;
    }

    if (currentStock) {
      const updatePayload: Record<string, unknown> = {
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      };
      if (data.locationId !== undefined)
        updatePayload.location_id = data.locationId;
      const { error: updateError } = await adminClient
        .from("stock")
        .update(updatePayload)
        .eq("id", currentStock.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await adminClient.from("stock").insert({
        product_id: data.productId,
        warehouse_id: data.warehouseId,
        shop_type_id: data.shopTypeId,
        quantity: newQuantity,
        location_id: data.locationId ?? null,
      });
      if (insertError) throw insertError;
    }

    const { error: movementError } = await adminClient
      .from("stock_movements")
      .insert({
        product_id: data.productId,
        warehouse_id: data.warehouseId,
        shop_type_id: data.shopTypeId,
        quantity_delta: effectiveQuantityDelta,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        type: data.type,
        sub_type: data.subType ?? null,
        notes: data.notes || null,
        reference_id: effectiveReferenceId || null,
        created_by: userId,
        transact_uom_id: effectiveTransactUomId,
        transact_quantity: effectiveTransactQuantity,
      });

    if (movementError) throw movementError;

    revalidateTag("admin:stocks", "default");
    revalidateTag("admin:stock-movements", "default");
    revalidateTag("admin:dashboard", "default");
    revalidatePath("/admin");
    revalidatePath("/admin/stock");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error processing stock movement:", err);
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

/**
 * Update only the location_id on an existing stock record (no ledger entry).
 */
export async function updateStockLocation(
  stockId: string,
  locationId: string | null
) {
  try {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || auth.role !== "admin")
      throw new Error("Unauthorized");

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("stock")
      .update({ location_id: locationId, updated_at: new Date().toISOString() })
      .eq("id", stockId);

    if (error) throw error;

    revalidateTag("admin:stocks", "default");
    revalidatePath("/admin/stock");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

/**
 * All bin locations currently assigned to a stock row, via the
 * `stock_locations` junction table (many-to-many).
 *
 * NOTE: `stock_locations` isn't in the generated Database types yet — run
 * `pnpm db:types` and this can drop the `as never`/`any` casts.
 */
export async function getStockLocations(
  stockId: string
): Promise<StockLocationOption[]> {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || auth.role !== "admin") return [];

  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data, error } = await (adminClient as any)
    .from("stock_locations")
    .select("locations(id, location_code, zone, rack, level, slot)")
    .eq("stock_id", stockId);

  if (error) {
    console.error("Error fetching stock locations:", error);
    return [];
  }

  return ((data || []) as { locations: StockLocationOption | null }[])
    .map((row) => row.locations)
    .filter((loc): loc is StockLocationOption => !!loc);
}

/**
 * Persist the full set of bin locations for a stock row. Keeps the legacy
 * `stock.location_id` column in sync (first pick = primary), so existing
 * single-location displays (tables, lists) keep working unchanged, while
 * `stock_locations` holds the complete set.
 */
export async function updateStockLocations(
  stockId: string,
  locationIds: string[]
) {
  try {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || auth.role !== "admin")
      throw new Error("Unauthorized");

    const adminClient = createAdminClient();

    const { error: stockError } = await adminClient
      .from("stock")
      .update({
        location_id: locationIds[0] ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stockId);
    if (stockError) throw stockError;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    const { error: deleteError } = await (adminClient as any)
      .from("stock_locations")
      .delete()
      .eq("stock_id", stockId);
    if (deleteError) throw deleteError;

    if (locationIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
      const { error: insertError } = await (adminClient as any)
        .from("stock_locations")
        .insert(
          locationIds.map((locationId) => ({
            stock_id: stockId,
            location_id: locationId,
          }))
        );
      if (insertError) throw insertError;
    }

    revalidateTag("admin:stocks", "default");
    revalidatePath("/admin/stock");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

/**
 * Create a pending transfer record (no stock movement yet).
 */
export async function transferStock(data: {
  productId: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  shopTypeId: string;
  quantity: number;
  notes?: string;
  transactUomId?: string;
  transactQty?: number;
  destLocationId?: string | null;
}) {
  try {
    const userId = await verifyUserPermission("transfer");
    const adminClient = createAdminClient();

    let baseQuantity = data.quantity;
    if (data.transactUomId && data.transactQty) {
      const { data: conversion } = await adminClient
        .from("product_uom_conversions")
        .select("conversion_factor")
        .eq("product_id", data.productId)
        .eq("uom_id", data.transactUomId)
        .maybeSingle();
      if (conversion) {
        baseQuantity =
          Math.round(
            data.transactQty * Number(conversion.conversion_factor) * 1_000_000
          ) / 1_000_000;
      }
    }

    if (data.sourceWarehouseId === data.destWarehouseId)
      return { error: "Source and destination warehouses cannot be the same" };

    const { data: sourceStock, error: sourceError } = await adminClient
      .from("stock")
      .select("quantity")
      .eq("product_id", data.productId)
      .eq("warehouse_id", data.sourceWarehouseId)
      .eq("shop_type_id", data.shopTypeId)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!sourceStock || sourceStock.quantity < baseQuantity)
      return { error: "Insufficient stock in source warehouse" };

    // Note: Stock is not reserved at pending-creation time. Concurrent transfers for
    // the same SKU can both pass this check. Completion will fail safely if stock
    // has been consumed in the interim (processStockMovement returns "Insufficient stock").

    const { data: transfer, error: transferInsertError } = await adminClient
      .from("stock_transfers")
      .insert({
        product_id: data.productId,
        source_warehouse_id: data.sourceWarehouseId,
        dest_warehouse_id: data.destWarehouseId,
        shop_type_id: data.shopTypeId,
        quantity: baseQuantity,
        notes: data.notes || null,
        transferred_by: userId,
        status: "pending",
        dest_location_id: data.destLocationId ?? null,
      })
      .select()
      .single();

    if (transferInsertError) throw transferInsertError;

    revalidatePath("/admin/stock");
    revalidatePath("/");
    revalidateTag("admin:transfers", "default");
    return { success: true, transferId: transfer.id };
  } catch (err: unknown) {
    console.error("Error creating transfer:", err);
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
