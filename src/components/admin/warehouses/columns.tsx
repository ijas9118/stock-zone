"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Warehouse } from "@/actions/admin/warehouses";
import { Badge } from "@/components/ui/badge";

import { WarehouseActions } from "./warehouse-actions";

export const columns: ColumnDef<Warehouse>[] = [
  {
    accessorKey: "name",
    header: "Warehouse",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="decoration-primary/30 font-medium underline-offset-4 group-hover:underline">
          {row.original.name}
        </span>
        <span className="text-muted-foreground line-clamp-1 max-w-[250px] text-[10px] italic sm:text-xs">
          {row.original.description || "No description"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
        <span className="text-foreground/80 font-medium">
          {row.original.location || "Not specified"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean;
      return (
        <Badge variant={isActive ? "success" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => {
      return (
        <span className="text-muted-foreground text-xs">
          {format(new Date(row.getValue("created_at")), "MMM dd, yyyy")}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <WarehouseActions warehouse={row.original} />,
  },
];
