"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { ProductWithDetails } from "@/actions/admin/products";
import { Badge } from "@/components/ui/badge";

import { ProductActions } from "./product-actions";

export const columns: ColumnDef<ProductWithDetails>[] = [
  {
    accessorKey: "name",
    header: "Product Name",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{product.name}</span>
          <span className="text-muted-foreground text-[10px] sm:text-xs">
            {product.brands?.name || "No brand"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "sku",
    header: "SKU",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ row }) => (
      <span className="font-mono text-[10px] sm:text-xs">
        {row.original.sku || "N/A"}
      </span>
    ),
  },
  {
    id: "category",
    header: "Category",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="flex flex-col">
          <span className="text-[10px] font-medium sm:text-xs">
            {product.categories?.category_name || "N/A"}
          </span>
          <span className="text-muted-foreground text-[10px] sm:text-xs">
            {product.subcategories?.subcategory_name || "No subcategory"}
          </span>
        </div>
      );
    },
  },
  {
    id: "uom",
    header: "UOM",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-[10px] sm:text-xs">
          {row.original.units_of_measure?.full_name || "N/A"}
        </span>
        <span className="text-muted-foreground font-mono text-[10px] uppercase sm:text-xs">
          {row.original.units_of_measure?.uom_code || "N/A"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "minimum_stock_quantity",
    header: "Min Stock Alert",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => (
      <span className="text-[11px] font-medium sm:text-xs">
        {row.original.minimum_stock_quantity ?? 10}
      </span>
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
    header: "Created",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) => {
      return (
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px] sm:text-xs">
            {format(new Date(row.getValue("created_at")), "MMM dd, yyyy")}
          </span>
          <span className="text-muted-foreground text-[10px] sm:text-xs">
            by{" "}
            {row.original.profiles?.full_name ||
              row.original.profiles?.email ||
              "System"}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ProductActions product={row.original} />,
  },
];
