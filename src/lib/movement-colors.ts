// Shared movement-type color mapping, single source of truth for
// columns.tsx, stock-movement-detail-view.tsx, and stock-movements-filters.tsx
// — same accent family as the rest of the app, shade signals importance
// rather than mixing unrelated hues per type.

export const MOVEMENT_BADGE_CLASS: Record<string, string> = {
  in: "bg-[#441D49]/10 text-[#441D49] dark:bg-[#441D49]/30 dark:text-[#DDB6E2]",
  out: "bg-[#7A3483]/10 text-[#7A3483] dark:bg-[#7A3483]/30 dark:text-[#DDB6E2]",
  transfer_in:
    "bg-[#A346AF]/10 text-[#A346AF] dark:bg-[#A346AF]/30 dark:text-[#DDB6E2]",
  transfer_out:
    "bg-[#A346AF]/10 text-[#A346AF] dark:bg-[#A346AF]/30 dark:text-[#DDB6E2]",
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
  out: "text-[#7A3483]",
  transfer_in: "text-[#A346AF]",
  transfer_out: "text-[#A346AF]",
  adjustment: "text-[#C78AD0]",
  return: "text-[#C78AD0]",
  initial_stock: "text-[#DDB6E2]",
};
