import { BrandCsvRow, BrandRowSchema, NormalizedBrandRow } from "./types";

export function validateRow(
  row: BrandCsvRow,
  index: number
): { data: NormalizedBrandRow | null; errors: string[] } {
  const cleaned = {
    name: (row.name || "").trim(),
  };

  const parsed = BrandRowSchema.safeParse(cleaned);
  if (!parsed.success) {
    return { data: null, errors: parsed.error.errors.map((e) => e.message) };
  }

  return {
    data: { ...parsed.data, _originalRowIndex: index },
    errors: [],
  };
}
