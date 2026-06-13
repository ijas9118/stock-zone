"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { processBrandImport } from "@/lib/imports/brand-import";
import { BrandImportResult } from "@/lib/imports/brand-import/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

export async function importBrandsAction(input: string | ArrayBuffer): Promise<{
  success: boolean;
  result?: BrandImportResult;
  error?: string;
}> {
  try {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || auth.role !== "admin") {
      return { success: false, error: "Only admins can import brands" };
    }

    const adminClient = createAdminClient();
    const result = await processBrandImport(adminClient, input);

    revalidateTag("admin:brands", "default");
    revalidatePath("/admin/brands");

    return { success: true, result };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Unexpected error during import",
    };
  }
}
