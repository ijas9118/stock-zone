import { cleanString } from "./helpers";
import {
  CsvRow,
  CsvRowSchema,
  NormalizedRow,
  ParsedAlternateUom,
} from "./types";

function parseAlternateUoms(
  raw: string | null | undefined,
  baseUomCode: string | null | undefined
): { data: ParsedAlternateUom[]; errors: string[] } {
  if (!raw || raw.trim() === "") return { data: [], errors: [] };

  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const results: ParsedAlternateUom[] = [];
  const errors: string[] = [];
  let purchaseDefaultCount = 0;
  let salesDefaultCount = 0;

  for (const entry of entries) {
    const parts = entry.split(":");
    if (parts.length < 2) {
      errors.push(
        `Invalid alternate UOM entry "${entry}": expected "UOM_CODE:FACTOR[:purchase][:sales]"`
      );
      continue;
    }

    const uom_code = parts[0].trim().toUpperCase();
    const factor = Number(parts[1].trim());

    if (isNaN(factor) || factor <= 0) {
      errors.push(
        `Invalid conversion factor for UOM "${uom_code}": must be a positive number`
      );
      continue;
    }

    if (baseUomCode && uom_code === baseUomCode.toUpperCase()) {
      errors.push(
        `Alternate UOM "${uom_code}" cannot be the same as the base UOM`
      );
      continue;
    }

    const flags = parts.slice(2).map((f) => f.trim().toLowerCase());
    const is_purchase_default = flags.includes("purchase");
    const is_sales_default = flags.includes("sales");

    if (is_purchase_default) purchaseDefaultCount++;
    if (is_sales_default) salesDefaultCount++;

    results.push({
      uom_code,
      conversion_factor: factor,
      is_purchase_default,
      is_sales_default,
    });
  }

  if (purchaseDefaultCount > 1)
    errors.push("At most one alternate UOM can be the purchase default");
  if (salesDefaultCount > 1)
    errors.push("At most one alternate UOM can be the sales default");

  return { data: results, errors };
}

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
    alternate_uoms: cleanString(row.alternate_uoms),
  };

  const parsed = CsvRowSchema.safeParse(cleanedRow);

  if (!parsed.success) {
    return {
      data: null,
      errors: parsed.error.errors.map((e) => e.message),
    };
  }

  const { data: parsedAlts, errors: altErrors } = parseAlternateUoms(
    cleanedRow.alternate_uoms,
    cleanedRow.uom_code
  );

  if (altErrors.length > 0) {
    return { data: null, errors: altErrors };
  }

  return {
    data: {
      ...parsed.data,
      _originalRowIndex: index,
      _parsedAlternateUoms: parsedAlts,
    },
    errors: [],
  };
}
