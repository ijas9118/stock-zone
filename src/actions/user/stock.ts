"use server";

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
      categories: { category_name: string } | null;
      subcategories: { subcategory_name: string } | null;
      units_of_measure: { full_name: string; uom_code: string } | null;
    } | null;
    warehouses: { name: string } | null;
    shop_types: { name: string } | null;
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
        units_of_measure(full_name, uom_code)
      ),
      warehouses(name),
      shop_types(name)
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
    supabaseQuery = supabaseQuery.or(
      `name.ilike.%${query}%,sku.ilike.%${query}%,brand.ilike.%${query}%`,
      { referencedTable: "products" }
    );
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

  return {
    stocks: data as unknown as UserStockWithDetails[],
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
