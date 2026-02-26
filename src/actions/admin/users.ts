"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type ProfileWithShopType =
  Database["public"]["Tables"]["profiles"]["Row"] & {
    shop_types: {
      name: string;
    } | null;
  };

// Helper to verify admin role
async function verifyAdmin() {
  const auth = await getAuthContext();

  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  const role = auth.role;

  if (role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }
}

export async function getUsers(
  params: {
    query?: string;
    shopTypeId?: string | null;
    page?: number;
    pageSize?: number;
  } = {}
) {
  await verifyAdmin();
  const { query, shopTypeId, page = 1, pageSize = 10 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();

      let supabaseQuery = adminClient
        .from("profiles")
        .select(
          `
          *,
          shop_types (
            name
          )
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (query) {
        supabaseQuery = supabaseQuery.or(
          `full_name.ilike.%${query}%,email.ilike.%${query}%`
        );
      }

      if (shopTypeId) {
        if (shopTypeId === "none") {
          supabaseQuery = supabaseQuery.is("shop_type_id", null);
        } else {
          supabaseQuery = supabaseQuery.eq("shop_type_id", shopTypeId);
        }
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users");
      }

      return {
        users: data as ProfileWithShopType[],
        totalCount: count || 0,
      };
    },
    [
      "admin-users",
      query || "",
      shopTypeId || "",
      String(page),
      String(pageSize),
    ],
    {
      tags: ["admin:users"],
      revalidate: 3600,
    }
  )();
}

export async function getShopTypes() {
  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();

      const { data, error } = await adminClient
        .from("shop_types")
        .select("id, name, is_active")
        .order("name");

      if (error) {
        console.error("Error fetching shop types:", error);
        throw new Error("Failed to fetch shop types");
      }

      return data;
    },
    ["shop-types"],
    {
      tags: ["admin:shop-types"],
    }
  )();
}

export async function updateUserStatus(
  userId: string,
  status: Database["public"]["Enums"]["account_status"]
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("profiles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user status:", error);
      return { error: error.message };
    }

    revalidateTag("admin:users", "default");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateUserRole(
  userId: string,
  role: Database["public"]["Enums"]["app_role"]
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user role:", error);
      return { error: error.message };
    }

    revalidateTag("admin:users", "default");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateUserShopType(
  userId: string,
  shopTypeId: string | null
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("profiles")
      .update({
        shop_type_id: shopTypeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user shop type:", error);
      return { error: error.message };
    }

    revalidateTag("admin:users", "default");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
