import { z } from "zod";

export interface BrandCsvRow {
  name: string;
}

export const BrandRowSchema = z.object({
  name: z.string().min(1, "name is required"),
});

export type ValidatedBrandRow = z.infer<typeof BrandRowSchema>;

export interface NormalizedBrandRow extends ValidatedBrandRow {
  _originalRowIndex: number;
}

export interface BrandImportResult {
  totalRows: number;
  inserted: number;
  skipped: number;
  failedRows: number;
  errors: { row: number; error: string }[];
}
