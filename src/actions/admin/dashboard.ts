"use server";

import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

// Helper to verify admin role
async function verifyAdmin() {
  const auth = await getAuthContext();

  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  const role = auth.role;

  if (role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }
}

export async function getDashboardStats() {
  await verifyAdmin();

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();

      const [
        { count: totalUsers },
        { count: pendingUsers },
        { count: activeUsers },
        { count: totalProducts },
        { count: totalWarehouses },
        { count: totalStockItems },
        { count: lowStockItems },
        { count: totalShops },
        { count: totalCategories },
        { data: recentMovements },
        { data: movementBreakdown },
        { data: topStockedProducts },
        { data: recentUsers },
        { data: movementsByDay },
      ] = await Promise.all([
        // 1. Total users
        adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true }),
        // 1b. Pending users
        adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        // 1c. Active users
        adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        // 2. Total products (active only)
        adminClient
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        // 3. Total warehouses (active only)
        adminClient
          .from("warehouses")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        // 4. Total stock records
        adminClient.from("stock").select("*", { count: "exact", head: true }),
        // 4b. Low stock items
        adminClient
          .from("stock")
          .select("*", { count: "exact", head: true })
          .lte("quantity", 10),
        // 5. Total shop types (active)
        adminClient
          .from("shop_types")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        // 6. Total categories
        adminClient
          .from("categories")
          .select("*", { count: "exact", head: true }),
        // 7. Recent stock movements
        adminClient
          .from("stock_movements")
          .select(
            `
            id, type, quantity_delta, created_at,
            products(name, sku),
            warehouses(name),
            shop_types(name),
            profiles:created_by(full_name, email)
          `
          )
          .order("created_at", { ascending: false })
          .limit(8),
        // 8. Movement type breakdown (last 30 days)
        (() => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return adminClient
            .from("stock_movements")
            .select("type")
            .gte("created_at", thirtyDaysAgo.toISOString());
        })(),
        // 9. Aggregated stock data
        adminClient
          .from("stock")
          .select(
            `
            quantity,
            products(name, sku),
            warehouses(name),
            shop_types(name)
          `
          )
          .order("quantity", { ascending: false })
          .limit(20),
        // 10. Recent users who joined (last 5)
        adminClient
          .from("profiles")
          .select("id, full_name, email, avatar_url, role, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        // 11. Movement volume by day — last 14 days
        (() => {
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
          return adminClient
            .from("stock_movements")
            .select("created_at, type, quantity_delta")
            .gte("created_at", fourteenDaysAgo.toISOString())
            .order("created_at", { ascending: true });
        })(),
      ]);

      // Process movement breakdown
      const movementCounts = {
        purchase: 0,
        sale: 0,
        adjustment: 0,
        transfer_in: 0,
        transfer_out: 0,
        return: 0,
        initial_stock: 0,
      };
      (movementBreakdown || []).forEach((m) => {
        if (m.type in movementCounts) {
          movementCounts[m.type as keyof typeof movementCounts]++;
        }
      });

      // Process movements by day (last 14 days)
      const dailySeries: {
        date: string;
        inbound: number;
        outbound: number;
        count: number;
      }[] = [];
      const today = new Date();

      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        const dayMovements = (movementsByDay || []).filter((m) => {
          const mDate = new Date(m.created_at);
          return mDate.toDateString() === d.toDateString();
        });

        let inbound = 0;
        let outbound = 0;

        dayMovements.forEach((m) => {
          if (m.quantity_delta > 0) {
            inbound += 1;
          } else if (m.quantity_delta < 0) {
            outbound += 1;
          }
        });

        dailySeries.push({
          date: dateStr,
          inbound,
          outbound,
          count: dayMovements.length,
        });
      }

      interface StockRawRow {
        quantity: number;
        products:
          | { name: string; sku: string | null }
          | { name: string; sku: string | null }[]
          | null;
        warehouses: { name: string } | { name: string }[] | null;
        shop_types: { name: string } | { name: string }[] | null;
      }

      // Aggregate stock by product_id — sum all quantities across locations
      const productAggregates = new Map<
        string,
        {
          name: string;
          sku: string | null;
          totalQuantity: number;
          locationCount: number;
          locations: Array<{
            warehouse: string;
            shop: string;
            quantity: number;
          }>;
        }
      >();

      ((topStockedProducts as unknown as StockRawRow[]) || []).forEach((s) => {
        const product = Array.isArray(s.products) ? s.products[0] : s.products;
        const warehouse = Array.isArray(s.warehouses)
          ? s.warehouses[0]
          : s.warehouses;
        const shop = Array.isArray(s.shop_types)
          ? s.shop_types[0]
          : s.shop_types;

        if (!product?.name) return;

        const key = product.name; // group by name since we don't have product_id in select

        if (productAggregates.has(key)) {
          const existing = productAggregates.get(key)!;
          existing.totalQuantity += s.quantity;
          existing.locationCount += 1;
          existing.locations.push({
            warehouse: warehouse?.name || "Unknown",
            shop: shop?.name || "Unknown",
            quantity: s.quantity,
          });
        } else {
          productAggregates.set(key, {
            name: product.name,
            sku: product.sku,
            totalQuantity: s.quantity,
            locationCount: 1,
            locations: [
              {
                warehouse: warehouse?.name || "Unknown",
                shop: shop?.name || "Unknown",
                quantity: s.quantity,
              },
            ],
          });
        }
      });

      // Sort by totalQuantity desc, take top 6
      const finalTopStockedProducts = Array.from(productAggregates.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 6);

      return {
        totalUsers: totalUsers || 0,
        pendingUsers: pendingUsers || 0,
        activeUsers: activeUsers || 0,
        totalProducts: totalProducts || 0,
        totalWarehouses: totalWarehouses || 0,
        totalStockItems: totalStockItems || 0,
        lowStockItems: lowStockItems || 0,
        totalShops: totalShops || 0,
        totalCategories: totalCategories || 0,
        recentMovements: (recentMovements || []).map((m) => ({
          ...m,
          products: Array.isArray(m.products) ? m.products[0] : m.products,
          warehouses: Array.isArray(m.warehouses)
            ? m.warehouses[0]
            : m.warehouses,
          shop_types: Array.isArray(m.shop_types)
            ? m.shop_types[0]
            : m.shop_types,
          profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
        })),
        movementCounts,
        topStockedProducts: finalTopStockedProducts,
        recentUsers: recentUsers || [],
        movementsByDay: dailySeries,
      };
    },
    ["admin:dashboard"],
    {
      tags: ["admin:dashboard"],
      revalidate: 300,
    }
  )();
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
