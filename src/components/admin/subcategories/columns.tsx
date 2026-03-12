"use client";

import { SubcategoryWithCategory } from "@/actions/admin/categories";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { SubcategoryActions } from "./subcategory-actions";

export const columns: ColumnDef<SubcategoryWithCategory>[] = [
  {
    accessorKey: "subcategory_name",
    header: "Subcategory Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.subcategory_name}</span>
    ),
  },
  {
    id: "category",
    header: "Parent Category",
    cell: ({ row }) => (
      <span className="text-muted-foreground font-medium">
        {row.original.categories?.category_name || "Uncategorized"}
      </span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-muted-foreground line-clamp-1 max-w-[300px] text-sm italic">
        {row.original.description || "No description"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      return (
        <span className="text-muted-foreground whitespace-nowrap">
          {format(new Date(row.getValue("created_at")), "MMM dd, yyyy")}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <SubcategoryActions subcategory={row.original} />,
  },
];
