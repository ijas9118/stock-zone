"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShopType } from "@/actions/admin/shops";
import { Warehouse } from "@/actions/admin/warehouses";
import {
  ArrowRightLeft,
  PackagePlus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeFilters = {
    type: searchParams.get("type"),
    warehouse_id: searchParams.get("warehouse_id"),
    shop_type_id: searchParams.get("shop_type_id"),
    date_from: searchParams.get("date_from"),
    date_to: searchParams.get("date_to"),
    q: searchParams.get("q"),
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

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
    <>
      <div className="border-muted-foreground/10 bg-muted/30 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 backdrop-blur-sm">
        {/* Mobile Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDrawerOpen(true)}
          className="bg-background border-muted-foreground/15 h-8 gap-1.5 text-xs md:hidden"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasFilters && (
            <span className="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Desktop Controls */}
        <div className="hidden md:contents">
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
                    <t.icon className={cn("h-3.5 w-3.5", t.color)} />
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
        </div>

        {/* Reset (Desktop) */}
        {hasFilters && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground hidden h-8 gap-1.5 text-xs font-medium md:flex"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="flex w-[300px] flex-col gap-0 p-0 sm:w-[320px]"
        >
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle className="text-left text-base font-semibold">
              Filters
            </SheetTitle>
            <SheetDescription className="text-left text-xs">
              Refine your movement history view
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Search
              </Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  placeholder="Search by product..."
                  value={searchParams.get("q") || ""}
                  onChange={(e) => updateFilter("q", e.target.value)}
                  className="bg-background border-muted-foreground/15 h-9 rounded-lg pl-9 text-sm shadow-none"
                />
              </div>
            </div>

            {/* Movement Type */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Movement Type
              </Label>
              <Select
                value={searchParams.get("type") || "all"}
                onValueChange={(v) => updateFilter("type", v)}
              >
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {movementTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className={cn("h-3.5 w-3.5", t.color)} />
                        <span>{t.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warehouse */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Warehouse
              </Label>
              <Select
                value={searchParams.get("warehouse_id") || "all"}
                onValueChange={(v) => updateFilter("warehouse_id", v)}
              >
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
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
            </div>

            {/* Shop Type */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
                Shop Type
              </Label>
              <Select
                value={searchParams.get("shop_type_id") || "all"}
                onValueChange={(v) => updateFilter("shop_type_id", v)}
              >
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
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
            </div>

            <Separator className="my-1 opacity-50" />

            {/* From Date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground/60 shrink-0 text-[10px] font-semibold uppercase">
                From
              </span>
              <Input
                type="date"
                aria-label="From date"
                value={searchParams.get("date_from") || ""}
                onChange={(e) => updateFilter("date_from", e.target.value)}
                className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg px-2 text-sm shadow-none"
              />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground/60 shrink-0 text-[10px] font-semibold uppercase">
                To
              </span>
              <Input
                type="date"
                aria-label="To date"
                value={searchParams.get("date_to") || ""}
                onChange={(e) => updateFilter("date_to", e.target.value)}
                className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg px-2 text-sm shadow-none"
              />
            </div>
          </div>
          {hasFilters && (
            <div className="border-t px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleReset();
                  setDrawerOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground w-full gap-2 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All Filters
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
