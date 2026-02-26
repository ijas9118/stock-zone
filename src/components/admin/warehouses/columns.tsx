"use client";

import { Warehouse } from "@/actions/admin/warehouses";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

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
        <span className="text-muted-foreground line-clamp-1 max-w-[250px] text-xs italic">
          {row.original.description || "No description"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-sm">
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
    cell: ({ row }) => {
      return (
        <span className="text-muted-foreground">
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
