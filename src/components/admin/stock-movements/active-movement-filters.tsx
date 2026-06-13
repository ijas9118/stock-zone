"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { X } from "lucide-react";

import { ShopType } from "@/actions/admin/shops";
import { Warehouse } from "@/actions/admin/warehouses";
import { Badge } from "@/components/ui/badge";

interface ActiveMovementFiltersProps {
  warehouses: Warehouse[];
  shopTypes: ShopType[];
}

export function ActiveMovementFilters({
  warehouses,
  shopTypes,
}: ActiveMovementFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeFilters: { key: string; label: string; value: string }[] = [];

  const type = searchParams.get("type");
  if (type && type !== "all") {
    activeFilters.push({
      key: "type",
      label: "Type",
      value: type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    });
  }

  const warehouseId = searchParams.get("warehouse_id");
  if (warehouseId && warehouseId !== "all") {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    if (warehouse) {
      activeFilters.push({
        key: "warehouse_id",
        label: "Warehouse",
        value: warehouse.name,
      });
    }
  }

  const shopTypeId = searchParams.get("shop_type_id");
  if (shopTypeId && shopTypeId !== "all") {
    const shop = shopTypes.find((s) => s.id === shopTypeId);
    if (shop) {
      activeFilters.push({
        key: "shop_type_id",
        label: "Shop Type",
        value: shop.name,
      });
    }
  }

  const dateFrom = searchParams.get("date_from");
  if (dateFrom) {
    activeFilters.push({
      key: "date_from",
      label: "From",
      value: format(new Date(dateFrom), "MMM d, yyyy"),
    });
  }

  const dateTo = searchParams.get("date_to");
  if (dateTo) {
    activeFilters.push({
      key: "date_to",
      label: "To",
      value: format(new Date(dateTo), "MMM d, yyyy"),
    });
  }

  if (activeFilters.length === 0) return null;

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="bg-muted/30 border-muted-foreground/10 flex flex-wrap items-center gap-2 rounded-lg border p-2 backdrop-blur-sm">
      <span className="text-muted-foreground ml-1 text-xs font-semibold">
        Active:
      </span>
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="bg-background border-muted-foreground/10 hover:bg-background gap-1 py-1 pr-1 pl-2 shadow-sm"
        >
          <span className="text-[10px] uppercase opacity-60">
            {filter.label}:
          </span>
          <span>{filter.value}</span>
          <button
            onClick={() => removeFilter(filter.key)}
            className="hover:bg-muted ml-1 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
