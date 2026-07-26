// Shared movement-type color mapping, single source of truth for
// columns.tsx, stock-movement-detail-view.tsx, and stock-movements-filters.tsx.
//
// Deliberate exception to the "one accent palette" rule: movements that
// reduce stock at this location (OUT, Transfer Out) use red so they stand
// out as a loss at a glance. Everything else (IN, Transfer In, Adjustment,
// Return, Initial Stock) stays in the accent family.

export const MOVEMENT_BADGE_CLASS: Record<string, string> = {
  in: "bg-[#441D49]/10 text-[#441D49] dark:bg-[#441D49]/30 dark:text-[#DDB6E2]",
  out: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  transfer_in:
    "bg-[#A346AF]/10 text-[#A346AF] dark:bg-[#A346AF]/30 dark:text-[#DDB6E2]",
  transfer_out: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  adjustment:
    "bg-[#C78AD0]/20 text-[#7A3483] dark:bg-[#C78AD0]/20 dark:text-[#DDB6E2]",
  return:
    "bg-[#C78AD0]/20 text-[#7A3483] dark:bg-[#C78AD0]/20 dark:text-[#DDB6E2]",
  initial_stock:
    "bg-[#DDB6E2]/25 text-[#7A3483] dark:bg-[#DDB6E2]/15 dark:text-[#DDB6E2]",
};

// Flat icon accent for compact contexts (filter dropdowns), no dark variant
// needed since it's just a small glyph next to text.
export const MOVEMENT_ICON_CLASS: Record<string, string> = {
  in: "text-[#441D49]",
  out: "text-red-600",
  transfer_in: "text-[#A346AF]",
  transfer_out: "text-red-500",
  adjustment: "text-[#C78AD0]",
  return: "text-[#C78AD0]",
  initial_stock: "text-[#DDB6E2]",
};

// For a raw quantity delta (no movement type context) — positive/incoming
// stays in the accent family, negative/outgoing is red.
export const DELTA_COLOR_CLASS = {
  positive: "text-[#441D49] dark:text-[#DDB6E2]",
  negative: "text-red-600 dark:text-red-400",
};
