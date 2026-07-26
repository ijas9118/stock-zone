"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUp,
  Clock,
  Fingerprint,
  Hash,
  PackageMinus,
  PackagePlus,
  RotateCcw,
  SlidersHorizontal,
  Store,
  TrendingDown,
  TrendingUp,
  User,
  Warehouse,
} from "lucide-react";

import { StockMovementWithDetails } from "@/actions/admin/stock-movements";
import { DELTA_COLOR_CLASS, MOVEMENT_BADGE_CLASS } from "@/lib/movement-colors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface StockMovementDetailViewProps {
  movement: StockMovementWithDetails;
}

const typeConfig = {
  in: {
    label: "Stock In",
    icon: TrendingUp,
    className: MOVEMENT_BADGE_CLASS.in,
  },
  out: {
    label: "Stock Out",
    icon: TrendingDown,
    className: MOVEMENT_BADGE_CLASS.out,
  },
  transfer_in: {
    label: "Transfer In",
    icon: ArrowRightLeft,
    className: MOVEMENT_BADGE_CLASS.transfer_in,
  },
  transfer_out: {
    label: "Transfer Out",
    icon: ArrowRightLeft,
    className: MOVEMENT_BADGE_CLASS.transfer_out,
  },
  adjustment: {
    label: "Adjustment",
    icon: SlidersHorizontal,
    className: MOVEMENT_BADGE_CLASS.adjustment,
  },
  return: {
    label: "Return",
    icon: RotateCcw,
    className: MOVEMENT_BADGE_CLASS.return,
  },
  initial_stock: {
    label: "Initial Stock",
    icon: PackagePlus,
    className: MOVEMENT_BADGE_CLASS.initial_stock,
  },
};

export function StockMovementDetailView({
  movement,
}: StockMovementDetailViewProps) {
  const router = useRouter();
  const type = movement.type;
  const config =
    typeConfig[type as keyof typeof typeConfig] || typeConfig.initial_stock;
  const Icon = config.icon;
  const isPositive = movement.quantity_delta > 0;

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-8 pb-10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="text-muted-foreground hover:text-foreground -ml-2 gap-2 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Movements
      </Button>

      {/* Hero Section */}
      <div className="bg-background/40 border-border/50 rounded-2xl border p-6 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: type + product info */}
          <div className="flex flex-col gap-3">
            {/* Type badge + timestamp row */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                className={cn(
                  "gap-1 rounded-full border border-current/20 px-2.5 py-0.5 text-[11px] font-semibold shadow-none",
                  config.className
                )}
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Clock className="h-3 w-3" />
                {format(
                  new Date(movement.created_at),
                  "EEEE, MMM d yyyy 'at' h:mm a"
                )}
              </span>
            </div>

            {/* Product name — scales with screen */}
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {movement.products?.name || "Unknown Product"}
            </h1>

            {/* SKU + brand row */}
            <div className="flex flex-wrap items-center gap-3">
              {movement.products?.sku && (
                <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs">
                  {movement.products.sku}
                </span>
              )}
              {movement.products?.brands?.name && (
                <span className="text-muted-foreground text-sm">
                  {movement.products.brands.name}
                </span>
              )}
            </div>

            {/* Product description if present */}
            {movement.products?.description && (
              <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
                {movement.products.description}
              </p>
            )}
          </div>

          {/* Right: delta + stock change — the key numbers */}
          <div className="flex shrink-0 flex-row items-center gap-6 lg:flex-col lg:items-end lg:gap-3">
            {/* Delta — large, dominant */}
            <div
              className={cn(
                "flex flex-col items-start gap-0.5 lg:items-end",
                isPositive
                  ? DELTA_COLOR_CLASS.positive
                  : DELTA_COLOR_CLASS.negative
              )}
            >
              <div className="flex items-center gap-1.5 font-mono text-4xl font-bold lg:text-5xl">
                {isPositive ? (
                  <ArrowUp className="h-7 w-7 lg:h-9 lg:w-9" />
                ) : (
                  <ArrowDown className="h-7 w-7 lg:h-9 lg:w-9" />
                )}
                {isPositive
                  ? `+${movement.quantity_delta}`
                  : movement.quantity_delta}
              </div>
              <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                units changed
              </span>
            </div>

            {/* Stock change: prev → new */}
            {movement.previous_quantity !== null &&
              movement.new_quantity !== null && (
                <div className="flex flex-col items-start gap-1 lg:items-end">
                  <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    Stock Change
                  </span>
                  <div className="flex items-center gap-2 font-mono text-base font-semibold lg:text-lg">
                    <span className="text-muted-foreground">
                      {movement.previous_quantity}
                    </span>
                    <ArrowRight className="text-muted-foreground/50 h-3.5 w-3.5" />
                    <span className="text-foreground">
                      {movement.new_quantity}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      <Separator className="opacity-40" />

      <div className="space-y-4">
        <h2 className="text-muted-foreground/70 text-xs font-bold tracking-wider uppercase">
          Movement Details
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailCard
            label="Warehouse"
            icon={Warehouse}
            value={movement.warehouses?.name || "N/A"}
            subvalue={movement.warehouses?.location || "Location not specified"}
          />
          <DetailCard
            label="Shop Type"
            icon={Store}
            value={movement.shop_types?.name || "N/A"}
          />
          <DetailCard
            label="Stock Before"
            icon={PackageMinus}
            value={
              movement.previous_quantity !== null
                ? movement.previous_quantity
                : "—"
            }
            subvalue="units before this movement"
          />
          <DetailCard
            label="Stock After"
            icon={PackagePlus}
            value={movement.new_quantity !== null ? movement.new_quantity : "—"}
            subvalue="units after this movement"
          />
          <DetailCard
            label="Performed By"
            icon={User}
            value={
              movement.profiles?.full_name ||
              movement.profiles?.email ||
              "System"
            }
            subvalue={
              movement.profiles?.full_name ? movement.profiles.email : null
            }
          />
          <DetailCard
            label="Movement Type"
            icon={config.icon}
            value={config.label}
            subvalue={movement.type}
            mono={true}
          />
          <DetailCard
            label="Movement ID"
            icon={Fingerprint}
            value={`${movement.id.slice(0, 8)}...`}
            subvalue="movement record ID"
            mono={true}
          />
          <DetailCard
            label="Reference ID"
            icon={Hash}
            value={movement.reference_id || "—"}
            subvalue={movement.reference_id ? "linked transaction" : null}
            mono={true}
          />
          {movement.transact_uom &&
            movement.transact_quantity !== null &&
            movement.transact_quantity !== undefined && (
              <DetailCard
                label="Transacted As"
                icon={ArrowRightLeft}
                value={`${Math.abs(Number(movement.transact_quantity))} ${movement.transact_uom.uom_code}`}
                subvalue={`→ ${movement.quantity_delta} base units`}
              />
            )}
        </div>
      </div>

      {movement.notes && (
        <div className="space-y-2">
          <h2 className="text-muted-foreground/70 text-xs font-bold tracking-wider uppercase">
            Notes
          </h2>
          <Card className="border-border/50 bg-card/50 shadow-none">
            <CardContent className="p-5">
              <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                {movement.notes}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DetailCard({
  label,
  icon: Icon,
  value,
  subvalue,
  mono = false,
}: {
  label: string;
  icon: React.ElementType;
  value: string | number;
  subvalue?: string | null;
  mono?: boolean;
}) {
  return (
    <Card className="border-border/50 bg-card/50 hover:bg-card/80 shadow-none transition-colors">
      <CardContent className="flex flex-col gap-2 p-4">
        <span className="text-muted-foreground/60 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span
          className={cn(
            "text-sm leading-snug font-semibold break-all",
            mono && "font-mono text-xs"
          )}
        >
          {value}
        </span>
        {subvalue && (
          <span className="text-muted-foreground text-xs leading-snug">
            {subvalue}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
