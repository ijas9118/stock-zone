"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserStockWithDetails } from "@/actions/user/stock";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRightLeft,
  Edit,
  Info,
  MapPin,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Store,
} from "lucide-react";

import { getLargestFittingUom } from "@/lib/uom/convert";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { InventoryDialogs } from "./inventory-dialogs";

interface InventoryDetailViewProps {
  stock: UserStockWithDetails;
  permissions: {
    perm_do_transfer: boolean;
    perm_do_adjustment: boolean;
    perm_do_purchase: boolean;
    perm_do_sale: boolean;
    perm_do_return: boolean;
  };
}

export function InventoryDetailView({
  stock,
  permissions,
}: InventoryDetailViewProps) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<{
    type: "transfer" | "adjustment" | "in" | "out" | "return";
    stock: UserStockWithDetails;
  } | null>(null);

  const isLowStock =
    stock.quantity <= (stock.products?.minimum_stock_quantity ?? 10);

  const handleAction = (
    type: "transfer" | "adjustment" | "in" | "out" | "return"
  ) => {
    setActiveDialog({ type, stock });
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-9 w-9 border"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Inventory Details
          </h1>
          <p className="text-muted-foreground text-[11px] sm:text-xs">
            Manage stock movements and product specifications
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Section */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 pb-0 sm:p-6">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-foreground text-xl font-semibold sm:text-2xl">
                    {stock.products?.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[11px]">
                      {stock.products?.sku || "No SKU"}
                    </span>
                    <Badge
                      variant="secondary"
                      className="h-5 text-[10px] font-medium"
                    >
                      {stock.products?.categories?.category_name ||
                        "Uncategorized"}
                    </Badge>
                  </div>
                </div>

                <Separator className="opacity-60" />

                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1">
                    <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <Store className="h-3.5 w-3.5 opacity-70" /> Shop Location
                    </label>
                    <p className="text-sm font-medium">
                      {stock.shop_types?.name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <Package className="h-3.5 w-3.5 opacity-70" /> Warehouse
                    </label>
                    <p className="text-sm font-medium">
                      {stock.warehouses?.name}
                    </p>
                  </div>
                  {stock.locations && (
                    <div className="space-y-1">
                      <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                        <MapPin className="h-3.5 w-3.5 opacity-70" /> Bin Location
                      </label>
                      <p className="font-mono text-sm font-semibold">
                        {stock.locations.location_code}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {[
                          stock.locations.zone && `Zone ${stock.locations.zone}`,
                          stock.locations.aisle && `Aisle ${stock.locations.aisle}`,
                          stock.locations.rack && `Rack ${stock.locations.rack}`,
                          stock.locations.bin && `Bin ${stock.locations.bin}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="opacity-60" />

                <div className="space-y-3 py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-muted-foreground text-xs font-medium">
                        Current Stock
                      </label>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            "text-3xl font-semibold tracking-tight sm:text-4xl",
                            isLowStock ? "text-red-600" : "text-foreground"
                          )}
                        >
                          {stock.quantity}
                        </span>
                        <span className="text-muted-foreground text-sm font-medium">
                          {stock.products?.units_of_measure?.uom_code ||
                            "units"}
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
                            <span className="text-muted-foreground/60 text-xs">
                              · {alt.display_qty} {alt.uom_code}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={isLowStock ? "destructive" : "secondary"}
                        className="text-[10px] font-bold"
                      >
                        {isLowStock ? "Low Stock" : "Healthy Status"}
                      </Badge>
                      <div className="text-right">
                        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                          Updated
                        </p>
                        <p className="text-[11px] font-medium">
                          {format(new Date(stock.updated_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="space-y-3">
            <h3 className="px-1 text-sm font-medium">Actions</h3>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <Button
                onClick={() => handleAction("out")}
                disabled={!permissions.perm_do_sale}
                variant="secondary"
                className="h-10 justify-start gap-2.5 rounded-md border-none bg-red-50 text-sm text-red-700 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400"
              >
                <Minus className="h-4 w-4" /> Stock Out
              </Button>
              <Button
                onClick={() => handleAction("in")}
                disabled={!permissions.perm_do_purchase}
                variant="secondary"
                className="h-10 justify-start gap-2.5 rounded-md border-none bg-green-50 text-sm text-green-700 hover:bg-green-100 dark:bg-green-900/10 dark:text-green-400"
              >
                <Plus className="h-4 w-4" /> Stock In
              </Button>
              <Button
                onClick={() => handleAction("transfer")}
                disabled={!permissions.perm_do_transfer}
                variant="secondary"
                className="h-10 justify-start gap-2.5 rounded-md border-none bg-blue-50 text-sm text-blue-700 hover:bg-blue-100 dark:bg-blue-900/10 dark:text-blue-400"
              >
                <ArrowRightLeft className="h-4 w-4" /> Transfer
              </Button>
              <Button
                onClick={() => handleAction("adjustment")}
                disabled={!permissions.perm_do_adjustment}
                variant="secondary"
                className="h-10 justify-start gap-2.5 rounded-md border-none bg-amber-50 text-sm text-amber-700 hover:bg-amber-100 dark:bg-amber-900/10 dark:text-amber-400"
              >
                <Edit className="h-4 w-4" /> Adjust
              </Button>
              <Button
                onClick={() => handleAction("return")}
                disabled={!permissions.perm_do_return}
                variant="secondary"
                className="col-span-2 h-10 justify-start gap-2.5 rounded-md border-none bg-purple-50 text-sm text-purple-700 hover:bg-purple-100 lg:col-span-1 dark:bg-purple-900/10 dark:text-purple-400"
              >
                <RotateCcw className="h-4 w-4" /> Return
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <Card className="border shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 opacity-70" /> Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    "font-medium",
                    isLowStock ? "text-red-600" : "text-emerald-600"
                  )}
                >
                  {isLowStock ? "Low Stock" : "Healthy"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subcategory</span>
                <span className="font-medium">
                  {stock.products?.subcategories?.subcategory_name || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-mono text-[11px] font-medium">
                  {stock.products?.units_of_measure?.full_name || "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <InventoryDialogs
        activeDialog={activeDialog}
        onClose={() => setActiveDialog(null)}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
