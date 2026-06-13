import { z } from "zod";

export interface LocationCsvRow {
  warehouse_name: string;
  zone: string;
  aisle: string;
  rack: string;
  bin: string;
}

export const LocationRowSchema = z
  .object({
    warehouse_name: z.string().min(1, "warehouse_name is required"),
    zone: z.string().optional(),
    aisle: z.string().optional(),
    rack: z.string().optional(),
    bin: z.string().optional(),
  })
  .refine((d) => d.zone || d.aisle || d.rack || d.bin, {
    message: "At least one of zone, aisle, rack, or bin must be non-empty",
    path: ["zone"],
  });

export type ValidatedLocationRow = z.infer<typeof LocationRowSchema>;

export interface NormalizedLocationRow extends ValidatedLocationRow {
  _originalRowIndex: number;
}

export interface LocationImportResult {
  totalRows: number;
  inserted: number;
  skipped: number; // duplicate location_code in same warehouse
  failedRows: number;
  errors: { row: number; error: string }[];
}
