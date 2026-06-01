"use server";

import { revalidateTag, unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { Database } from "@/lib/supabase/database.types";
import { getAuthContext } from "@/lib/supabase/server";

export type ProductUomConversion =
  Database["public"]["Tables"]["product_uom_conversions"]["Row"];

export type ProductUomConversionWithUom = ProductUomConversion & {
  units_of_measure: { uom_code: string; full_name: string } | null;
};

export type UomOption = {
  id: string;
  uom_code: string;
  full_name: string;
  conversion_factor: number;
  is_base: boolean;
  is_purchase_default: boolean;
  is_sales_default: boolean;
};

async function verifyAdmin() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin")
    throw new Error("Forbidden: Admin access required");
}

export async function getProductUomConversions(productId: string) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");
  if (auth.role !== "admin")
    throw new Error("Forbidden: Admin access required");

  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from("product_uom_conversions")
        .select("*, units_of_measure(uom_code, full_name)")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

      if (error) throw new Error("Failed to fetch product UOM conversions");
      return data as ProductUomConversionWithUom[];
    },
    ["product-uom-conversions", productId],
    { tags: ["products:uom-conversions"], revalidate: 3600 }
  )();
}

/**
 * Returns base UOM + all alternate UOMs for a product as a unified option list.
 * Used by transaction dialogs to populate the UOM selector.
 */
export async function getProductUomOptions(productId: string): Promise<{
  baseUom: UomOption;
  allOptions: UomOption[];
}> {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated) throw new Error("Unauthorized");

  const adminClient = createAdminClient();

  const [
    { data: product, error: productError },
    { data: conversions, error: convError },
  ] = await Promise.all([
    adminClient
      .from("products")
      .select("uom, units_of_measure(id, uom_code, full_name)")
      .eq("id", productId)
      .single(),
    adminClient
      .from("product_uom_conversions")
      .select(
        "uom_id, conversion_factor, is_purchase_default, is_sales_default, units_of_measure(id, uom_code, full_name)"
      )
      .eq("product_id", productId)
      .order("created_at", { ascending: true }),
  ]);

  if (productError || !product) throw new Error("Product not found");
  if (convError) throw new Error("Failed to fetch UOM conversions");

  const baseUomRaw = product.units_of_measure as unknown as {
    id: string;
    uom_code: string;
    full_name: string;
  } | null;

  if (!baseUomRaw) throw new Error("Product has no base UOM configured");

  const baseUom: UomOption = {
    id: baseUomRaw.id,
    uom_code: baseUomRaw.uom_code,
    full_name: baseUomRaw.full_name,
    conversion_factor: 1,
    is_base: true,
    is_purchase_default: false,
    is_sales_default: false,
  };

  const alternateOptions: UomOption[] = (conversions || []).map((c) => {
    const uom = c.units_of_measure as unknown as {
      id: string;
      uom_code: string;
      full_name: string;
    };
    return {
      id: uom.id,
      uom_code: uom.uom_code,
      full_name: uom.full_name,
      conversion_factor: Number(c.conversion_factor),
      is_base: false,
      is_purchase_default: c.is_purchase_default,
      is_sales_default: c.is_sales_default,
    };
  });

  return {
    baseUom,
    allOptions: [baseUom, ...alternateOptions],
  };
}

export async function createProductUomConversion(data: {
  product_id: string;
  uom_id: string;
  conversion_factor: number;
  is_purchase_default?: boolean;
  is_sales_default?: boolean;
}) {
  try {
    await verifyAdmin();

    if (data.conversion_factor <= 0) {
      return { error: "Conversion factor must be greater than 0" };
    }

    const adminClient = createAdminClient();

    const { data: product, error: productError } = await adminClient
      .from("products")
      .select("uom")
      .eq("id", data.product_id)
      .single();

    if (productError || !product) return { error: "Product not found" };
    if (product.uom === data.uom_id) {
      return { error: "Alternate UOM cannot be the same as the base UOM" };
    }

    if (data.is_purchase_default) {
      const { error: clearError } = await adminClient
        .from("product_uom_conversions")
        .update({ is_purchase_default: false })
        .eq("product_id", data.product_id)
        .eq("is_purchase_default", true);
      if (clearError) return { error: clearError.message };
    }
    if (data.is_sales_default) {
      const { error: clearError } = await adminClient
        .from("product_uom_conversions")
        .update({ is_sales_default: false })
        .eq("product_id", data.product_id)
        .eq("is_sales_default", true);
      if (clearError) return { error: clearError.message };
    }

    const { error } = await adminClient.from("product_uom_conversions").insert({
      product_id: data.product_id,
      uom_id: data.uom_id,
      conversion_factor: data.conversion_factor,
      is_purchase_default: data.is_purchase_default ?? false,
      is_sales_default: data.is_sales_default ?? false,
    });

    if (error) {
      if (error.code === "23505")
        return { error: "This UOM is already configured for the product" };
      return { error: error.message };
    }

    revalidateTag("products:uom-conversions", "default");
    revalidateTag("admin:products", "default");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function updateProductUomConversion(
  id: string,
  data: {
    conversion_factor?: number;
    is_purchase_default?: boolean;
    is_sales_default?: boolean;
  }
) {
  try {
    await verifyAdmin();

    if (data.conversion_factor !== undefined && data.conversion_factor <= 0) {
      return { error: "Conversion factor must be greater than 0" };
    }

    const adminClient = createAdminClient();

    const { data: existing, error: fetchError } = await adminClient
      .from("product_uom_conversions")
      .select("product_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) return { error: "Conversion not found" };

    if (data.is_purchase_default) {
      const { error: clearError } = await adminClient
        .from("product_uom_conversions")
        .update({ is_purchase_default: false })
        .eq("product_id", existing.product_id)
        .eq("is_purchase_default", true);
      if (clearError) return { error: clearError.message };
    }
    if (data.is_sales_default) {
      const { error: clearError } = await adminClient
        .from("product_uom_conversions")
        .update({ is_sales_default: false })
        .eq("product_id", existing.product_id)
        .eq("is_sales_default", true);
      if (clearError) return { error: clearError.message };
    }

    const updatePayload: Record<string, unknown> = {};
    if (data.conversion_factor !== undefined)
      updatePayload.conversion_factor = data.conversion_factor;
    if (data.is_purchase_default !== undefined)
      updatePayload.is_purchase_default = data.is_purchase_default;
    if (data.is_sales_default !== undefined)
      updatePayload.is_sales_default = data.is_sales_default;

    const { error } = await adminClient
      .from("product_uom_conversions")
      .update(updatePayload)
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateTag("products:uom-conversions", "default");
    revalidateTag("admin:products", "default");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function deleteProductUomConversion(id: string) {
  try {
    await verifyAdmin();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("product_uom_conversions")
      .delete()
      .eq("id", id);

    if (error) return { error: error.message };

    revalidateTag("products:uom-conversions", "default");
    revalidateTag("admin:products", "default");
    return { success: true };
  } catch (err: unknown) {
    return {
      error: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}
