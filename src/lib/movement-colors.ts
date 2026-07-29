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
  transfer_out:
    "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400",
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

// Human labels for the top-level movement type — shared by the admin Stock
// Movements table and the staff Activity feed so both read identically.
export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Stock In",
  out: "Stock Out",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  adjustment: "Adjustment",
};

// Human labels for the movement's specific reason (sub_type) — shown
// alongside the type label so staff/admin can see *why*, not just in/out.
export const MOVEMENT_SUB_TYPE_LABELS: Record<string, string> = {
  sent_from_shop: "Sent from Shop",
  supplier_delivery: "Supplier Delivery",
  customer_return: "Customer Return",
  initial_stock: "Initial Stock",
  sent_to_shop: "Sent to Shop",
  sent_to_customer: "Sent to Customer",
  sent_to_samti: "Sent to Samti Shop",
  sent_to_yanbu: "Sent to Yanbu",
  sent_to_tz_showroom: "Sent to TZ Showroom",
  supplier_return: "Supplier Return",
  stock_count_correction: "Stock Count Correction",
  system_mistake: "System Mistake",
  damaged_goods: "Damaged Goods",
  expired_goods: "Expired Goods",
  missing_lost: "Missing / Lost",
  found_extra_stock: "Found Extra Stock",
};
