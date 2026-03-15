"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShopType } from "@/actions/admin/shops";
import { Warehouse } from "@/actions/admin/warehouses";
import {
  ArrowRightLeft,
  PackagePlus,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StockMovementsFiltersProps {
  initialWarehouses: Warehouse[];
  initialShopTypes: ShopType[];
}

const movementTypes = [
  {
    value: "purchase",
    label: "Purchase",
    icon: TrendingUp,
    color: "text-emerald-500",
  },
  { value: "sale", label: "Sale", icon: TrendingDown, color: "text-red-500" },
  {
    value: "transfer_in",
    label: "Transfer In",
    icon: ArrowRightLeft,
    color: "text-blue-500",
  },
  {
    value: "transfer_out",
    label: "Transfer Out",
    icon: ArrowRightLeft,
    color: "text-orange-500",
  },
  {
    value: "adjustment",
    label: "Adjustment",
    icon: SlidersHorizontal,
    color: "text-amber-500",
  },
  {
    value: "return",
    label: "Return",
    icon: RotateCcw,
    color: "text-purple-500",
  },
  {
    value: "initial_stock",
    label: "Initial Stock",
    icon: PackagePlus,
    color: "text-slate-500",
  },
];

export function StockMovementsFilters({
  initialWarehouses,
  initialShopTypes,
}: StockMovementsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const hasFilters =
    searchParams.get("type") ||
    searchParams.get("warehouse_id") ||
    searchParams.get("shop_type_id") ||
    searchParams.get("date_from") ||
    searchParams.get("date_to") ||
    searchParams.get("q");

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function handleReset() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="border-muted-foreground/10 bg-muted/30 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 backdrop-blur-sm">
      {/* Movement Type */}
      <Select
        value={searchParams.get("type") || "all"}
        onValueChange={(v) => updateFilter("type", v)}
      >
        <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[130px] rounded-lg text-xs shadow-none">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {movementTypes.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              <div className="flex items-center gap-2">
                <t.icon className={`h-3.5 w-3.5 ${t.color}`} />
                <span>{t.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Warehouse */}
      <Select
        value={searchParams.get("warehouse_id") || "all"}
        onValueChange={(v) => updateFilter("warehouse_id", v)}
      >
        <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[140px] rounded-lg text-xs shadow-none">
          <SelectValue placeholder="All Warehouses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Warehouses</SelectItem>
          {initialWarehouses.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Shop Type */}
      <Select
        value={searchParams.get("shop_type_id") || "all"}
        onValueChange={(v) => updateFilter("shop_type_id", v)}
      >
        <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[130px] rounded-lg text-xs shadow-none">
          <SelectValue placeholder="All Shops" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Shops</SelectItem>
          {initialShopTypes.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* From Date */}
      <div className="ml-1 flex items-center gap-1.5">
        <span className="text-muted-foreground/60 shrink-0 text-[10px] font-semibold uppercase">
          From
        </span>
        <Input
          type="date"
          aria-label="From date"
          value={searchParams.get("date_from") || ""}
          onChange={(e) => updateFilter("date_from", e.target.value)}
          className="bg-background border-muted-foreground/15 h-8 w-[130px] rounded-lg px-2 text-xs shadow-none"
        />
      </div>

      {/* To Date */}
      <div className="ml-1 flex items-center gap-1.5">
        <span className="text-muted-foreground/60 shrink-0 text-[10px] font-semibold uppercase">
          To
        </span>
        <Input
          type="date"
          aria-label="To date"
          value={searchParams.get("date_to") || ""}
          onChange={(e) => updateFilter("date_to", e.target.value)}
          className="bg-background border-muted-foreground/15 h-8 w-[130px] rounded-lg px-2 text-xs shadow-none"
        />
      </div>

      {/* Reset */}
      {hasFilters && (
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 text-xs font-medium"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
