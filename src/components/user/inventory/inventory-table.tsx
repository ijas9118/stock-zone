"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { UserStockWithDetails } from "@/actions/user/stock";
import { getLargestFittingUom } from "@/lib/uom/convert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InventoryTableProps {
  stocks: UserStockWithDetails[];
}

export function InventoryTable({ stocks }: InventoryTableProps) {
  const router = useRouter();

  return (
    <div className="bg-card/50 overflow-hidden rounded-xl border backdrop-blur-sm">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="border-b hover:bg-transparent">
            <TableHead className="text-muted-foreground/70 h-9 text-[10px] font-bold tracking-wider uppercase lg:hidden">
              Product
            </TableHead>
            <TableHead className="text-muted-foreground/70 hidden h-9 w-[120px] text-[10px] font-bold tracking-wider uppercase lg:table-cell">
              SKU
            </TableHead>
            <TableHead className="text-muted-foreground/70 hidden h-9 text-[10px] font-bold tracking-wider uppercase lg:table-cell">
              Product Name
            </TableHead>
            <TableHead className="text-muted-foreground/70 hidden h-9 text-[10px] font-bold tracking-wider uppercase md:table-cell lg:hidden">
              Location
            </TableHead>
            <TableHead className="text-muted-foreground/70 hidden h-9 text-[10px] font-bold tracking-wider uppercase lg:table-cell">
              Shop
            </TableHead>
            <TableHead className="text-muted-foreground/70 hidden h-9 text-[10px] font-bold tracking-wider uppercase lg:table-cell">
              Warehouse
            </TableHead>
            <TableHead className="text-muted-foreground/70 h-9 px-4 text-right text-[10px] font-bold tracking-wider uppercase">
              Stock
            </TableHead>
            <TableHead className="text-muted-foreground/70 hidden h-9 text-right text-[10px] font-bold tracking-wider uppercase sm:table-cell lg:table-cell">
              Last Update
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((stock) => {
            const isLowStock =
              stock.quantity <= (stock.products?.minimum_stock_quantity ?? 10);

            return (
              <TableRow
                key={stock.id}
                className="hover:bg-muted/50 border-muted/40 cursor-pointer transition-colors"
                onClick={() => router.push(`/inventory/${stock.id}`)}
              >
                {/* Mobile/Tablet Combined View */}
                <TableCell className="py-2 pr-0 pl-4 lg:hidden">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-foreground text-[13px] leading-tight font-medium">
                      {stock.products?.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground/80 font-mono text-[10px]">
                        {stock.products?.sku || "NO-SKU"}
                      </span>
                      <Badge
                        variant="outline"
                        className="h-3 origin-left scale-95 px-1 py-0 text-[8px] font-medium md:hidden"
                      >
                        {stock.shop_types?.name}
                      </Badge>
                    </div>
                  </div>
                </TableCell>

                {/* Desktop Split View */}
                <TableCell className="text-muted-foreground hidden px-4 py-3 font-mono text-xs whitespace-nowrap lg:table-cell">
                  {stock.products?.sku || "NO-SKU"}
                </TableCell>
                <TableCell className="hidden px-4 py-3 lg:table-cell">
                  <span className="text-foreground text-[13px] font-medium lg:text-sm lg:font-semibold">
                    {stock.products?.name}
                  </span>
                </TableCell>

                {/* Mobile/Tablet Location */}
                <TableCell className="hidden px-4 md:table-cell lg:hidden">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">
                      {stock.shop_types?.name}
                    </span>
                    <span className="text-muted-foreground text-[9px] font-bold tracking-widest uppercase">
                      {stock.warehouses?.name}
                    </span>
                  </div>
                </TableCell>

                {/* Desktop Location Split */}
                <TableCell className="hidden text-sm font-medium lg:table-cell">
                  {stock.shop_types?.name}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                    {stock.warehouses?.name}
                  </span>
                </TableCell>

                <TableCell className="py-2 pr-4 pl-0 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-sm leading-none font-bold ${isLowStock ? "text-destructive" : "text-primary"}`}
                    >
                      {stock.quantity}
                    </span>
                    <span className="text-muted-foreground mt-0.5 text-[9px] font-bold tracking-tight uppercase">
                      {stock.products?.units_of_measure?.uom_code || "units"}
                    </span>
                    {(() => {
                      const alt = getLargestFittingUom(
                        stock.quantity,
                        (stock.products?.product_uom_conversions ?? []).map(
                          (c) => ({
                            uom_code: c.units_of_measure?.uom_code ?? "",
                            full_name: c.units_of_measure?.full_name ?? "",
                            conversion_factor: Number(c.conversion_factor),
                          })
                        )
                      );
                      return alt ? (
                        <span className="text-muted-foreground/60 mt-0.5 text-[9px] tracking-tight">
                          {alt.display_qty} {alt.uom_code}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </TableCell>

                <TableCell className="hidden px-4 py-3 text-right sm:table-cell lg:table-cell">
                  <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                    {format(new Date(stock.updated_at), "MMM d, hh:mm a")}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
