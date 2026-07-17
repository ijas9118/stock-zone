"use client";

import {
  DashboardShopType,
  DashboardWarehouse,
} from "@/actions/admin/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardFiltersProps {
  shopTypes: DashboardShopType[];
  selectedShopTypeId: string;
  onShopTypeChange: (id: string) => void;
  warehouses: DashboardWarehouse[];
  selectedWarehouseId: string;
  onWarehouseChange: (id: string) => void;
}

export function DashboardFilters({
  shopTypes,
  selectedShopTypeId,
  onShopTypeChange,
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
}: DashboardFiltersProps) {
  const showShopTypeFilter = shopTypes.length > 1;
  const showWarehouseFilter = warehouses.length > 1;

  if (!showShopTypeFilter && !showWarehouseFilter) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {showShopTypeFilter && (
        <Select value={selectedShopTypeId} onValueChange={onShopTypeChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select shop type..." />
          </SelectTrigger>
          <SelectContent>
            {shopTypes.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {showWarehouseFilter && (
        <Select value={selectedWarehouseId} onValueChange={onWarehouseChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All warehouses" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
