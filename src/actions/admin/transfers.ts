"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

import { processStockMovement } from "./stock";

export type TransferStatus = Database["public"]["Enums"]["transaction_status"];

export type TransferWithDetails = {
  id: string;
  product_id: string;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  shop_type_id: string;
  quantity: number;
  notes: string | null;
  transferred_at: string;
  status: TransferStatus;
  dest_location_id: string | null;
  products: { name: string; sku: string | null } | null;
  source_warehouse: { name: string } | null;
  dest_warehouse: { name: string } | null;
  shop_types: { name: string } | null;
  profiles: { full_name: string | null; email: string } | null;
  dest_location: { location_code: string } | null;
};

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin")
    throw new Error("Forbidden: Admin access required");
}

export async function getTransfers(
  params: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  await verifyAdmin();

  const { status, page = 1, pageSize = 10 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();

      let query = adminClient
        .from("stock_transfers")
        .select(
          `
          id,
          product_id,
          source_warehouse_id,
          dest_warehouse_id,
          shop_type_id,
          quantity,
          notes,
          transferred_at,
          status,
          dest_location_id,
          products(name, sku),
          source_warehouse:warehouses!stock_transfers_source_warehouse_id_fkey(name),
          dest_warehouse:warehouses!stock_transfers_dest_warehouse_id_fkey(name),
          shop_types(name),
          profiles:transferred_by(full_name, email),
          dest_location:locations!stock_transfers_dest_location_id_fkey(location_code)
          `,
          { count: "exact" }
        )
        .order("transferred_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status as TransferStatus);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw new Error("Failed to fetch transfers");

      return {
        transfers: data as unknown as TransferWithDetails[],
        totalCount: count || 0,
      };
    },
    ["admin-transfers", status || "all", String(page), String(pageSize)],
    { tags: ["admin:transfers"], revalidate: 60 }
  )();
}

export async function getTransferById(id: string) {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("stock_transfers")
    .select(
      `
      id,
      product_id,
      source_warehouse_id,
      dest_warehouse_id,
      shop_type_id,
      quantity,
      notes,
      transferred_at,
      status,
      dest_location_id,
      products(name, sku),
      source_warehouse:warehouses!stock_transfers_source_warehouse_id_fkey(name),
      dest_warehouse:warehouses!stock_transfers_dest_warehouse_id_fkey(name),
      shop_types(name),
      profiles:transferred_by(full_name, email),
      dest_location:locations!stock_transfers_dest_location_id_fkey(location_code)
      `
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as TransferWithDetails;
}

export async function completeTransfer(
  transferId: string,
  destLocationId: string
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { data: transfer, error: fetchError } = await adminClient
      .from("stock_transfers")
      .select("*")
      .eq("id", transferId)
      .single();

    if (fetchError || !transfer) return { error: "Transfer not found" };
    if (transfer.status !== "pending")
      return { error: "Transfer is not in pending status" };

    const { error: locationUpdateError } = await adminClient
      .from("stock_transfers")
      .update({ dest_location_id: destLocationId })
      .eq("id", transferId);

    if (locationUpdateError) throw locationUpdateError;

    const outResult = await processStockMovement({
      productId: transfer.product_id,
      warehouseId: transfer.source_warehouse_id,
      shopTypeId: transfer.shop_type_id,
      quantityDelta: -transfer.quantity,
      type: "transfer_out",
      referenceId: transferId,
      notes: transfer.notes ?? undefined,
    });

    if (outResult.error) return outResult;

    const inResult = await processStockMovement({
      productId: transfer.product_id,
      warehouseId: transfer.dest_warehouse_id,
      shopTypeId: transfer.shop_type_id,
      quantityDelta: transfer.quantity,
      type: "transfer_in",
      referenceId: transferId,
      notes: transfer.notes ?? undefined,
      locationId: destLocationId,
    });

    if (inResult.error) {
      await processStockMovement({
        productId: transfer.product_id,
        warehouseId: transfer.source_warehouse_id,
        shopTypeId: transfer.shop_type_id,
        quantityDelta: transfer.quantity,
        type: "transfer_in",
        referenceId: transferId,
        notes: `Reversal: inbound failed — ${inResult.error}`,
      });
      await adminClient
        .from("stock_transfers")
        .update({ status: "cancelled" })
        .eq("id", transferId);
      return inResult;
    }

    const { error: statusError } = await adminClient
      .from("stock_transfers")
      .update({ status: "completed" })
      .eq("id", transferId);

    if (statusError) throw statusError;

    revalidateTag("admin:transfers", "default");
    revalidateTag("admin:stocks", "default");
    revalidateTag("admin:stock-movements", "default");
    revalidateTag("admin:dashboard", "default");
    revalidatePath("/admin/transfers");
    revalidatePath("/admin/stock");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function cancelTransfer(transferId: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { data: transfer, error: fetchError } = await adminClient
      .from("stock_transfers")
      .select("status")
      .eq("id", transferId)
      .single();

    if (fetchError || !transfer) return { error: "Transfer not found" };
    if (transfer.status !== "pending")
      return { error: "Only pending transfers can be cancelled" };

    const { error } = await adminClient
      .from("stock_transfers")
      .update({ status: "cancelled" })
      .eq("id", transferId);

    if (error) throw error;

    revalidateTag("admin:transfers", "default");
    revalidatePath("/admin/transfers");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
