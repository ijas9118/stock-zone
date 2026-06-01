/**
 * Convert a quantity in an alternate UOM to the base unit.
 * factor = "how many base units = 1 of this alternate UOM"
 */
export function convertToBase(transactQty: number, factor: number): number {
  return Math.round(transactQty * factor * 1_000_000) / 1_000_000;
}

/**
 * Find the largest alternate UOM where at least 1 whole unit fits into baseQty.
 * Sorts by conversion_factor descending; returns the first where floor(baseQty / factor) >= 1.
 * Returns null if baseQty <= 0 or no conversion qualifies.
 */
export function getLargestFittingUom(
  baseQty: number,
  conversions: Array<{
    uom_code: string;
    full_name: string;
    conversion_factor: number;
  }>
): { uom_code: string; full_name: string; display_qty: number } | null {
  if (baseQty <= 0 || conversions.length === 0) return null;

  const sorted = [...conversions].sort(
    (a, b) => b.conversion_factor - a.conversion_factor
  );

  for (const c of sorted) {
    const displayQty = Math.floor(baseQty / c.conversion_factor);
    if (displayQty >= 1) {
      return {
        uom_code: c.uom_code,
        full_name: c.full_name,
        display_qty: displayQty,
      };
    }
  }

  return null;
}
