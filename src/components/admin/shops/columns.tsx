"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { ShopType } from "@/actions/admin/shops";
import { Badge } from "@/components/ui/badge";

import { ShopActions } from "./shop-actions";

export const columns: ColumnDef<ShopType>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-[300px] truncate text-[10px] sm:text-xs">
        {row.getValue("description") || "-"}
      </div>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean;
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => {
      return (
        <div className="text-muted-foreground text-xs">
          {format(new Date(row.getValue("created_at")), "MMM d, yyyy")}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ShopActions shop={row.original} />,
  },
];
