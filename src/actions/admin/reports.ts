"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin") throw new Error("Forbidden: Admin access required");
}

export async function getStockSummaryReport() {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("stock")
    .select(
      "quantity, products!inner(name, sku, minimum_stock_quantity, categories(category_name)), warehouses(name), shop_types(name)"
    )
    .order("quantity", { ascending: false });

  if (error) throw new Error("Failed to fetch stock summary report");

  return (data || []).map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const category = Array.isArray(product?.categories)
      ? product?.categories[0]
      : product?.categories;
    const warehouse = Array.isArray(row.warehouses)
      ? row.warehouses[0]
      : row.warehouses;
    const shopType = Array.isArray(row.shop_types)
      ? row.shop_types[0]
      : row.shop_types;

    return {
      "Product Name": product?.name ?? "",
      SKU: product?.sku ?? "",
      Category: category?.category_name ?? "Uncategorized",
      "Shop Type": shopType?.name ?? "",
      Warehouse: warehouse?.name ?? "",
      Quantity: row.quantity,
      "Minimum Stock": product?.minimum_stock_quantity ?? "",
    };
  });
}

export async function getLowStockReport() {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("stock")
    .select(
      "quantity, products!inner(name, sku, minimum_stock_quantity, categories(category_name)), warehouses(name), shop_types(name)"
    );

  if (error) throw new Error("Failed to fetch low stock report");

  return (data || [])
    .filter((row) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      const minQty = product?.minimum_stock_quantity ?? 10;
      return row.quantity <= minQty;
    })
    .map((row) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      const category = Array.isArray(product?.categories)
        ? product?.categories[0]
        : product?.categories;
      const warehouse = Array.isArray(row.warehouses)
        ? row.warehouses[0]
        : row.warehouses;
      const shopType = Array.isArray(row.shop_types)
        ? row.shop_types[0]
        : row.shop_types;
      const minQty = product?.minimum_stock_quantity ?? 10;

      return {
        "Product Name": product?.name ?? "",
        SKU: product?.sku ?? "",
        Category: category?.category_name ?? "Uncategorized",
        "Shop Type": shopType?.name ?? "",
        Warehouse: warehouse?.name ?? "",
        "Current Quantity": row.quantity,
        "Minimum Stock": minQty,
        "Suggested Reorder Qty": Math.max(minQty - row.quantity, 0),
      };
    });
}

export async function getStockMovementsReport(params: {
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  await verifyAdmin();
  const adminClient = createAdminClient();

  const dateFrom =
    params.dateFrom ??
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    })();

  let query = adminClient
    .from("stock_movements")
    .select(
      "created_at, type, quantity_delta, products!inner(name, sku), warehouses(name), shop_types(name), profiles:created_by(full_name, email)"
    )
    .gte("created_at", dateFrom)
    .order("created_at", { ascending: false });

  if (params.dateTo) query = query.lte("created_at", params.dateTo);

  const { data, error } = await query;
  if (error) throw new Error("Failed to fetch stock movements report");

  return (data || []).map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    const warehouse = Array.isArray(row.warehouses)
      ? row.warehouses[0]
      : row.warehouses;
    const shopType = Array.isArray(row.shop_types)
      ? row.shop_types[0]
      : row.shop_types;
    const createdBy = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;

    return {
      Date: new Date(row.created_at).toLocaleString(),
      Type: row.type,
      "Product Name": product?.name ?? "",
      SKU: product?.sku ?? "",
      "Shop Type": shopType?.name ?? "",
      Warehouse: warehouse?.name ?? "",
      "Quantity Change": row.quantity_delta,
      "Created By": createdBy?.full_name ?? createdBy?.email ?? "",
    };
  });
}
