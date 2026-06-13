export function buildLocationCode(
  zone?: string | null,
  aisle?: string | null,
  rack?: string | null,
  bin?: string | null
): string {
  const parts = [zone, aisle, rack, bin].filter((p) => p && p.trim());
  return parts.length > 0 ? parts.join("-") : "—";
}
