"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

async function verifyAdminOrManager() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin" && auth.role !== "manager") {
    throw new Error("Forbidden: Admin or manager access required");
  }
  return auth;
}

export interface DashboardShopType {
  id: string;
  name: string;
}

export interface DashboardAccess {
  shopTypes: DashboardShopType[];
}

// Admins see every shop type; managers only see shop types they're assigned to.
export async function getDashboardAccess(): Promise<DashboardAccess> {
  const auth = await verifyAdminOrManager();
  const adminClient = createAdminClient();

  if (auth.role === "admin") {
    const { data } = await adminClient
      .from("shop_types")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    return { shopTypes: data || [] };
  }

  if (!auth.userId) return { shopTypes: [] };

  const { data } = await adminClient
    .from("profile_shop_types")
    .select("shop_types(id, name)")
    .eq("profile_id", auth.userId);

  const shopTypes = (data || [])
    .map((row) =>
      Array.isArray(row.shop_types) ? row.shop_types[0] : row.shop_types
    )
    .filter((s): s is DashboardShopType => !!s);

  return { shopTypes };
}

export interface DashboardWarehouse {
  id: string;
  name: string;
}

// Warehouses are only inferable via which ones hold stock for a given shop type.
export async function getWarehousesForShopType(
  shopTypeId: string
): Promise<DashboardWarehouse[]> {
  await verifyAdminOrManager();
  const adminClient = createAdminClient();

  const { data } = await adminClient
    .from("stock")
    .select("warehouses(id, name)")
    .eq("shop_type_id", shopTypeId);

  const seen = new Map<string, DashboardWarehouse>();
  (data || []).forEach((row) => {
    const w = Array.isArray(row.warehouses)
      ? row.warehouses[0]
      : row.warehouses;
    if (w) seen.set(w.id, w);
  });

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

interface DashboardFilters {
  shopTypeId?: string;
  warehouseId?: string;
}

const MOVEMENT_DAYS = 30;

export async function getDashboardData(filters: DashboardFilters = {}) {
  await verifyAdminOrManager();
  const adminClient = createAdminClient();
  const { shopTypeId, warehouseId } = filters;

  const jubailShopTypeId = await getJubailShopTypeId(adminClient);
  const isJubailSelected = !!shopTypeId && shopTypeId === jubailShopTypeId;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - MOVEMENT_DAYS);
  periodStart.setHours(0, 0, 0, 0);

  const [
    { data: stockRows },
    { data: movementRows },
    { count: pendingTransfers },
    movers,
    { data: recentMovementRows },
  ] = await Promise.all([
    (() => {
      let q = adminClient
        .from("stock")
        .select("quantity, product_id, products!inner(minimum_stock_quantity)");
      if (shopTypeId) q = q.eq("shop_type_id", shopTypeId);
      if (warehouseId) q = q.eq("warehouse_id", warehouseId);
      return q;
    })(),
    (() => {
      let q = adminClient
        .from("stock_movements")
        .select("type, quantity_delta, created_at")
        .gte("created_at", periodStart.toISOString());
      if (shopTypeId) q = q.eq("shop_type_id", shopTypeId);
      if (warehouseId) q = q.eq("warehouse_id", warehouseId);
      return q;
    })(),
    (() => {
      let q = adminClient
        .from("stock_transfers")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (shopTypeId) q = q.eq("shop_type_id", shopTypeId);
      if (warehouseId) q = q.eq("source_warehouse_id", warehouseId);
      return q;
    })(),
    getMoversAndCategory(adminClient, {
      shopTypeId,
      warehouseId,
      includeCategory: isJubailSelected,
    }),
    (() => {
      let q = adminClient
        .from("stock_movements")
        .select(
          "id, type, quantity_delta, created_at, products(name, sku), warehouses(name), profiles:created_by(full_name, email)"
        )
        .order("created_at", { ascending: false })
        .limit(8);
      if (shopTypeId) q = q.eq("shop_type_id", shopTypeId);
      if (warehouseId) q = q.eq("warehouse_id", warehouseId);
      return q;
    })(),
  ]);

  // KPIs
  let lowStockCount = 0;
  let totalStockUnits = 0;
  let healthy = 0;
  let low = 0;
  let outOfStock = 0;

  (stockRows || []).forEach((row) => {
    const product = Array.isArray(row.products)
      ? row.products[0]
      : row.products;
    const minQty = product?.minimum_stock_quantity ?? 10;
    totalStockUnits += row.quantity;
    if (row.quantity <= 0) outOfStock++;
    else if (row.quantity <= minQty) low++;
    else healthy++;
    if (row.quantity <= minQty) lowStockCount++;
  });

  const movementsToday = (movementRows || []).filter(
    (m) => new Date(m.created_at) >= startOfToday
  ).length;

  // Movement type donut (IN / OUT / Transfer / Adjustment) over the period
  const movementTypeSplit = { in: 0, out: 0, transfer: 0, adjustment: 0 };
  (movementRows || []).forEach((m) => {
    if (m.type === "in") movementTypeSplit.in++;
    else if (m.type === "out") movementTypeSplit.out++;
    else if (m.type === "transfer_in" || m.type === "transfer_out")
      movementTypeSplit.transfer++;
    else if (m.type === "adjustment") movementTypeSplit.adjustment++;
  });

  // Movement volume trend — actual quantity in vs out per day, last 30 days
  const volumeByDay = new Map<string, { inbound: number; outbound: number }>();
  for (let i = MOVEMENT_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    volumeByDay.set(key, { inbound: 0, outbound: 0 });
  }
  (movementRows || []).forEach((m) => {
    const key = new Date(m.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const bucket = volumeByDay.get(key);
    if (!bucket) return;
    const qty = Math.abs(m.quantity_delta);
    if (m.quantity_delta > 0) bucket.inbound += qty;
    else if (m.quantity_delta < 0) bucket.outbound += qty;
  });
  const movementVolumeTrend = Array.from(volumeByDay.entries()).map(
    ([date, v]) => ({ date, ...v })
  );

  const recentMovements = (recentMovementRows || []).map((m) => {
    const product = Array.isArray(m.products) ? m.products[0] : m.products;
    const warehouse = Array.isArray(m.warehouses)
      ? m.warehouses[0]
      : m.warehouses;
    const createdBy = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;

    return {
      id: m.id,
      type: m.type,
      quantityDelta: m.quantity_delta,
      createdAt: m.created_at,
      productName: product?.name ?? "Unknown product",
      productSku: product?.sku ?? null,
      warehouseName: warehouse?.name ?? "Unknown warehouse",
      userName: createdBy?.full_name ?? createdBy?.email ?? "Unknown user",
    };
  });

  return {
    kpis: {
      totalStockUnits,
      lowStockCount,
      outOfStock,
      movementsToday,
      pendingTransfers: pendingTransfers || 0,
    },
    stockHealth: { healthy, low, outOfStock },
    movementTypeSplit,
    movementVolumeTrend,
    fastMovers: movers.fastMovers,
    slowMovers: movers.slowMovers,
    recentMovements,
    jubail: isJubailSelected
      ? {
          available: true as const,
          categoryDistribution: movers.categoryDistribution,
          categoryTable: movers.categoryTable,
        }
      : {
          available: false as const,
          categoryDistribution: [],
          categoryTable: [],
        },
  };
}

async function getJubailShopTypeId(
  adminClient: ReturnType<typeof createAdminClient>
) {
  const { data } = await adminClient
    .from("shop_types")
    .select("id")
    .ilike("name", "%jubail%")
    .maybeSingle();
  return data?.id ?? null;
}

interface MoversAndCategoryParams {
  shopTypeId?: string;
  warehouseId?: string;
  includeCategory?: boolean;
}

async function getMoversAndCategory(
  adminClient: ReturnType<typeof createAdminClient>,
  { shopTypeId, warehouseId, includeCategory = false }: MoversAndCategoryParams
) {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - MOVEMENT_DAYS);

  const productSelect = includeCategory
    ? "name, sku, minimum_stock_quantity, category, categories(category_name)"
    : "name, sku, minimum_stock_quantity";

  let stockQuery = adminClient
    .from("stock")
    .select(`quantity, product_id, products!inner(${productSelect})`);
  if (shopTypeId) stockQuery = stockQuery.eq("shop_type_id", shopTypeId);
  if (warehouseId) stockQuery = stockQuery.eq("warehouse_id", warehouseId);

  let movementQuery = adminClient
    .from("stock_movements")
    .select("product_id, quantity_delta, products!inner(name, sku)")
    .eq("type", "out")
    .gte("created_at", periodStart.toISOString());
  if (shopTypeId) movementQuery = movementQuery.eq("shop_type_id", shopTypeId);
  if (warehouseId)
    movementQuery = movementQuery.eq("warehouse_id", warehouseId);

  const [{ data: stockRows }, { data: outMovements }] = await Promise.all([
    stockQuery,
    movementQuery,
  ]);

  type ProductJoin = {
    name: string;
    sku: string | null;
    minimum_stock_quantity?: number;
    category?: string | null;
    categories?: { category_name: string } | { category_name: string }[] | null;
  };

  const outByProduct = new Map<
    string,
    { name: string; sku: string | null; outQty: number }
  >();
  (outMovements || []).forEach((m) => {
    const product = Array.isArray(m.products) ? m.products[0] : m.products;
    if (!product) return;
    const existing = outByProduct.get(m.product_id) ?? {
      name: product.name,
      sku: product.sku,
      outQty: 0,
    };
    existing.outQty += Math.abs(m.quantity_delta);
    outByProduct.set(m.product_id, existing);
  });

  const movers = Array.from(outByProduct.values()).sort(
    (a, b) => b.outQty - a.outQty
  );
  const fastMovers = movers.slice(0, 5);

  const stockedProducts = new Map<
    string,
    { name: string; sku: string | null; outQty: number }
  >();
  const categoryMap = new Map<
    string,
    { category: string; quantity: number; lowStockCount: number }
  >();

  (stockRows || []).forEach((row) => {
    const product = (
      Array.isArray(row.products) ? row.products[0] : row.products
    ) as ProductJoin | null;
    if (!product) return;

    if (!stockedProducts.has(row.product_id)) {
      stockedProducts.set(row.product_id, {
        name: product.name,
        sku: product.sku,
        outQty: outByProduct.get(row.product_id)?.outQty ?? 0,
      });
    }

    if (includeCategory) {
      const category = Array.isArray(product.categories)
        ? product.categories[0]
        : product.categories;
      const categoryName = category?.category_name ?? "Uncategorized";
      const minQty = product.minimum_stock_quantity ?? 10;

      const existing = categoryMap.get(categoryName) ?? {
        category: categoryName,
        quantity: 0,
        lowStockCount: 0,
      };
      existing.quantity += row.quantity;
      if (row.quantity <= minQty) existing.lowStockCount++;
      categoryMap.set(categoryName, existing);
    }
  });

  const slowMovers = Array.from(stockedProducts.values())
    .sort((a, b) => a.outQty - b.outQty)
    .slice(0, 5);

  const categoryTable = Array.from(categoryMap.values()).sort(
    (a, b) => b.quantity - a.quantity
  );
  const categoryDistribution = categoryTable.map((c) => ({
    name: c.category,
    value: c.quantity,
  }));

  return {
    available: true as const,
    fastMovers,
    slowMovers,
    categoryDistribution,
    categoryTable,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
