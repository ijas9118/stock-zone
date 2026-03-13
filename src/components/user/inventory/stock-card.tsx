"use client";

import { UserStockWithDetails } from "@/actions/user/stock";
import { format } from "date-fns";
import {
  ArrowRightLeft,
  Edit,
  History,
  Minus,
  MoreVertical,
  Package,
  Plus,
  RotateCcw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StockCardProps {
  stock: UserStockWithDetails;
  permissions: {
    perm_do_transfer: boolean;
    perm_do_adjustment: boolean;
    perm_do_purchase: boolean;
    perm_do_sale: boolean;
    perm_do_return: boolean;
  };
  onAction: (
    action: "transfer" | "adjustment" | "purchase" | "sale" | "return",
    stock: UserStockWithDetails
  ) => void;
}

export function StockCard({ stock, permissions, onAction }: StockCardProps) {
  const isLowStock = stock.quantity <= 10; // Placeholder threshold

  return (
    <Card className="bg-background/60 group overflow-hidden border-none shadow-md backdrop-blur-sm transition-all hover:shadow-lg">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="group-hover:text-primary text-lg leading-tight font-bold transition-colors">
              {stock.products?.name}
            </h3>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                {stock.products?.sku || "NO-SKU"}
              </p>
              <Badge variant="outline" className="h-4 py-0 text-[10px]">
                {stock.shop_types?.name}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2" disabled>
                <History className="h-4 w-4" /> View History
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onClick={() => onAction("return", stock)}
                disabled={!permissions.perm_do_return}
              >
                <RotateCcw className="h-4 w-4" /> Return
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="flex items-end justify-between">
          <div className="space-y-0.5">
            <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              Stock Level
            </p>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-3xl font-black ${isLowStock ? "text-destructive" : "text-primary"}`}
              >
                {stock.quantity}
              </span>
              <span className="text-muted-foreground text-sm font-medium">
                {stock.products?.units_of_measure?.uom_code || "unit(s)"}
              </span>
            </div>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-muted-foreground text-[10px]">
              Last update:{" "}
              {format(new Date(stock.updated_at), "MMM d, hh:mm a")}
            </p>
            <p className="flex items-center justify-end gap-1 text-xs font-medium">
              <Package className="h-3 w-3" />
              {stock.warehouses?.name}
            </p>
          </div>
        </div>
      </CardContent>

      <div className="bg-muted/20 grid grid-cols-2 divide-x border-t">
        <Button
          variant="ghost"
          className="h-11 gap-2 rounded-none text-xs font-bold transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
          onClick={() => onAction("sale", stock)}
          disabled={!permissions.perm_do_sale}
        >
          <Minus className="h-3 w-3" /> SALE
        </Button>
        <Button
          variant="ghost"
          className="h-11 gap-2 rounded-none text-xs font-bold transition-colors hover:bg-amber-500/10 hover:text-amber-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
          onClick={() => onAction("adjustment", stock)}
          disabled={!permissions.perm_do_adjustment}
        >
          <Edit className="h-3 w-3" /> ADJUST
        </Button>
      </div>

      <div className="bg-muted/10 grid grid-cols-2 divide-x border-t">
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-none text-xs font-medium opacity-70 hover:opacity-100 disabled:opacity-30 disabled:hover:opacity-30"
          onClick={() => onAction("purchase", stock)}
          disabled={!permissions.perm_do_purchase}
        >
          <Plus className="h-3 w-3" /> PURCHASE
        </Button>
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-none text-xs font-medium opacity-70 hover:opacity-100 disabled:opacity-30 disabled:hover:opacity-30"
          onClick={() => onAction("transfer", stock)}
          disabled={!permissions.perm_do_transfer}
        >
          <ArrowRightLeft className="h-3 w-3" /> TRANSFER
        </Button>
      </div>
    </Card>
  );
}
