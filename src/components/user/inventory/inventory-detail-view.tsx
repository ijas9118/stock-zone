"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Edit,
  MapPin,
  Minus,
  Plus,
  Store,
  Warehouse as WarehouseIcon,
} from "lucide-react";

import { UserStockWithDetails } from "@/actions/user/stock";
import { UserRecentMovement } from "@/actions/user/stock-movements";
import { getLargestFittingUom } from "@/lib/uom/convert";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { InventoryDialogs } from "./inventory-dialogs";
import { MovementActionType } from "./stock-movement-modal";

interface InventoryDetailViewProps {
  stock: UserStockWithDetails;
  permissions: {
    perm_do_transfer: boolean;
    perm_do_adjustment: boolean;
    perm_do_purchase: boolean;
    perm_do_sale: boolean;
  };
  recentMovements: UserRecentMovement[];
}

const MOVEMENT_LABELS: Record<string, string> = {
  in: "Stock In",
  out: "Stock Out",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  adjustment: "Adjustment",
};

export function InventoryDetailView({
  stock,
  permissions,
  recentMovements,
}: InventoryDetailViewProps) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<{
    type: MovementActionType;
    stock: UserStockWithDetails;
  } | null>(null);

  const minQty = stock.products?.minimum_stock_quantity ?? 10;
  const isLowStock = stock.quantity <= minQty;
  const isOutOfStock = stock.quantity <= 0;
  const stockRatio =
    minQty > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((stock.quantity / (minQty * 2)) * 100))
        )
      : 100;

  const altUom = getLargestFittingUom(
    stock.quantity,
    (stock.products?.product_uom_conversions ?? []).map((c) => ({
      uom_code: c.units_of_measure?.uom_code ?? "",
      full_name: c.units_of_measure?.full_name ?? "",
      conversion_factor: Number(c.conversion_factor),
    }))
  );

  const handleAction = (type: MovementActionType) => {
    setActiveDialog({ type, stock });
  };

  const handleRefresh = () => router.refresh();

  return (
    <div className="space-y-8">
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
        <nav className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs sm:text-sm">
          <span>Inventory</span>
          <span>/</span>
          <span className="text-foreground truncate font-medium">
            {stock.products?.name}
          </span>
        </nav>
      </div>

      {/* Hero */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            {stock.products?.categories?.category_name || "Uncategorized"}
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
              isLowStock
                ? "border-[#441D49]/30 bg-[#441D49]/10 text-[#441D49] dark:border-[#441D49]/40 dark:bg-[#441D49]/20 dark:text-[#DDB6E2]"
                : "border-[#C78AD0]/40 bg-[#C78AD0]/10 text-[#7A3483] dark:border-[#7A3483]/40 dark:bg-[#7A3483]/20 dark:text-[#DDB6E2]"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isLowStock ? "bg-[#441D49]" : "bg-[#C78AD0]"
              )}
            />
            {isLowStock ? "Low Stock" : "In Stock"}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {stock.products?.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          <span className="opacity-60">SKU</span>{" "}
          <span className="font-medium">{stock.products?.sku || "No SKU"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Current Stock + Storage Location (combined) */}
        <Card className="gap-0 border p-6 lg:col-span-2">
          <p className="text-muted-foreground mb-1 text-xs leading-none font-bold tracking-widest uppercase">
            Current Stock
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={cn(
                "text-4xl leading-none font-bold tracking-tight",
                isLowStock
                  ? "text-[#441D49] dark:text-[#DDB6E2]"
                  : "text-foreground"
              )}
            >
              {stock.quantity}
            </span>
            <span className="text-muted-foreground text-lg leading-none font-medium">
              {stock.products?.units_of_measure?.uom_code || "units"}
            </span>
            {altUom ? (
              <span className="text-muted-foreground/70 text-sm leading-none">
                · {altUom.display_qty} {altUom.uom_code}
              </span>
            ) : null}
          </div>

          <Separator className="my-5 opacity-60" />

          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
            <MapPin className="h-4 w-4 opacity-70" /> Storage Location
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">
                Bin Location
              </p>
              {stock.all_locations && stock.all_locations.length > 0 ? (
                <div className="space-y-1">
                  {stock.all_locations.map((loc) => (
                    <p key={loc.id} className="font-mono text-sm font-semibold">
                      {loc.location_code}
                    </p>
                  ))}
                </div>
              ) : stock.locations ? (
                <>
                  <p className="font-mono text-sm font-semibold">
                    {stock.locations.location_code}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {[
                      stock.locations.zone && `Zone ${stock.locations.zone}`,
                      stock.locations.rack && `Rack ${stock.locations.rack}`,
                      stock.locations.level && `Level ${stock.locations.level}`,
                      stock.locations.slot && `Slot ${stock.locations.slot}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold">-</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <Store className="h-3.5 w-3.5 opacity-70" /> Shop
              </p>
              <p className="text-sm font-semibold">
                {stock.shop_types?.name || "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <WarehouseIcon className="h-3.5 w-3.5 opacity-70" /> Warehouse
              </p>
              <p className="text-sm font-semibold">
                {stock.warehouses?.name || "-"}
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <Card className="border p-6 lg:col-span-1">
          <h4 className="text-muted-foreground mb-4 text-xs font-bold tracking-widest uppercase">
            Actions
          </h4>
          <div className="space-y-2">
            <Button
              onClick={() => handleAction("out")}
              disabled={!permissions.perm_do_sale}
              className="h-11 w-full justify-center gap-2 font-bold"
            >
              <Minus className="h-4 w-4" /> Stock Out
            </Button>
            <Button
              onClick={() => handleAction("in")}
              disabled={!permissions.perm_do_purchase}
              className="h-11 w-full justify-center gap-2 border border-[#C78AD0]/50 bg-[#C78AD0]/15 font-bold text-[#7A3483] hover:bg-[#C78AD0]/25 dark:border-[#7A3483]/40 dark:bg-[#7A3483]/20 dark:text-[#DDB6E2] dark:hover:bg-[#7A3483]/30"
            >
              <Plus className="h-4 w-4" /> Stock In
            </Button>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                onClick={() => handleAction("transfer")}
                disabled={!permissions.perm_do_transfer}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-bold"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
              </Button>
              <Button
                onClick={() => handleAction("adjustment")}
                disabled={!permissions.perm_do_adjustment}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-bold"
              >
                <Edit className="h-3.5 w-3.5" /> Adjust
              </Button>
            </div>
          </div>
        </Card>

        {/* Recent History */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
              Recent History
            </h3>
            <Link
              href="/movements"
              className="text-muted-foreground hover:text-foreground text-[10px] font-bold tracking-widest uppercase transition-colors"
            >
              View Activity
            </Link>
          </div>
          {recentMovements.length === 0 ? (
            <p className="text-muted-foreground border-border/60 rounded-lg border border-dashed py-8 text-center text-sm">
              No movement history for this item yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentMovements.map((m) => (
                <li
                  key={m.id}
                  className="border-border/60 bg-muted/20 flex items-center gap-3 rounded-lg border p-3"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      m.quantity_delta >= 0 ? "bg-[#441D49]" : "bg-red-500"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {MOVEMENT_LABELS[m.type] ?? m.type}{" "}
                      {m.quantity_delta >= 0 ? "+" : ""}
                      {m.quantity_delta}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatDistanceToNow(new Date(m.created_at), {
                        addSuffix: true,
                      })}{" "}
                      · {m.owner_name}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stock Status */}
        <Card className="border p-6 lg:col-span-1">
          <h4 className="text-muted-foreground mb-4 text-xs font-bold tracking-widest uppercase">
            Stock Status
          </h4>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium opacity-80">Stock Level</span>
            <span
              className={cn(
                "font-bold",
                isOutOfStock
                  ? "text-red-600 dark:text-red-400"
                  : isLowStock
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-[#7A3483] dark:text-[#C78AD0]"
              )}
            >
              {isOutOfStock ? "Out of Stock" : isLowStock ? "Low" : "Healthy"}
            </span>
          </div>
          <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full",
                isOutOfStock
                  ? "bg-red-600"
                  : isLowStock
                    ? "bg-orange-500"
                    : "bg-[#C78AD0]"
              )}
              style={{ width: `${stockRatio}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-[11px]">
            {stock.quantity} in stock · minimum {minQty}
          </p>

          {isLowStock ? (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center dark:border-red-500/40 dark:bg-red-500/20">
              <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-xs font-bold tracking-wider uppercase">
                  Reorder Needed
                </p>
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">
                Stock is at or below the minimum threshold
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      <InventoryDialogs
        activeDialog={activeDialog}
        onClose={() => setActiveDialog(null)}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
