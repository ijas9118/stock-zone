"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { getUserStocks, UserStockWithDetails } from "@/actions/user/stock";
import { Input } from "@/components/ui/input";

import { InventoryFilters } from "./inventory-filters";
import { InventoryList } from "./inventory-list";
import { InventoryStats } from "./inventory-stats";

interface UserInventoryViewProps {
  assignedShops: { id: string; name: string; accessLevel: string }[];
  warehouses: { id: string; name: string }[];
}

export function UserInventoryView({
  assignedShops,
  warehouses,
}: UserInventoryViewProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [stocks, setStocks] = useState<UserStockWithDetails[]>([]);
  const [totalStocksCount, setTotalStocksCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [shopFilter, setShopFilter] = useState(
    searchParams.get("shop") || "all"
  );
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const hasValidFilter =
    (warehouseFilter && warehouseFilter !== "all") ||
    searchTerm.trim().length >= 2;

  const handleRefresh = () => {
    if (!hasValidFilter) {
      setStocks([]);
      setTotalStocksCount(0);
      return;
    }

    startTransition(async () => {
      const result = await getUserStocks({
        query: searchTerm,
        shopTypeId: shopFilter === "all" ? undefined : shopFilter,
        warehouseId: warehouseFilter === "all" ? undefined : warehouseFilter,
        pageSize: 50,
      });
      setStocks(result.stocks);
      setTotalStocksCount(result.totalCount);
    });
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleRefresh();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, shopFilter, warehouseFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setWarehouseFilter("all");
    setShopFilter("all");
  };

  const lowStockCount = stocks.filter(
    (s) => s.quantity <= (s.products?.minimum_stock_quantity ?? 10)
  ).length;

  return (
    <div className="space-y-6">
      <InventoryStats
        assignedShopsCount={assignedShops.length}
        totalStocksCount={totalStocksCount}
        lowStockCount={lowStockCount}
      />

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search inventory by name, SKU or brand..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-background border-muted-foreground/15 focus:ring-primary/20 h-11 rounded-xl pl-10 text-xs shadow-sm transition-all focus:ring-2 sm:text-sm"
        />
      </div>

      <InventoryFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        warehouseFilter={warehouseFilter}
        setWarehouseFilter={setWarehouseFilter}
        shopFilter={shopFilter}
        setShopFilter={setShopFilter}
        warehouses={warehouses}
        assignedShops={assignedShops}
      />

      <InventoryList
        hasValidFilter={hasValidFilter}
        stocks={stocks}
        isLoading={isPending}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
