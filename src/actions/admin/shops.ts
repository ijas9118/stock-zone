"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type ShopType = Database["public"]["Tables"]["shop_types"]["Row"];

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin")
    throw new Error("Forbidden: Admin access required");
}

export async function getShops(
  params: { query?: string; page?: number; pageSize?: number } = {}
) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  const { query, page = 1, pageSize = 8 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      let supabaseQuery = adminClient
        .from("shop_types")
        .select("*", { count: "exact" })
        .order("name", { ascending: true });

      if (query) {
        supabaseQuery = supabaseQuery.ilike("name", `%${query}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching shops:", error);
        throw new Error("Failed to fetch shops");
      }

      return {
        shops: data as ShopType[],
        totalCount: count || 0,
      };
    },
    ["admin-shops", query || "", String(page), String(pageSize)],
    {
      tags: ["admin:shops"],
      revalidate: 3600,
    }
  )();
}

export async function createShop(data: { name: string; description?: string }) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("shop_types").insert([
      {
        name: data.name,
        description: data.description,
      },
    ]);

    if (error) {
      console.error("Error creating shop:", error);
      return { error: error.message };
    }

    revalidateTag("admin:shops", "default");
    revalidateTag("admin:shop-types", "default");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateShop(
  id: string,
  data: { name?: string; description?: string; is_active?: boolean }
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("shop_types")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating shop:", error);
      return { error: error.message };
    }

    revalidateTag("admin:shops", "default");
    revalidateTag("admin:shop-types", "default");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function deleteShop(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    // Instead of hard delete, we could toggle is_active, but if user wants CRUD delete:
    const { error } = await adminClient
      .from("shop_types")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting shop:", error);
      return { error: error.message };
    }

    revalidateTag("admin:shops", "default");
    revalidateTag("admin:shop-types", "default");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
