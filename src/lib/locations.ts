export function buildLocationCode(
  zone?: string | null,
  rack?: string | null,
  level?: string | null,
  slot?: string | null
): string {
  const parts = [zone, rack, level, slot].filter((p) => p && p.trim());
  return parts.length > 0 ? parts.join("-") : "—";
}
