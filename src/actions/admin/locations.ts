"use server";

import { revalidateTag, revalidatePath, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type LocationRow = Database["public"]["Tables"]["locations"]["Row"];
export type LocationWithWarehouse = LocationRow & {
  warehouses: { name: string } | null;
};

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || auth.role !== "admin")
    throw new Error("Unauthorized");
  return auth.userId!;
}

export function buildLocationCode(
  zone?: string | null,
  aisle?: string | null,
  rack?: string | null,
  bin?: string | null
): string {
  const parts = [zone, aisle, rack, bin].filter((p) => p && p.trim());
  return parts.length > 0 ? parts.join("-") : "—";
}

export async function getLocations(
  params: {
    warehouseId?: string;
    page?: number;
    pageSize?: number;
    includeInactive?: boolean;
  } = {}
) {
  await verifyAdmin();
  const {
    warehouseId,
    page = 1,
    pageSize = 50,
    includeInactive = false,
  } = params;

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      let query = adminClient
        .from("locations")
        .select("*, warehouses(name)", { count: "exact" })
        .order("location_code", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      if (warehouseId) {
        query = query.eq("warehouse_id", warehouseId);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw new Error("Failed to fetch locations");
      return {
        locations: data as LocationWithWarehouse[],
        totalCount: count || 0,
      };
    },
    [
      "admin-locations",
      warehouseId || "",
      String(page),
      String(pageSize),
      String(includeInactive),
    ],
    { tags: ["admin:locations"], revalidate: 300 }
  )();
}

export async function createLocation(data: {
  warehouse_id: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  bin?: string;
}) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const location_code = buildLocationCode(
      data.zone,
      data.aisle,
      data.rack,
      data.bin
    );

    const { error } = await adminClient.from("locations").insert({
      warehouse_id: data.warehouse_id,
      zone: data.zone || null,
      aisle: data.aisle || null,
      rack: data.rack || null,
      bin: data.bin || null,
      location_code,
    });

    if (error) {
      if (error.code === "23505") {
        return {
          error:
            "A location with these coordinates already exists in this warehouse.",
        };
      }
      console.error("Error creating location:", error);
      return { error: error.message };
    }

    revalidateTag("admin:locations", "default");
    revalidatePath("/admin/locations");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateLocation(
  id: string,
  data: {
    warehouse_id: string;
    zone?: string;
    aisle?: string;
    rack?: string;
    bin?: string;
    is_active?: boolean;
  }
) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const location_code = buildLocationCode(
      data.zone,
      data.aisle,
      data.rack,
      data.bin
    );

    const { error } = await adminClient
      .from("locations")
      .update({
        warehouse_id: data.warehouse_id,
        zone: data.zone || null,
        aisle: data.aisle || null,
        rack: data.rack || null,
        bin: data.bin || null,
        location_code,
        is_active: data.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      if (error.code === "23505") {
        return {
          error:
            "A location with these coordinates already exists in this warehouse.",
        };
      }
      console.error("Error updating location:", error);
      return { error: error.message };
    }

    revalidateTag("admin:locations", "default");
    revalidatePath("/admin/locations");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function deleteLocation(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("locations").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return {
          error:
            "Cannot delete: this location is referenced by existing stock records.",
        };
      }
      console.error("Error deleting location:", error);
      return { error: error.message };
    }

    revalidateTag("admin:locations", "default");
    revalidatePath("/admin/locations");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
