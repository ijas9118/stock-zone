"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

export type UserRecentMovement = {
  id: string;
  type: string;
  sub_type: string | null;
  quantity_delta: number;
  created_at: string;
  notes: string | null;
  product_name: string;
  product_sku: string | null;
  warehouse_name: string;
  shop_type_name: string;
  owner_name: string;
};

export async function getUserRecentMovements(): Promise<UserRecentMovement[]> {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) throw new Error("Unauthorized");

  const adminClient = createAdminClient();

  const [{ data: profile }, { data: assignedShops }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("perm_stock_read_all")
      .eq("id", auth.userId)
      .single(),
    adminClient
      .from("profile_shop_types")
      .select("shop_type_id")
      .eq("profile_id", auth.userId),
  ]);

  const assignedShopIds = (assignedShops || [])
    .map((s) => s.shop_type_id)
    .filter(Boolean) as string[];

  if (!profile?.perm_stock_read_all && assignedShopIds.length === 0) {
    return [];
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let query = adminClient
    .from("stock_movements")
    .select(
      `
      id,
      type,
      sub_type,
      quantity_delta,
      created_at,
      notes,
      products(name, sku),
      warehouses(name),
      shop_types(name),
      profiles:created_by(full_name, email)
      `
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!profile?.perm_stock_read_all) {
    query = query.in("shop_type_id", assignedShopIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching user recent movements:", error);
    throw new Error("Failed to fetch recent stock movements");
  }

  return (data || []).map((m) => {
    const product = Array.isArray(m.products) ? m.products[0] : m.products;
    const warehouse = Array.isArray(m.warehouses)
      ? m.warehouses[0]
      : m.warehouses;
    const shopType = Array.isArray(m.shop_types)
      ? m.shop_types[0]
      : m.shop_types;
    const owner = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;

    return {
      id: m.id,
      type: m.type,
      sub_type: m.sub_type,
      quantity_delta: m.quantity_delta,
      created_at: m.created_at,
      notes: m.notes,
      product_name: product?.name ?? "Unknown product",
      product_sku: product?.sku ?? null,
      warehouse_name: warehouse?.name ?? "Unknown warehouse",
      shop_type_name: shopType?.name ?? "Unknown shop",
      owner_name: owner?.full_name ?? owner?.email ?? "Unknown",
    };
  });
}

export async function getStockMovementHistory(
  productId: string,
  warehouseId: string,
  shopTypeId: string,
  limit = 5
): Promise<UserRecentMovement[]> {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) throw new Error("Unauthorized");

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("stock_movements")
    .select(
      `
      id,
      type,
      sub_type,
      quantity_delta,
      created_at,
      notes,
      products(name, sku),
      warehouses(name),
      shop_types(name),
      profiles:created_by(full_name, email)
      `
    )
    .eq("product_id", productId)
    .eq("warehouse_id", warehouseId)
    .eq("shop_type_id", shopTypeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching stock movement history:", error);
    throw new Error("Failed to fetch stock movement history");
  }

  return (data || []).map((m) => {
    const product = Array.isArray(m.products) ? m.products[0] : m.products;
    const warehouse = Array.isArray(m.warehouses)
      ? m.warehouses[0]
      : m.warehouses;
    const shopType = Array.isArray(m.shop_types)
      ? m.shop_types[0]
      : m.shop_types;
    const owner = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;

    return {
      id: m.id,
      type: m.type,
      sub_type: m.sub_type,
      quantity_delta: m.quantity_delta,
      created_at: m.created_at,
      notes: m.notes,
      product_name: product?.name ?? "Unknown product",
      product_sku: product?.sku ?? null,
      warehouse_name: warehouse?.name ?? "Unknown warehouse",
      shop_type_name: shopType?.name ?? "Unknown shop",
      owner_name: owner?.full_name ?? owner?.email ?? "Unknown",
    };
  });
}
