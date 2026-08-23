"use client";

import { ColumnDef } from "@tanstack/react-table";

import { StockWithDetails } from "@/actions/admin/stock";
import { getLargestFittingUom } from "@/lib/uom/convert";
import { Badge } from "@/components/ui/badge";

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
      const locs = row.original.all_locations?.length
        ? row.original.all_locations
        : row.original.locations
          ? [row.original.locations]
          : [];
      if (locs.length === 0) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
      return (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs font-medium">
            {locs[0].location_code}
          </span>
          {locs.length > 1 && (
            <span className="text-muted-foreground bg-muted rounded px-1 py-0.5 text-[10px] font-semibold">
              +{locs.length - 1}
            </span>
          )}
        </div>
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
];
