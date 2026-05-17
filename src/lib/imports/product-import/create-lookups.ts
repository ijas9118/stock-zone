import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/lib/supabase/database.types";

import { normalizeKey } from "./helpers";
import { LookupMaps, NormalizedRow } from "./types";

export async function createMissingLookups(
  supabase: SupabaseClient<Database>,
  rows: NormalizedRow[],
  lookups: LookupMaps
): Promise<void> {
  const missingCategories = new Set<string>();
  const missingBrands = new Set<string>();
  const missingUoms = new Set<string>();
  const missingShopTypes = new Set<string>();
  const missingWarehouses = new Set<string>();
  // To handle subcategories, we need to know their category names as well.
  const missingSubcategories = new Map<
    string,
    { categoryName: string; subcategoryName: string }
  >();

  // 1. Identify missing simple entities
  rows.forEach((row) => {
    if (
      row.category_name &&
      !lookups.categories.has(normalizeKey(row.category_name))
    ) {
      missingCategories.add(row.category_name);
    }
    if (row.brand_name && !lookups.brands.has(normalizeKey(row.brand_name))) {
      missingBrands.add(row.brand_name);
    }
    if (row.uom_code && !lookups.uoms.has(normalizeKey(row.uom_code))) {
      missingUoms.add(row.uom_code);
    }
    if (
      row.shop_type_name &&
      !lookups.shopTypes.has(normalizeKey(row.shop_type_name))
    ) {
      missingShopTypes.add(row.shop_type_name);
    }
    if (
      row.warehouse_name &&
      !lookups.warehouses.has(normalizeKey(row.warehouse_name))
    ) {
      missingWarehouses.add(row.warehouse_name);
    }
  });

  // 2. Insert missing categories first (since subcategories depend on them)
  if (missingCategories.size > 0) {
    const categoriesToInsert = Array.from(missingCategories).map((name) => ({
      category_name: name,
      cat_code: normalizeKey(name).replace(/\s+/g, "_").toUpperCase(),
    }));

    const { data: newCats, error } = await supabase
      .from("categories")
      .insert(categoriesToInsert)
      .select();

    if (error) {
      // If code uniqueness fails, it might have been inserted concurrently or code clash
      console.error("Failed to insert missing categories:", error);
    } else if (newCats) {
      newCats.forEach((cat) => {
        lookups.categories.set(normalizeKey(cat.category_name), cat);
      });
    }
  }

  // 3. Now identify missing subcategories (can only do this if we have the category resolved)
  rows.forEach((row) => {
    if (row.category_name && row.subcategory_name) {
      const cat = lookups.categories.get(normalizeKey(row.category_name));
      if (cat) {
        const subcatKey = `${cat.id}:${normalizeKey(row.subcategory_name)}`;
        if (!lookups.subcategories.has(subcatKey)) {
          missingSubcategories.set(subcatKey, {
            categoryName: row.category_name,
            subcategoryName: row.subcategory_name,
          });
        }
      }
    }
  });

  if (missingSubcategories.size > 0) {
    const subcatsToInsert: Database["public"]["Tables"]["subcategories"]["Insert"][] =
      [];
    missingSubcategories.forEach((val) => {
      const cat = lookups.categories.get(normalizeKey(val.categoryName));
      if (cat) {
        subcatsToInsert.push({
          category_id: cat.id,
          subcategory_name: val.subcategoryName,
        });
      }
    });

    if (subcatsToInsert.length > 0) {
      const { data: newSubcats, error } = await supabase
        .from("subcategories")
        .insert(subcatsToInsert)
        .select();

      if (error) {
        console.error("Failed to insert missing subcategories:", error);
      } else if (newSubcats) {
        newSubcats.forEach((subcat) => {
          lookups.subcategories.set(
            `${subcat.category_id}:${normalizeKey(subcat.subcategory_name)}`,
            subcat
          );
        });
      }
    }
  }

  // 4. Insert other independent lookups
  if (missingBrands.size > 0) {
    const { data: newBrands, error } = await supabase
      .from("brands")
      .insert(Array.from(missingBrands).map((name) => ({ name })))
      .select();
    if (!error && newBrands) {
      newBrands.forEach((b) => lookups.brands.set(normalizeKey(b.name), b));
    }
  }

  if (missingUoms.size > 0) {
    const uomsToInsert = Array.from(missingUoms).map((code) => {
      // Find a row to get the full name
      const matchingRow = rows.find(
        (r) => normalizeKey(r.uom_code) === normalizeKey(code)
      );
      return {
        uom_code: code,
        full_name: matchingRow?.uom_full_name || code,
      };
    });
    const { data: newUoms, error } = await supabase
      .from("units_of_measure")
      .insert(uomsToInsert)
      .select();
    if (!error && newUoms) {
      newUoms.forEach((u) => lookups.uoms.set(normalizeKey(u.uom_code), u));
    }
  }

  if (missingShopTypes.size > 0) {
    const { data: newShopTypes, error } = await supabase
      .from("shop_types")
      .insert(
        Array.from(missingShopTypes).map((name) => ({ name, is_active: true }))
      )
      .select();
    if (!error && newShopTypes) {
      newShopTypes.forEach((s) =>
        lookups.shopTypes.set(normalizeKey(s.name), s)
      );
    }
  }

  if (missingWarehouses.size > 0) {
    const { data: newWarehouses, error } = await supabase
      .from("warehouses")
      .insert(
        Array.from(missingWarehouses).map((name) => ({ name, is_active: true }))
      )
      .select();
    if (!error && newWarehouses) {
      newWarehouses.forEach((w) =>
        lookups.warehouses.set(normalizeKey(w.name), w)
      );
    }
  }
}
