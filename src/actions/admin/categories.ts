"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin")
    throw new Error("Forbidden: Admin access required");
}

/* -------------------------------------------------------------------------- */
/*                                 CATEGORIES                                 */
/* -------------------------------------------------------------------------- */

export async function getCategories(
  params: { query?: string; page?: number; pageSize?: number } = {}
) {
  await verifyAdmin();
  const { query, page = 1, pageSize = 8 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      let supabaseQuery = adminClient
        .from("categories")
        .select("*", { count: "exact" })
        .order("category_name", { ascending: true });

      if (query) {
        supabaseQuery = supabaseQuery.or(
          `category_name.ilike.%${query}%,cat_code.ilike.%${query}%`
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching categories:", error);
        throw new Error("Failed to fetch categories");
      }

      return {
        categories: data as Category[],
        totalCount: count || 0,
      };
    },
    ["admin-categories", query || "", String(page), String(pageSize)],
    {
      tags: ["admin:categories"],
      revalidate: 3600,
    }
  )();
}

export async function createCategory(data: {
  cat_code: string;
  category_name: string;
  description?: string;
}) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("categories").insert([
      {
        cat_code: data.cat_code,
        category_name: data.category_name,
        description: data.description || null,
      },
    ]);

    if (error) {
      console.error("Error creating category:", error);
      return { error: error.message };
    }

    revalidateTag("admin:categories", "default");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateCategory(
  id: string,
  data: {
    cat_code?: string;
    category_name?: string;
    description?: string;
  }
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("categories")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating category:", error);
      return { error: error.message };
    }

    revalidateTag("admin:categories", "default");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function deleteCategory(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting category:", error);
      return { error: error.message };
    }

    revalidateTag("admin:categories", "default");
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

/* -------------------------------------------------------------------------- */
/*                               SUBCATEGORIES                                */
/* -------------------------------------------------------------------------- */

export type SubcategoryWithCategory = Subcategory & {
  categories: { category_name: string } | null;
};

export async function getSubcategories(
  params: {
    query?: string;
    categoryId?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  await verifyAdmin();
  const { query, categoryId, page = 1, pageSize = 8 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      let supabaseQuery = adminClient
        .from("subcategories")
        .select("*, categories(category_name)", { count: "exact" })
        .order("subcategory_name", { ascending: true });

      if (query) {
        supabaseQuery = supabaseQuery.ilike("subcategory_name", `%${query}%`);
      }

      if (categoryId && categoryId !== "all") {
        supabaseQuery = supabaseQuery.eq("category_id", categoryId);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching subcategories:", error);
        throw new Error("Failed to fetch subcategories");
      }

      return {
        subcategories: data as SubcategoryWithCategory[],
        totalCount: count || 0,
      };
    },
    [
      "admin-subcategories",
      query || "",
      categoryId || "",
      String(page),
      String(pageSize),
    ],
    {
      tags: ["admin:subcategories"],
      revalidate: 3600,
    }
  )();
}

export async function createSubcategory(data: {
  category_id: string;
  subcategory_name: string;
  description?: string;
}) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("subcategories").insert([
      {
        category_id: data.category_id,
        subcategory_name: data.subcategory_name,
        description: data.description || null,
      },
    ]);

    if (error) {
      console.error("Error creating subcategory:", error);
      return { error: error.message };
    }

    revalidateTag("admin:subcategories", "default");
    revalidatePath("/admin/subcategories");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateSubcategory(
  id: string,
  data: {
    category_id?: string;
    subcategory_name?: string;
    description?: string;
  }
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("subcategories")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating subcategory:", error);
      return { error: error.message };
    }

    revalidateTag("admin:subcategories", "default");
    revalidatePath("/admin/subcategories");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function deleteSubcategory(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("subcategories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting subcategory:", error);
      return { error: error.message };
    }

    revalidateTag("admin:subcategories", "default");
    revalidatePath("/admin/subcategories");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
