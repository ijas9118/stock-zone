"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type Warehouse = Database["public"]["Tables"]["warehouses"]["Row"];

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin")
    throw new Error("Forbidden: Admin access required");
}

export async function getWarehouses(
  params: { query?: string; page?: number; pageSize?: number } = {}
) {
  await verifyAdmin();
  const { query, page = 1, pageSize = 10 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      let supabaseQuery = adminClient
        .from("warehouses")
        .select("*", { count: "exact" })
        .order("name", { ascending: true });

      if (query) {
        supabaseQuery = supabaseQuery.ilike("name", `%${query}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching warehouses:", error);
        throw new Error("Failed to fetch warehouses");
      }

      return {
        warehouses: data as Warehouse[],
        totalCount: count || 0,
      };
    },
    ["admin-warehouses", query || "", String(page), String(pageSize)],
    {
      tags: ["admin:warehouses"],
      revalidate: 3600,
    }
  )();
}

export async function createWarehouse(data: {
  name: string;
  location?: string;
  description?: string;
}) {
  try {
    await verifyAdmin();
    const auth = await getAuthContext();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("warehouses").insert([
      {
        name: data.name,
        location: data.location,
        description: data.description,
        created_by: auth.userId,
      },
    ]);

    if (error) {
      console.error("Error creating warehouse:", error);
      return { error: error.message };
    }

    revalidateTag("admin:warehouses", "default");
    revalidatePath("/admin/warehouses");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateWarehouse(
  id: string,
  data: {
    name?: string;
    location?: string;
    description?: string;
    is_active?: boolean;
  }
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("warehouses")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating warehouse:", error);
      return { error: error.message };
    }

    revalidateTag("admin:warehouses", "default");
    revalidatePath("/admin/warehouses");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function deleteWarehouse(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("warehouses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting warehouse:", error);
      return { error: error.message };
    }

    revalidateTag("admin:warehouses", "default");
    revalidatePath("/admin/warehouses");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
