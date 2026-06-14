"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { processStockMovement } from "@/actions/admin/stock";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

export type UserTransferWithDetails = {
  id: string;
  product_id: string;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  shop_type_id: string;
  quantity: number;
  notes: string | null;
  transferred_at: string;
  dest_location_id: string | null;
  products: { name: string; sku: string | null } | null;
  source_warehouse: { name: string } | null;
  dest_warehouse: { name: string } | null;
  shop_types: { name: string } | null;
  profiles: { full_name: string | null; email: string } | null;
};

async function verifyAuth() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  return auth;
}

async function verifyTransferPermission() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) throw new Error("Unauthorized");

  if (auth.role === "admin") return auth.userId;

  const adminClient = createAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("perm_do_transfer")
    .eq("id", auth.userId)
    .single();

  if (error || !profile)
    throw new Error("Forbidden: Could not verify user permissions");

  if (!profile.perm_do_transfer)
    throw new Error(
      "Forbidden: You do not have permission to perform transfer"
    );

  return auth.userId;
}

export async function getTransfers(
  params: { page?: number; pageSize?: number } = {}
): Promise<{ transfers: UserTransferWithDetails[]; totalCount: number }> {
  await verifyAuth();
  const { page = 1, pageSize = 20 } = params;

  const adminClient = createAdminClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await adminClient
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
      dest_location_id,
      products(name, sku),
      source_warehouse:warehouses!stock_transfers_source_warehouse_id_fkey(name),
      dest_warehouse:warehouses!stock_transfers_dest_warehouse_id_fkey(name),
      shop_types(name),
      profiles:transferred_by(full_name, email)
      `,
      { count: "exact" }
    )
    .eq("status", "pending")
    .order("transferred_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error("Failed to fetch transfers");

  return {
    transfers: data as unknown as UserTransferWithDetails[],
    totalCount: count || 0,
  };
}

export async function getWarehouseLocations(
  warehouseId: string
): Promise<{ id: string; location_code: string }[]> {
  await verifyAuth();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("locations")
    .select("id, location_code")
    .eq("warehouse_id", warehouseId)
    .eq("is_active", true)
    .order("location_code");

  if (error) return [];
  return data as { id: string; location_code: string }[];
}

export async function completeTransfer(
  transferId: string,
  destLocationId: string
) {
  try {
    await verifyTransferPermission();
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
    revalidatePath("/transfers");
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
    await verifyTransferPermission();
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
    revalidatePath("/transfers");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
