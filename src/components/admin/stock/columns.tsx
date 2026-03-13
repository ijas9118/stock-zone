"use client";

import { StockWithDetails } from "@/actions/admin/stock";
import { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

import { StockActions } from "./stock-actions";

export const columns: ColumnDef<StockWithDetails>[] = [
  {
    accessorKey: "products.name",
    header: "Product",
    cell: ({ row }) => {
      const product = row.original.products;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{product?.name}</span>
          <span className="text-muted-foreground text-xs">
            {product?.sku || "No SKU"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "products.categories.category_name",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.products?.categories?.category_name;
      const subcategory =
        row.original.products?.subcategories?.subcategory_name;
      return (
        <div className="flex flex-col">
          <span className="text-sm">{category || "N/A"}</span>
          <span className="text-muted-foreground text-xs">
            {subcategory || ""}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "warehouses.name",
    header: "Warehouse",
  },
  {
    accessorKey: "shop_types.name",
    header: "Shop Type",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.shop_types?.name}</Badge>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      return (
        <span
          className={`font-mono font-bold ${quantity <= 5 ? "text-destructive" : ""}`}
        >
          {quantity}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <StockActions stock={row.original} />,
  },
];
