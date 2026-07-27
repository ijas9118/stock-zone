import { z } from "zod";

import { Database } from "@/lib/supabase/database.types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];
export type Brand = Database["public"]["Tables"]["brands"]["Row"];
export type UnitOfMeasure =
  Database["public"]["Tables"]["units_of_measure"]["Row"];
export type ShopType = Database["public"]["Tables"]["shop_types"]["Row"];
export type Warehouse = Database["public"]["Tables"]["warehouses"]["Row"];
export type Stock = Database["public"]["Tables"]["stock"]["Row"];

export interface CsvRow {
  product_name: string;
  sku: string;
  description: string;
  category_name: string;
  category_code: string;
  subcategory_name: string;
  brand_name: string;
  uom_code: string;
  uom_full_name: string;
  minimum_stock_quantity: string;
  initial_stock_quantity: string;
  shop_type_name: string;
  warehouse_name: string;
  alternate_uoms: string;
}

export const CsvRowSchema = z.object({
  product_name: z.string().min(1, "Product name is required"),
  sku: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category_name: z.string().nullable().optional(),
  category_code: z.string().nullable().optional(),
  subcategory_name: z.string().nullable().optional(),
  brand_name: z.string().nullable().optional(),
  uom_code: z.string().nullable().optional(),
  uom_full_name: z.string().nullable().optional(),
  minimum_stock_quantity: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  initial_stock_quantity: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? 0 : Number(val),
    z.number().min(0).default(0)
  ),
  shop_type_name: z.string().nullable().optional(),
  warehouse_name: z.string().nullable().optional(),
  alternate_uoms: z.string().nullable().optional(),
});

export type ValidatedRow = z.infer<typeof CsvRowSchema>;

export interface ParsedAlternateUom {
  uom_code: string;
  conversion_factor: number;
  is_purchase_default: boolean;
  is_sales_default: boolean;
}

export interface NormalizedRow extends ValidatedRow {
  _originalRowIndex: number;
  _parsedAlternateUoms: ParsedAlternateUom[];
}

export interface ImportResult {
  totalRows: number;
  insertedProducts: number;
  updatedProducts: number;
  insertedStockRows: number;
  skippedExistingStockRows: number;
  upsertedUomConversions: number;
  failedRows: number;
  errors: { row: number; error: string }[];
}

export interface LookupMaps {
  categories: Map<string, Category>; // key: category_name.toLowerCase()
  subcategories: Map<string, Subcategory>; // key: `${category_id}:${subcategory_name.toLowerCase()}`
  brands: Map<string, Brand>; // key: name.toLowerCase()
  uoms: Map<string, UnitOfMeasure>; // key: uom_code.toLowerCase()
  shopTypes: Map<string, ShopType>; // key: name.toLowerCase()
  warehouses: Map<string, Warehouse>; // key: name.toLowerCase()
  productsBySku: Map<string, Product>; // key: sku.toLowerCase()
  productsByName: Map<string, Product>; // key: name.toLowerCase()
}
