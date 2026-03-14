"use client";

import { RefreshCw, Search } from "lucide-react";

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
    <div className="bg-background/80 sticky top-0 z-10 flex flex-col gap-4 border-b py-4 backdrop-blur-md">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by product, brand, or SKU (min 2 chars)..."
            className="bg-muted/50 focus-visible:ring-primary h-11 rounded-xl border-none pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="bg-muted/50 h-11 w-full rounded-xl border-none md:w-[200px]">
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
        <Select value={shopFilter} onValueChange={setShopFilter}>
          <SelectTrigger className="bg-muted/50 h-11 w-full rounded-xl border-none md:w-[200px]">
            <SelectValue placeholder="All Shops" />
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
          className="bg-muted/30 h-11 w-11 shrink-0 rounded-xl"
          onClick={handleRefresh}
          disabled={isPending}
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
