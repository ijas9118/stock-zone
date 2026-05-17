"use server";

import { revalidateTag } from "next/cache";

import { processCsvImport } from "@/lib/imports/product-import";
import { ImportResult } from "@/lib/imports/product-import/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function importProductsAction(
  fileContent: string
): Promise<{ success: boolean; result?: ImportResult; error?: string }> {
  try {
    const supabase = await createClient();

    // Authorization check
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      return { success: false, error: "Only admins can import products" };
    }

    const adminSupabase = createAdminClient();
    const result = await processCsvImport(adminSupabase, fileContent);

    // Revalidate Next.js cache tags for admin dashboard pages
    try {
      revalidateTag("admin:products", "default");
      revalidateTag("admin:categories", "default");
      revalidateTag("admin:subcategories", "default");
      revalidateTag("admin:brands", "default");
      revalidateTag("admin:uom", "default");
      revalidateTag("admin:warehouses", "default");
      revalidateTag("admin:shops", "default");
      revalidateTag("admin:shop-types", "default");
      revalidateTag("admin:stocks", "default");
      revalidateTag("admin:stock-movements", "default");
      revalidateTag("admin:dashboard", "default");
    } catch (e) {
      console.warn("Failed to revalidate cache tags:", e);
    }

    return { success: true, result };
  } catch (error: unknown) {
    console.error("Import Action Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message || "An unexpected error occurred during import.",
    };
  }
}
