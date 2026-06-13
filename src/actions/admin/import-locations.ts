"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { processLocationImport } from "@/lib/imports/location-import";
import { LocationImportResult } from "@/lib/imports/location-import/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

export async function importLocationsAction(
  input: string | ArrayBuffer
): Promise<{
  success: boolean;
  result?: LocationImportResult;
  error?: string;
}> {
  try {
    const auth = await getAuthContext();
    if (!auth.isAuthenticated || auth.role !== "admin") {
      return { success: false, error: "Only admins can import locations" };
    }

    const adminClient = createAdminClient();
    const result = await processLocationImport(adminClient, input);

    revalidateTag("admin:locations", "default");
    revalidatePath("/admin/locations");

    return { success: true, result };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Unexpected error during import",
    };
  }
}
