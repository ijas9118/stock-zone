"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type Brand = Database["public"]["Tables"]["brands"]["Row"];

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin")
    throw new Error("Forbidden: Admin access required");
}

/* -------------------------------------------------------------------------- */
/*                                   BRANDS                                   */
/* -------------------------------------------------------------------------- */

// Retrieve active brands (for product edit dropdowns, etc)
export async function getBrands(
  params: {
    pageSize?: number;
  } = {}
) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  const { pageSize = 100 } = params;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(pageSize);

  if (error) {
    console.error("Error fetching brands:", error);
    throw new Error("Failed to fetch brands");
  }

  return {
    brands: data as Brand[],
  };
}

// Paginated and queryable retrieval of brands for the admin table UI
export async function getBrandsPage(
  params: { query?: string; page?: number; pageSize?: number } = {}
) {
  await verifyAdmin();
  const { query, page = 1, pageSize = 8 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      let supabaseQuery = adminClient
        .from("brands")
        .select("*", { count: "exact" })
        .order("name", { ascending: true });

      if (query) {
        supabaseQuery = supabaseQuery.ilike("name", `%${query}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching brands page:", error);
        throw new Error("Failed to fetch brands");
      }

      return {
        brands: data as Brand[],
        totalCount: count || 0,
      };
    },
    ["admin-brands-page", query || "", String(page), String(pageSize)],
    {
      tags: ["admin:brands"],
      revalidate: 3600,
    }
  )();
}

export async function createBrand(data: { name: string; is_active?: boolean }) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("brands").insert([
      {
        name: data.name,
        is_active: data.is_active ?? true,
      },
    ]);

    if (error) {
      console.error("Error creating brand:", error);
      return { error: error.message };
    }

    revalidateTag("admin:brands", "default");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateBrand(
  id: string,
  data: {
    name?: string;
    is_active?: boolean;
  }
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("brands")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating brand:", error);
      return { error: error.message };
    }

    revalidateTag("admin:brands", "default");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function deleteBrand(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("brands").delete().eq("id", id);

    if (error) {
      console.error("Error deleting brand:", error);
      return { error: error.message };
    }

    revalidateTag("admin:brands", "default");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
