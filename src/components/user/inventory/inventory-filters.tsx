"use client";

import { RefreshCw, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  return (
    <div className="bg-background/80 sticky top-0 z-10 flex flex-col gap-2 border-b py-2 backdrop-blur-md sm:gap-4 sm:py-4">
      <div className="flex flex-col gap-2 md:flex-row md:gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search products..."
            className="bg-muted/50 focus-visible:ring-primary h-9 rounded-lg border-none pl-9 text-sm sm:h-11 sm:rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="bg-muted/50 h-9 flex-1 rounded-lg border-none text-xs sm:h-11 sm:w-[200px] sm:rounded-xl sm:text-sm">
              <SelectValue placeholder="Warehouse" />
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
          <Select value={shopFilter} onValueChange={setShopFilter}>
            <SelectTrigger className="bg-muted/50 h-9 flex-1 rounded-lg border-none text-xs sm:h-11 sm:w-[200px] sm:rounded-xl sm:text-sm">
              <SelectValue placeholder="Shop Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shop Types</SelectItem>
              {assignedShops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="bg-muted/30 h-9 w-9 shrink-0 rounded-lg sm:h-11 sm:w-11 sm:rounded-xl"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isPending && "animate-spin")}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
