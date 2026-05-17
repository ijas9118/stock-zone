import { cleanString } from "./helpers";
import { CsvRow, CsvRowSchema, NormalizedRow } from "./types";

export function validateRow(
  row: CsvRow,
  index: number
): {
  data: NormalizedRow | null;
  errors: string[];
} {
  const cleanedRow = {
    product_name: cleanString(row.product_name) || "", // Required by zod
    sku: cleanString(row.sku),
    description: cleanString(row.description),
    category_name: cleanString(row.category_name),
    category_code: cleanString(row.category_code),
    subcategory_name: cleanString(row.subcategory_name),
    brand_name: cleanString(row.brand_name),
    uom_code: cleanString(row.uom_code),
    uom_full_name: cleanString(row.uom_full_name),
    minimum_stock_quantity: cleanString(row.minimum_stock_quantity),
    initial_stock_quantity: cleanString(row.initial_stock_quantity),
    shop_type_name: cleanString(row.shop_type_name),
    warehouse_name: cleanString(row.warehouse_name),
  };

  const parsed = CsvRowSchema.safeParse(cleanedRow);

  if (!parsed.success) {
    return {
      data: null,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }

  return {
    data: {
      ...parsed.data,
      _originalRowIndex: index,
    },
    errors: [],
  };
}
