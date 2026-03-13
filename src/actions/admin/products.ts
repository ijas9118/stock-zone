"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductWithDetails = Product & {
  categories: { category_name: string } | null;
  subcategories: { subcategory_name: string } | null;
  units_of_measure: { full_name: string; uom_code: string } | null;
  profiles: { full_name: string | null; email: string } | null;
};

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin")
    throw new Error("Forbidden: Admin access required");
  return auth.userId;
}

export async function getProducts(
  params: {
    query?: string;
    categoryId?: string;
    subCategoryId?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  const { query, categoryId, subCategoryId, page = 1, pageSize = 10 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      let supabaseQuery = adminClient
        .from("products")
        .select(
          `
          *,
          categories(category_name),
          subcategories(subcategory_name),
          units_of_measure(full_name, uom_code),
          profiles(full_name, email)
        `,
          { count: "exact" }
        )
        .order("name", { ascending: true });

      if (query) {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${query}%,sku.ilike.%${query}%,brand.ilike.%${query}%`
        );
      }

      if (categoryId && categoryId !== "all") {
        supabaseQuery = supabaseQuery.eq("category", categoryId);
      }

      if (subCategoryId && subCategoryId !== "all") {
        supabaseQuery = supabaseQuery.eq("sub_category", subCategoryId);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching products:", error);
        throw new Error("Failed to fetch products");
      }

      return {
        products: data as ProductWithDetails[],
        totalCount: count || 0,
      };
    },
    [
      "admin-products",
      query || "",
      categoryId || "",
      subCategoryId || "",
      String(page),
      String(pageSize),
    ],
    {
      tags: ["admin:products"],
      revalidate: 3600,
    }
  )();
}

export async function createProduct(data: {
  name: string;
  sku?: string;
  description?: string;
  brand?: string;
  category: string;
  sub_category?: string;
  uom: string;
  is_active?: boolean;
}) {
  try {
    const userId = await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("products").insert([
      {
        ...data,
        created_by: userId,
        sub_category: data.sub_category || null,
        description: data.description || null,
        sku: data.sku || null,
        brand: data.brand || null,
      },
    ]);

    if (error) {
      console.error("Error creating product:", error);
      return { error: error.message };
    }

    revalidateTag("admin:products", "default");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    sku?: string;
    description?: string;
    brand?: string;
    category?: string;
    sub_category?: string;
    uom?: string;
    is_active?: boolean;
  }
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("products")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating product:", error);
      return { error: error.message };
    }

    revalidateTag("admin:products", "default");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function deleteProduct(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("products").delete().eq("id", id);

    if (error) {
      console.error("Error deleting product:", error);
      return { error: error.message };
    }

    revalidateTag("admin:products", "default");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
