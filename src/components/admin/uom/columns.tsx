"use client";

import { UnitOfMeasure } from "@/actions/admin/uom";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { UOMActions } from "./uom-actions";

export const columns: ColumnDef<UnitOfMeasure>[] = [
  {
    accessorKey: "uom_code",
    header: "Code",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.uom_code}</span>
    ),
  },
  {
    accessorKey: "full_name",
    header: "Full Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.full_name}</span>
    ),
  },
  {
    accessorKey: "example",
    header: "Example",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm italic">
        {row.original.example || "-"}
      </span>
    ),
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
    cell: ({ row }) => <UOMActions uom={row.original} />,
  },
];
