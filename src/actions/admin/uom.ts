"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type UnitOfMeasure =
  Database["public"]["Tables"]["units_of_measure"]["Row"];

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin")
    throw new Error("Forbidden: Admin access required");
}

export async function getUnitsOfMeasure(
  params: { query?: string; page?: number; pageSize?: number } = {}
) {
  await verifyAdmin();
  const { query, page = 1, pageSize = 10 } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      let supabaseQuery = adminClient
        .from("units_of_measure")
        .select("*", { count: "exact" })
        .order("full_name", { ascending: true });

      if (query) {
        supabaseQuery = supabaseQuery.or(
          `full_name.ilike.%${query}%,uom_code.ilike.%${query}%`
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabaseQuery.range(from, to);

      if (error) {
        console.error("Error fetching units of measure:", error);
        throw new Error("Failed to fetch units of measure");
      }

      return {
        unitsOfMeasure: data as UnitOfMeasure[],
        totalCount: count || 0,
      };
    },
    ["admin-uom", query || "", String(page), String(pageSize)],
    {
      tags: ["admin:uom"],
      revalidate: 3600,
    }
  )();
}

export async function createUnitOfMeasure(data: {
  uom_code: string;
  full_name: string;
  example?: string;
}) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("units_of_measure").insert([
      {
        uom_code: data.uom_code,
        full_name: data.full_name,
        example: data.example || null,
      },
    ]);

    if (error) {
      console.error("Error creating unit of measure:", error);
      return { error: error.message };
    }

    revalidateTag("admin:uom", "default");
    revalidatePath("/admin/uom");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateUnitOfMeasure(
  id: string,
  data: {
    uom_code?: string;
    full_name?: string;
    example?: string;
  }
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("units_of_measure")
      .update({
        ...data,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating unit of measure:", error);
      return { error: error.message };
    }

    revalidateTag("admin:uom", "default");
    revalidatePath("/admin/uom");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function deleteUnitOfMeasure(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("units_of_measure")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting unit of measure:", error);
      return { error: error.message };
    }

    revalidateTag("admin:uom", "default");
    revalidatePath("/admin/uom");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
