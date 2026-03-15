"use client";

import { useState } from "react";
import { RefreshCw, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface InventoryFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  warehouseFilter: string;
  setWarehouseFilter: (value: string) => void;
  shopFilter: string;
  setShopFilter: (value: string) => void;
  warehouses: { id: string; name: string }[];
  assignedShops: { id: string; name: string }[];
  handleRefresh: () => void;
  isPending: boolean;
}

export function InventoryFilters({
  searchTerm,
  setSearchTerm,
  warehouseFilter,
  setWarehouseFilter,
  shopFilter,
  setShopFilter,
  warehouses,
  assignedShops,
  handleRefresh,
  isPending,
}: InventoryFiltersProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeFilterCount = [
    searchTerm !== "",
    warehouseFilter !== "all",
    shopFilter !== "all",
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const handleReset = () => {
    setSearchTerm("");
    setWarehouseFilter("all");
    setShopFilter("all");
  };

  return (
    <>
      <div className="border-muted-foreground/10 bg-muted/30 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 backdrop-blur-sm">
        {/* Mobile Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDrawerOpen(true)}
          className="border-muted-foreground/15 bg-background h-8 gap-1.5 text-xs shadow-none md:hidden"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Desktop Controls */}
        <div className="hidden md:contents">
          <div className="relative max-w-[240px] min-w-[180px] flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-background border-muted-foreground/15 h-8 rounded-lg pl-8 text-xs shadow-none"
            />
          </div>

          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[140px] rounded-lg text-xs shadow-none">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={shopFilter}
            onValueChange={setShopFilter}
            disabled={assignedShops.length === 0}
          >
            <SelectTrigger className="bg-background border-muted-foreground/15 h-8 w-[130px] rounded-lg text-xs shadow-none">
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {assignedShops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right Actions */}
        <div className="ml-auto flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground hidden h-8 gap-1.5 text-xs font-medium md:flex"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            onClick={handleRefresh}
            disabled={isPending}
            aria-label="Refresh inventory"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isPending && "animate-spin")}
            />
          </Button>
        </div>
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
              Refine your inventory view
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-left text-[10px] font-bold tracking-wider uppercase">
                Search Products
              </Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg pl-8 text-sm shadow-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-left text-[10px] font-bold tracking-wider uppercase">
                Warehouse
              </Label>
              <Select
                value={warehouseFilter}
                onValueChange={setWarehouseFilter}
              >
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground/70 text-left text-[10px] font-bold tracking-wider uppercase">
                Shop Type
              </Label>
              <Select
                value={shopFilter}
                onValueChange={setShopFilter}
                disabled={assignedShops.length === 0}
              >
                <SelectTrigger className="bg-background border-muted-foreground/15 h-9 w-full rounded-lg text-sm shadow-none">
                  <SelectValue placeholder="All Shops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {assignedShops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasActiveFilters && (
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
