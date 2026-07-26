"use client";

import { ColumnDef } from "@tanstack/react-table";

import { LocationWithWarehouse } from "@/actions/admin/locations";
import { Badge } from "@/components/ui/badge";

import { LocationActions } from "./location-actions";

export const columns: ColumnDef<LocationWithWarehouse>[] = [
  {
    accessorKey: "location_code",
    header: "Code",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">
        {row.original.location_code}
      </span>
    ),
  },
  {
    accessorKey: "warehouses.name",
    header: "Warehouse",
    cell: ({ row }) => row.original.warehouses?.name ?? "—",
  },
  {
    accessorKey: "zone",
    header: "Zone",
    cell: ({ row }) =>
      row.original.zone ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "rack",
    header: "Rack",
    cell: ({ row }) =>
      row.original.rack ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "level",
    header: "Level",
    cell: ({ row }) =>
      row.original.level ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "slot",
    header: "Slot",
    cell: ({ row }) =>
      row.original.slot ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) =>
      row.original.is_active ? (
        <Badge variant="default" className="text-[10px]">
          Active
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground text-[10px]">
          Inactive
        </Badge>
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => <LocationActions location={row.original} />,
  },
];
