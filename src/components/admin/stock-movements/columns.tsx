"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  PackagePlus,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { StockMovementWithDetails } from "@/actions/admin/stock-movements";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const typeConfig = {
  in: {
    label: "Stock In",
    icon: TrendingUp,
    className:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  out: {
    label: "Stock Out",
    icon: TrendingDown,
    className:
      "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-400",
  },
  transfer_in: {
    label: "Transfer In",
    icon: ArrowRightLeft,
    className:
      "bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
  },
  transfer_out: {
    label: "Transfer Out",
    icon: ArrowRightLeft,
    className:
      "bg-orange-500/10 text-orange-700 dark:bg-orange-400/10 dark:text-orange-400",
  },
  adjustment: {
    label: "Adjustment",
    icon: SlidersHorizontal,
    className:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  },
  return: {
    label: "Return",
    icon: RotateCcw,
    className:
      "bg-purple-500/10 text-purple-700 dark:bg-purple-400/10 dark:text-purple-400",
  },
  initial_stock: {
    label: "Initial Stock",
    icon: PackagePlus,
    className:
      "bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-400",
  },
};

export const columns: ColumnDef<StockMovementWithDetails>[] = [
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type;
      const config =
        typeConfig[type as keyof typeof typeConfig] || typeConfig.initial_stock;
      const Icon = config.icon;

      return (
        <Badge
          variant="outline"
          className={cn(
            "gap-1 rounded-full border border-current/20 px-2.5 py-0.5 text-[11px] font-semibold shadow-none",
            config.className
          )}
        >
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "products.name",
    header: "Product",
    cell: ({ row }) => {
      const product = row.original.products;
      return (
        <div className="flex flex-col">
          <span className="text-[11px] font-medium sm:text-xs md:text-sm">
            {product?.name || "Unknown"}
          </span>
          <span className="text-muted-foreground font-mono text-[10px] whitespace-nowrap sm:text-[11px]">
            {product?.sku || "No SKU"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "quantity_delta",
    header: "Delta",
    cell: ({ row }) => {
      const delta = row.original.quantity_delta;
      const isPositive = delta > 0;
      return (
        <div
          className={cn(
            "flex items-center gap-1 font-mono text-[11px] font-bold sm:text-xs md:text-sm",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {isPositive ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          {isPositive ? `+${delta}` : delta}
        </div>
      );
    },
  },
  {
    id: "location",
    header: "Location",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="text-[11px] font-medium sm:text-xs md:text-sm">
            {row.original.warehouses?.name || "N/A"}
          </span>
          <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase sm:text-[11px]">
            {row.original.shop_types?.name || "N/A"}
          </span>
        </div>
      );
    },
  },
  {
    id: "by",
    header: "By",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) => {
      const profile = row.original.profiles;
      if (!profile)
        return (
          <span className="text-muted-foreground text-xs italic sm:text-sm">
            System
          </span>
        );
      return (
        <div className="text-xs sm:text-sm">
          {profile.full_name || profile.email}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Date",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return (
        <div className="flex flex-col">
          <span className="text-[11px] sm:text-xs md:text-sm">
            {format(date, "MMM d, yyyy")}
          </span>
          <span className="text-muted-foreground text-[10px] sm:text-[11px]">
            {format(date, "hh:mm a")}
          </span>
        </div>
      );
    },
  },
];
