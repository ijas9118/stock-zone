import * as XLSX from "xlsx";

// Excel sheet names can't contain : \ / ? * [ ] and are capped at 31 chars.
function sanitizeSheetName(name: string) {
  const cleaned = name.replace(/[:\\/?*[\]]/g, "-").trim();
  return (cleaned || "Report").slice(0, 31);
}

/**
 * Builds the workbook and triggers the download manually via a Blob + <a>
 * element rather than XLSX.writeFile — that helper does its own Node-vs-
 * browser environment detection which can misfire under bundlers, silently
 * throwing instead of downloading anything.
 */
export function exportRowsToExcel(
  rows: Record<string, string | number>[],
  filename: string,
  sheetName = "Report"
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sanitizeSheetName(sheetName)
  );

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
