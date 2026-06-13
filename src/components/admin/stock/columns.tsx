"use client";

import { StockWithDetails } from "@/actions/admin/stock";
import { ColumnDef } from "@tanstack/react-table";

import { getLargestFittingUom } from "@/lib/uom/convert";
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
          <span className="text-xs font-medium sm:text-sm">
            {product?.name}
          </span>
          <span className="text-muted-foreground font-mono text-[10px] sm:text-xs">
            {product?.sku || "No SKU"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "products.categories.category_name",
    header: "Category",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) => {
      const category = row.original.products?.categories?.category_name;
      const subcategory =
        row.original.products?.subcategories?.subcategory_name;
      return (
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm">{category || "N/A"}</span>
          <span className="text-muted-foreground text-[10px] sm:text-xs">
            {subcategory || ""}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "warehouses.name",
    header: "Warehouse",
    meta: { className: "hidden sm:table-cell" },
  },
  {
    id: "location",
    header: "Location",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) => {
      const loc = row.original.locations;
      if (!loc) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
      return (
        <span className="font-mono text-xs font-medium">
          {loc.location_code}
        </span>
      );
    },
  },
  {
    accessorKey: "shop_types.name",
    header: "Shop Type",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px] sm:text-xs">
        {row.original.shop_types?.name}
      </Badge>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => {
      const quantity = row.original.quantity;
      const alt = getLargestFittingUom(
        quantity,
        (row.original.products?.product_uom_conversions ?? []).map((c) => ({
          uom_code: c.units_of_measure?.uom_code ?? "",
          full_name: c.units_of_measure?.full_name ?? "",
          conversion_factor: Number(c.conversion_factor),
        }))
      );
      return (
        <div className="flex flex-col">
          <span
            className={`font-mono text-[10px] font-bold sm:text-xs ${quantity <= 5 ? "text-destructive" : ""}`}
          >
            {quantity}
          </span>
          {alt && (
            <span className="text-muted-foreground/60 text-[9px]">
              {alt.display_qty} {alt.uom_code}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <StockActions stock={row.original} />,
  },
];
