"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/server";

export async function setPassword(password: string) {
  try {
    const auth = await getAuthContext();

    if (!auth.isAuthenticated || !auth.userId) {
      throw new Error("Unauthorized");
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient.auth.admin.updateUserById(
      auth.userId,
      {
        password,
      }
    );

    if (error) {
      console.error("Error setting password:", error);
      throw new Error(error.message || "Failed to set password");
    }

    return { success: true, data };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
