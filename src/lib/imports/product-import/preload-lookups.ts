import { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/lib/supabase/database.types";

import { normalizeKey } from "./helpers";
import { LookupMaps } from "./types";

export async function preloadLookups(
  supabase: SupabaseClient<Database>
): Promise<LookupMaps> {
  const lookups: LookupMaps = {
    categories: new Map(),
    subcategories: new Map(),
    brands: new Map(),
    uoms: new Map(),
    shopTypes: new Map(),
    warehouses: new Map(),
    productsBySku: new Map(),
    productsByName: new Map(),
  };

  // Preload all lookups in parallel
  const [
    { data: categories, error: catError },
    { data: subcategories, error: subcatError },
    { data: brands, error: brandError },
    { data: uoms, error: uomError },
    { data: shopTypes, error: shopError },
    { data: warehouses, error: whError },
    { data: products, error: prodError },
  ] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase.from("subcategories").select("*"),
    supabase.from("brands").select("*"),
    supabase.from("units_of_measure").select("*"),
    supabase.from("shop_types").select("*"),
    supabase.from("warehouses").select("*"),
    supabase.from("products").select("*"),
  ]);

  if (catError)
    throw new Error(`Failed to load categories: ${catError.message}`);
  if (subcatError)
    throw new Error(`Failed to load subcategories: ${subcatError.message}`);
  if (brandError)
    throw new Error(`Failed to load brands: ${brandError.message}`);
  if (uomError)
    throw new Error(`Failed to load units of measure: ${uomError.message}`);
  if (shopError)
    throw new Error(`Failed to load shop types: ${shopError.message}`);
  if (whError) throw new Error(`Failed to load warehouses: ${whError.message}`);
  if (prodError)
    throw new Error(`Failed to load products: ${prodError.message}`);

  categories.forEach((cat) => {
    if (cat.category_name) {
      lookups.categories.set(normalizeKey(cat.category_name), cat);
    }
  });

  subcategories.forEach((subcat) => {
    if (subcat.subcategory_name) {
      lookups.subcategories.set(
        `${subcat.category_id}:${normalizeKey(subcat.subcategory_name)}`,
        subcat
      );
    }
  });

  brands.forEach((brand) => {
    if (brand.name) {
      lookups.brands.set(normalizeKey(brand.name), brand);
    }
  });

  uoms.forEach((uom) => {
    if (uom.uom_code) {
      lookups.uoms.set(normalizeKey(uom.uom_code), uom);
    }
  });

  shopTypes.forEach((shopType) => {
    if (shopType.name) {
      lookups.shopTypes.set(normalizeKey(shopType.name), shopType);
    }
  });

  warehouses.forEach((wh) => {
    if (wh.name) {
      lookups.warehouses.set(normalizeKey(wh.name), wh);
    }
  });

  products.forEach((prod) => {
    if (prod.sku) {
      lookups.productsBySku.set(normalizeKey(prod.sku), prod);
    }
    if (prod.name) {
      lookups.productsByName.set(normalizeKey(prod.name), prod);
    }
  });

  return lookups;
}
