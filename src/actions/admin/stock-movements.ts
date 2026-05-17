"use server";

import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type StockMovementRow =
  Database["public"]["Tables"]["stock_movements"]["Row"];

export type StockMovementWithDetails = StockMovementRow & {
  products: {
    name: string;
    sku: string | null;
    brands?: { name: string } | null;
    description?: string | null;
  } | null;
  warehouses: { name: string; location?: string | null } | null;
  shop_types: { name: string } | null;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  } | null;
};

async function verifyAdmin() {
  const auth = await getAuthContext();

  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  const role = auth.role;

  if (role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }
}

export async function getStockMovements(
  params: {
    type?: string;
    warehouseId?: string;
    shopTypeId?: string;
    productQuery?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  await verifyAdmin();

  const {
    type,
    warehouseId,
    shopTypeId,
    productQuery,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 8,
  } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();

      let supabaseQuery = adminClient
        .from("stock_movements")
        .select(
          `
          *,
          products!inner(name, sku),
          warehouses(name),
          shop_types(name),
          profiles:created_by(full_name, email)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (productQuery) {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${productQuery}%,sku.ilike.%${productQuery}%`,
          { referencedTable: "products" }
        );
      }

      if (type && type !== "all") {
        supabaseQuery = supabaseQuery.eq("type", type);
      }

      if (warehouseId && warehouseId !== "all") {
        supabaseQuery = supabaseQuery.eq("warehouse_id", warehouseId);
      }

      if (shopTypeId && shopTypeId !== "all") {
        supabaseQuery = supabaseQuery.eq("shop_type_id", shopTypeId);
      }

      if (dateFrom) {
        supabaseQuery = supabaseQuery.gte("created_at", dateFrom);
      }

      if (dateTo) {
        supabaseQuery = supabaseQuery.lte("created_at", dateTo);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching stock movements:", error);
        throw new Error("Failed to fetch stock movements");
      }

      return {
        movements: data as unknown as StockMovementWithDetails[],
        totalCount: count || 0,
      };
    },
    [
      "admin-stock-movements",
      type || "all",
      warehouseId || "all",
      shopTypeId || "all",
      productQuery || "",
      dateFrom || "",
      dateTo || "",
      String(page),
      String(pageSize),
    ],
    {
      tags: ["admin:stock-movements"],
      revalidate: 60,
    }
  )();
}

export async function getStockMovementById(id: string) {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("stock_movements")
    .select(
      `
      *,
      products(name, sku, description, brands(name)),
      warehouses(name, location),
      shop_types(name),
      profiles:created_by(full_name, email, avatar_url)
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as StockMovementWithDetails;
}
