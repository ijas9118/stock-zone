"use server";

import { splitSearchWords } from "@/lib/search";
import {
  getLocationsForStockIds,
  StockLocationOption,
} from "@/lib/stock-locations";
import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type UserStockWithDetails =
  Database["public"]["Tables"]["stock"]["Row"] & {
    products: {
      id: string;
      name: string;
      sku: string | null;
      category: string | null;
      sub_category: string | null;
      minimum_stock_quantity: number;
      categories: { category_name: string } | null;
      subcategories: { subcategory_name: string } | null;
      units_of_measure: { full_name: string; uom_code: string } | null;
      brands: { name: string } | null;
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

export async function getUserStocks(
  params: {
    shopTypeId?: string;
    warehouseId?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");

  const { shopTypeId, warehouseId, query, page = 1, pageSize = 10 } = params;

  const userId = auth.userId;
  if (!userId) throw new Error("Unauthorized");

  const adminClient = createAdminClient();

  const [{ data: profile }, { data: assignedShops }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("perm_stock_read_all")
      .eq("id", userId)
      .single(),
    adminClient
      .from("profile_shop_types")
      .select("shop_type_id")
      .eq("profile_id", userId),
  ]);

  const assignedShopIds = (assignedShops || [])
    .map((s) => s.shop_type_id)
    .filter(Boolean) as string[];

  let supabaseQuery = adminClient.from("stock").select(
    `
    id,
    product_id,
    quantity,
    shop_type_id,
    warehouse_id,
    updated_at,
    location_id,
    products!inner(
      id,
      name,
      sku,
      category,
      sub_category,
      minimum_stock_quantity,
      categories(category_name),
      subcategories(subcategory_name),
      units_of_measure(full_name, uom_code),
      brands(name),
      product_uom_conversions(conversion_factor, units_of_measure(uom_code, full_name))
    ),
    warehouses(name),
    shop_types(name),
    locations(id, location_code, zone, rack, level, slot)
    `,
    { count: "exact" }
  );

  if (shopTypeId && shopTypeId !== "all") {
    if (
      !profile?.perm_stock_read_all &&
      !assignedShopIds.includes(shopTypeId)
    ) {
      return { stocks: [], totalCount: 0 };
    }
    supabaseQuery = supabaseQuery.eq("shop_type_id", shopTypeId);
  } else if (!profile?.perm_stock_read_all) {
    if (assignedShopIds.length === 0) {
      return { stocks: [], totalCount: 0 };
    }
    supabaseQuery = supabaseQuery.in("shop_type_id", assignedShopIds);
  }

  if (warehouseId && warehouseId !== "all") {
    supabaseQuery = supabaseQuery.eq("warehouse_id", warehouseId);
  }

  if (query) {
    splitSearchWords(query).forEach((word) => {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${word}%,sku.ilike.%${word}%`,
        { referencedTable: "products" }
      );
    });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseQuery
    .range(from, to)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching user stocks:", error);
    throw new Error("Failed to fetch inventory");
  }

  const stocks = data as unknown as UserStockWithDetails[];

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
}

export async function getMyProfile() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) throw new Error("Unauthorized");

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select(
      `
      *,
      profile_shop_types (
        access_level,
        shop_types (
          id,
          name
        )
      )
    `
    )
    .eq("id", auth.userId)
    .single();

  if (error) {
    console.error("Error fetching my profile:", error);
    throw new Error("Failed to fetch profile");
  }

  return data;
}

export async function getMyAssignedShops() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) throw new Error("Unauthorized");

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profile_shop_types")
    .select(
      `
      access_level,
      shop_types (
        id,
        name
      )
    `
    )
    .eq("profile_id", auth.userId);

  if (error) {
    console.error("Error fetching assigned shops:", error);
    throw new Error("Failed to fetch assigned shops");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[])
    .map((st) => {
      const shopType = Array.isArray(st.shop_types)
        ? st.shop_types[0]
        : st.shop_types;
      return {
        id: shopType?.id,
        name: shopType?.name,
        accessLevel: st.access_level,
      };
    })
    .filter((s) => s.id && s.name);
}

export async function getUserStockById(stockId: string) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("stock")
    .select(
      `
      *,
      products(
        id,
        name,
        sku,
        category,
        sub_category,
        minimum_stock_quantity,
        categories(category_name),
        subcategories(subcategory_name),
        units_of_measure(full_name, uom_code),
        brands(name),
        product_uom_conversions(conversion_factor, units_of_measure(uom_code, full_name))
      ),
      warehouses(name, id),
      shop_types(name, id),
      locations(id, location_code, zone, rack, level, slot)
    `
    )
    .eq("id", stockId)
    .single();

  if (error) {
    console.error("Error fetching user stock by id:", error);
    return null;
  }

  const stock = data as unknown as UserStockWithDetails;
  const locationsByStockId = await getLocationsForStockIds(adminClient, [
    stock.id,
  ]);
  stock.all_locations = locationsByStockId.get(stock.id) ?? [];

  return stock;
}

export type PendingTransfer = {
  id: string;
  product_id: string;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  quantity: number;
  notes: string | null;
  transferred_at: string;
  source_warehouse: { name: string } | null;
  dest_warehouse: { name: string } | null;
};

export async function getPendingTransfers(
  productId: string,
  warehouseId: string,
  shopTypeId: string
): Promise<PendingTransfer[]> {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("stock_transfers")
    .select(
      `
      id,
      product_id,
      source_warehouse_id,
      dest_warehouse_id,
      quantity,
      notes,
      transferred_at,
      source_warehouse:warehouses!stock_transfers_source_warehouse_id_fkey(name),
      dest_warehouse:warehouses!stock_transfers_dest_warehouse_id_fkey(name)
      `
    )
    .eq("product_id", productId)
    .eq("shop_type_id", shopTypeId)
    .or(
      `source_warehouse_id.eq.${warehouseId},dest_warehouse_id.eq.${warehouseId}`
    )
    .eq("status", "pending")
    .order("transferred_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending transfers:", error);
    return [];
  }

  return data as unknown as PendingTransfer[];
}
