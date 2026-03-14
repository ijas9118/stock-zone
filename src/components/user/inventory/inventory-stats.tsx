"use client";

import { AlertCircle, Package, Store } from "lucide-react";

import { StatCard } from "./stat-card";

interface InventoryStatsProps {
  assignedShopsCount: number;
  totalStocksCount: number;
  lowStockCount: number;
}

export function InventoryStats({
  assignedShopsCount,
  totalStocksCount,
  lowStockCount,
}: InventoryStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      <StatCard
        label="Assigned Shops"
        value={assignedShopsCount}
        icon={Store}
        iconBg="bg-primary/10"
        iconColor="text-primary"
      />
      <StatCard
        label="Products Found"
        value={totalStocksCount}
        icon={Package}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-600"
      />
      <StatCard
        label="Low Stock Alerts"
        value={lowStockCount}
        icon={AlertCircle}
        iconBg="bg-red-500/10"
        iconColor="text-red-600"
      />
    </div>
  );
}
