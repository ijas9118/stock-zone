"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowRightLeft } from "lucide-react";

import { TransferWithDetails } from "@/actions/admin/transfers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  pending: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-400",
  },
};

export const columns: ColumnDef<TransferWithDetails>[] = [
  {
    accessorKey: "transferred_at",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.original.transferred_at);
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
  {
    id: "product",
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
    id: "route",
    header: "Route",
    cell: ({ row }) => {
      const src = (row.original.source_warehouse as { name: string } | null)
        ?.name;
      const dst = (row.original.dest_warehouse as { name: string } | null)
        ?.name;
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium">{src || "—"}</span>
          <ArrowRightLeft className="text-muted-foreground h-3 w-3 shrink-0" />
          <span className="font-medium">{dst || "—"}</span>
        </div>
      );
    },
  },
  {
    id: "shop",
    header: "Shop",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.shop_types?.name || "—"}
      </span>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold">
        {row.original.quantity}
      </span>
    ),
  },
  {
    id: "by",
    header: "By",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) => {
      const profile = row.original.profiles;
      return (
        <span className="text-muted-foreground text-xs">
          {profile?.full_name || profile?.email || "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const config = statusConfig[row.original.status];
      return (
        <Badge
          variant="outline"
          className={cn(
            "rounded-full border border-current/20 px-2.5 py-0.5 text-[11px] font-semibold shadow-none",
            config.className
          )}
        >
          {config.label}
        </Badge>
      );
    },
  },
];
