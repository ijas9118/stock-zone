"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type StockMovementType = Database["public"]["Enums"]["movement_type"];

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
  } | null;
  warehouses: { name: string } | null;
  shop_types: { name: string } | null;
};

async function verifyUserPermission(
  actionType:
    | "transfer"
    | "adjustment"
    | "purchase"
    | "sale"
    | "return"
    | "initial_stock"
) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) throw new Error("Unauthorized");

  // Admins bypass granular checks
  if (auth.role === "admin") return auth.userId;

  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select(
      "perm_do_transfer, perm_do_adjustment, perm_do_purchase, perm_do_sale, perm_do_return"
    )
    .eq("id", auth.userId)
    .single();

  if (error || !profile) {
    throw new Error("Forbidden: Could not verify user permissions");
  }

  // Check specific permissions based on the action
  let hasPermission = false;
  switch (actionType) {
    case "transfer":
      hasPermission = profile.perm_do_transfer;
      break;
    case "adjustment":
    case "initial_stock":
      hasPermission = profile.perm_do_adjustment;
      break;
    case "purchase":
      hasPermission = profile.perm_do_purchase;
      break;
    case "sale":
      hasPermission = profile.perm_do_sale;
      break;
    case "return":
      hasPermission = profile.perm_do_return;
      break;
  }

  if (!hasPermission) {
    throw new Error(
      `Forbidden: You do not have permission to perform ${actionType}`
    );
  }

  return auth.userId;
}

// Keep a generic verifyAdmin for reads (or use RLS) if needed, but we'll use auth context directly in getStocks
async function verifyAdminRead() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  // For getting stocks, if they are active they can hit the endpoint, RLS handles visibility
  return auth.userId;
}

export async function getStocks(
  params: {
    warehouseId?: string;
    shopTypeId?: string;
    categoryId?: string;
    subCategoryId?: string;
    query?: string;
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
            subcategories(subcategory_name)
          ),
          warehouses(name),
          shop_types(name)
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

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching stocks:", error);
        throw new Error("Failed to fetch stocks");
      }

      return {
        stocks: data as unknown as StockWithDetails[],
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
      String(page),
      String(pageSize),
    ],
    {
      tags: ["admin:stocks"],
      revalidate: 3600,
    }
  )();
}

/**
 * Perform a stock movement (Adjustment, Purchase, Sale, Return)
 * This handles updating the stock table and adding a ledger entry.
 */
export async function processStockMovement(data: {
  productId: string;
  warehouseId: string;
  shopTypeId: string;
  quantityDelta: number; // Positive for additions, negative for deductions
  type: StockMovementType;
  notes?: string;
  referenceId?: string; // Optional, can be provided by caller (e.g. transferId)
}) {
  try {
    const userId = await verifyUserPermission(
      data.type === "transfer_out" || data.type === "transfer_in"
        ? "transfer"
        : data.type
    );
    const adminClient = createAdminClient();

    // 1. Get current stock
    const { data: currentStock, error: fetchError } = await adminClient
      .from("stock")
      .select("id, quantity")
      .eq("product_id", data.productId)
      .eq("warehouse_id", data.warehouseId)
      .eq("shop_type_id", data.shopTypeId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (data.type === "initial_stock" && currentStock) {
      return {
        error:
          "Inventory already exists for this product in the selected warehouse and shop type. Please use 'Adjustment' or 'Purchase' to update its quantity.",
      };
    }

    const previousQuantity = currentStock?.quantity || 0;
    const newQuantity = previousQuantity + data.quantityDelta;

    if (newQuantity < 0) {
      return { error: "Insufficient stock for this operation" };
    }

    let effectiveReferenceId = data.referenceId;

    // 1.5 Special handling for Adjustments (create a record in stock_adjustments if not already linked)
    if (data.type === "adjustment" && !effectiveReferenceId) {
      const { data: adj, error: adjError } = await adminClient
        .from("stock_adjustments")
        .insert({
          product_id: data.productId,
          warehouse_id: data.warehouseId,
          shop_type_id: data.shopTypeId,
          quantity_delta: data.quantityDelta,
          notes: data.notes || null,
          adjusted_by: userId,
          status: "approved",
        })
        .select()
        .single();

      if (adjError) throw adjError;
      effectiveReferenceId = adj.id;
    }

    // 2. Update/Insert stock record
    // Use a transaction-like approach (Supabase doesn't have multi-table transactions in JS SDK easily without RPC,
    // but we can do them sequentially or create an RPC if needed. For now, sequential is okay for admin actions).

    if (currentStock) {
      // Update existing stock
      const { error: updateError } = await adminClient
        .from("stock")
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentStock.id);

      if (updateError) throw updateError;
    } else {
      // Insert new stock record
      const { error: insertError } = await adminClient.from("stock").insert({
        product_id: data.productId,
        warehouse_id: data.warehouseId,
        shop_type_id: data.shopTypeId,
        quantity: newQuantity,
      });

      if (insertError) throw insertError;
    }

    // 2. Add to stock_movements ledger
    const { error: movementError } = await adminClient
      .from("stock_movements")
      .insert({
        product_id: data.productId,
        warehouse_id: data.warehouseId,
        shop_type_id: data.shopTypeId,
        quantity_delta: data.quantityDelta,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        type: data.type,
        notes: data.notes || null,
        reference_id: effectiveReferenceId || null,
        created_by: userId,
      });

    if (movementError) throw movementError;

    revalidateTag("admin:stocks", "default");
    revalidateTag("admin:stock-movements", "default");
    revalidateTag("admin:dashboard", "default");
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
 * Transfer stock between warehouses
 */
export async function transferStock(data: {
  productId: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  shopTypeId: string;
  quantity: number;
  notes?: string;
}) {
  try {
    const userId = await verifyUserPermission("transfer");
    const adminClient = createAdminClient();

    if (data.sourceWarehouseId === data.destWarehouseId) {
      return { error: "Source and destination warehouses cannot be the same" };
    }

    // 1. Check source stock
    const { data: sourceStock, error: sourceError } = await adminClient
      .from("stock")
      .select("quantity")
      .eq("product_id", data.productId)
      .eq("warehouse_id", data.sourceWarehouseId)
      .eq("shop_type_id", data.shopTypeId)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!sourceStock || sourceStock.quantity < data.quantity) {
      return { error: "Insufficient stock in source warehouse" };
    }

    // 1. Create the transfer record first to get a reference_id
    const { data: transfer, error: transferInsertError } = await adminClient
      .from("stock_transfers")
      .insert({
        product_id: data.productId,
        source_warehouse_id: data.sourceWarehouseId,
        dest_warehouse_id: data.destWarehouseId,
        shop_type_id: data.shopTypeId,
        quantity: data.quantity,
        notes: data.notes || null,
        transferred_by: userId,
        status: "approved",
      })
      .select()
      .single();

    if (transferInsertError) throw transferInsertError;
    const transferId = transfer.id;

    // 2. Perform outbound movement
    const outResult = await processStockMovement({
      productId: data.productId,
      warehouseId: data.sourceWarehouseId,
      shopTypeId: data.shopTypeId,
      quantityDelta: -data.quantity,
      type: "transfer_out",
      referenceId: transferId,
      notes: data.notes || `Transfer to warehouse ${data.destWarehouseId}`,
    });

    if (outResult.error) {
      // If outbound fails, we should ideally mark transfer as failed
      await adminClient
        .from("stock_transfers")
        .update({ status: "rejected", notes: outResult.error })
        .eq("id", transferId);
      return outResult;
    }

    // 3. Perform inbound movement
    const inResult = await processStockMovement({
      productId: data.productId,
      warehouseId: data.destWarehouseId,
      shopTypeId: data.shopTypeId,
      quantityDelta: data.quantity,
      type: "transfer_in",
      referenceId: transferId,
      notes: data.notes || `Transfer from warehouse ${data.sourceWarehouseId}`,
    });

    if (inResult.error) {
      await adminClient
        .from("stock_transfers")
        .update({ status: "rejected", notes: inResult.error })
        .eq("id", transferId);
      return inResult;
    }

    revalidateTag("admin:stocks", "default");
    revalidateTag("admin:stock-movements", "default");
    revalidateTag("admin:dashboard", "default");
    revalidatePath("/admin/stock");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error transferring stock:", err);
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
