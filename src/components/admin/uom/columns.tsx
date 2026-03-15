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
      <span className="font-mono text-[10px] font-medium sm:text-xs">
        {row.original.uom_code}
      </span>
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
    meta: { className: "hidden sm:table-cell" },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[10px] italic sm:text-xs">
        {row.original.example || "-"}
      </span>
    ),
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
    cell: ({ row }) => <UOMActions uom={row.original} />,
  },
];
