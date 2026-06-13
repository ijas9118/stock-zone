import { z } from "zod";

export interface LocationCsvRow {
  warehouse_name: string;
  zone: string;
  rack: string;
  level: string;
  slot: string;
}

export const LocationRowSchema = z
  .object({
    warehouse_name: z.string().min(1, "warehouse_name is required"),
    zone: z.string().optional(),
    rack: z.string().optional(),
    level: z.string().optional(),
    slot: z.string().optional(),
  })
  .refine((d) => d.zone || d.rack || d.level || d.slot, {
    message: "At least one of zone, rack, level, or slot must be non-empty",
    path: ["zone"],
  });

export type ValidatedLocationRow = z.infer<typeof LocationRowSchema>;

export interface NormalizedLocationRow extends ValidatedLocationRow {
  _originalRowIndex: number;
}

export interface LocationImportResult {
  totalRows: number;
  inserted: number;
  skipped: number;
  failedRows: number;
  errors: { row: number; error: string }[];
}
