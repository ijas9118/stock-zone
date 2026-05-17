import Papa from "papaparse";

import { CsvRow } from "./types";

export async function parseCsv(fileContent: string): Promise<{
  rows: CsvRow[];
  errors: string[];
}> {
  return new Promise((resolve) => {
    Papa.parse<CsvRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors = results.errors.map(
          (err) => `Row ${err.row}: ${err.message}`
        );
        resolve({
          rows: results.data,
          errors,
        });
      },
      error: (error: Error) => {
        resolve({
          rows: [],
          errors: [error.message],
        });
      },
    });
  });
}
