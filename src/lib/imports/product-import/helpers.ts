export function cleanString(str: string | undefined | null): string | null {
  if (str === undefined || str === null) return null;
  const trimmed = str.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeKey(str: string | undefined | null): string {
  if (!str) return "";
  return str.trim().toLowerCase();
}
