import Papa from "papaparse";
import * as XLSX from "xlsx";

import { LocationCsvRow } from "./types";

function normalizeHeaders(obj: Record<string, string>): LocationCsvRow {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    normalized[k.toLowerCase().trim()] = v ?? "";
  }
  return normalized as unknown as LocationCsvRow;
}

export async function parseFile(
  input: string | ArrayBuffer
): Promise<{ rows: LocationCsvRow[]; errors: string[] }> {
  if (typeof input === "string") {
    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(input, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const errors = results.errors.map(
            (e) => `Row ${e.row}: ${e.message}`
          );
          resolve({ rows: results.data.map(normalizeHeaders), errors });
        },
        error: (err: Error) => resolve({ rows: [], errors: [err.message] }),
      });
    });
  } else {
    try {
      const wb = XLSX.read(input, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
      });
      return { rows: raw.map(normalizeHeaders), errors: [] };
    } catch (err: unknown) {
      return {
        rows: [],
        errors: [
          err instanceof Error ? err.message : "Failed to parse Excel file",
        ],
      };
    }
  }
}
