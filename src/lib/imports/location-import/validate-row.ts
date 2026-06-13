import {
  LocationCsvRow,
  LocationRowSchema,
  NormalizedLocationRow,
} from "./types";

function cleanStr(s: string | undefined | null): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  return t || undefined;
}

export function validateRow(
  row: LocationCsvRow,
  index: number
): { data: NormalizedLocationRow | null; errors: string[] } {
  const cleaned = {
    warehouse_name: (row.warehouse_name || "").trim(),
    zone: cleanStr(row.zone),
    aisle: cleanStr(row.aisle),
    rack: cleanStr(row.rack),
    bin: cleanStr(row.bin),
  };

  const parsed = LocationRowSchema.safeParse(cleaned);
  if (!parsed.success) {
    return { data: null, errors: parsed.error.errors.map((e) => e.message) };
  }

  return {
    data: { ...parsed.data, _originalRowIndex: index },
    errors: [],
  };
}
