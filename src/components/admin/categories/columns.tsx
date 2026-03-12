"use client";

import { Category } from "@/actions/admin/categories";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { CategoryActions } from "./category-actions";

export const columns: ColumnDef<Category>[] = [
  {
    accessorKey: "cat_code",
    header: "Code",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.cat_code}</span>
    ),
  },
  {
    accessorKey: "category_name",
    header: "Category Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.category_name}</span>
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
    cell: ({ row }) => <CategoryActions category={row.original} />,
  },
];
