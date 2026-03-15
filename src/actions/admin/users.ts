"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type ProfileWithShopType =
  Database["public"]["Tables"]["profiles"]["Row"] & {
    profile_shop_types: {
      access_level: Database["public"]["Enums"]["access_level"];
      shop_types: {
        id: string;
        name: string;
      } | null;
    }[];
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

export async function getUserById(userId: string) {
  await verifyAdmin();

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
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    throw new Error("Failed to fetch user");
  }

  return data as ProfileWithShopType;
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
  const { query, shopTypeId, page = 1, pageSize = 8 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();

      let supabaseQuery = adminClient
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
          // Users who have no entries in profile_shop_types
          supabaseQuery = supabaseQuery.is("profile_shop_types", null);
        } else {
          // Filter profiles that have at least one profile_shop_types entry with this shopTypeId
          supabaseQuery = supabaseQuery.eq(
            "profile_shop_types.shop_type_id",
            shopTypeId
          );
          supabaseQuery = supabaseQuery.not("profile_shop_types", "is", null);
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

export async function updateUserShopTypes(
  userId: string,
  shopTypes: {
    shopTypeId: string;
    accessLevel: Database["public"]["Enums"]["access_level"];
  }[]
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    // Start a transaction-like approach (delete then insert)
    // Supabase doesn't have multi-statement transactions in the JS client easily
    // without RPC, but we can do it sequentially and it's usually fine for admin actions.

    // 1. Delete existing shop types for this user
    const { error: deleteError } = await adminClient
      .from("profile_shop_types")
      .delete()
      .eq("profile_id", userId);

    if (deleteError) {
      console.error("Error deleting user shop types:", deleteError);
      return { error: deleteError.message };
    }

    // 2. Insert new shop types if any
    if (shopTypes.length > 0) {
      const { error: insertError } = await adminClient
        .from("profile_shop_types")
        .insert(
          shopTypes.map((st) => ({
            profile_id: userId,
            shop_type_id: st.shopTypeId,
            access_level: st.accessLevel,
          }))
        );

      if (insertError) {
        console.error("Error inserting user shop types:", insertError);
        return { error: insertError.message };
      }
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
export async function updateUserPermissions(
  userId: string,
  permissions: {
    perm_stock_read_all?: boolean;
    perm_stock_own_shop?: boolean;
    perm_add_products?: boolean;
    perm_do_transfer?: boolean;
    perm_do_adjustment?: boolean;
    perm_do_purchase?: boolean;
    perm_do_sale?: boolean;
    perm_do_return?: boolean;
  }
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("profiles")
      .update({ ...permissions, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user permissions:", error);
      return { error: error.message };
    }

    revalidateTag("admin:users", "default");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
