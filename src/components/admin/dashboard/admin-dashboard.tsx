"use client";

import { useEffect, useState } from "react";

import {
  DashboardAccess,
  DashboardData,
  DashboardWarehouse,
  getDashboardData,
  getWarehousesForShopType,
} from "@/actions/admin/dashboard";

import { DashboardFilters } from "./dashboard-filters";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { JubailSection } from "./jubail-section";
import { KpiCardsRow } from "./kpi-cards-row";
import { MovementTypeDonut } from "./movement-type-donut";
import { MovementVolumeChart } from "./movement-volume-chart";
import { MoversRow } from "./movers-row";
import { RecentMovementsCard } from "./recent-movements-card";
import { StockHealthDonut } from "./stock-health-donut";

interface AdminDashboardProps {
  access: DashboardAccess;
}

// Jubail is the primary imports warehouse and the most useful default view;
// fall back to the first available shop type if Jubail isn't in scope.
function pickDefaultShopTypeId(shopTypes: DashboardAccess["shopTypes"]) {
  const jubail = shopTypes.find((s) => /jubail/i.test(s.name));
  return jubail?.id ?? shopTypes[0]?.id ?? "";
}

export function AdminDashboard({ access }: AdminDashboardProps) {
  const [shopTypeId, setShopTypeId] = useState<string>(
    pickDefaultShopTypeId(access.shopTypes)
  );
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [warehouses, setWarehouses] = useState<DashboardWarehouse[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  function handleShopTypeChange(id: string) {
    setLoading(true);
    setShopTypeId(id);
  }

  function handleWarehouseChange(id: string) {
    setLoading(true);
    setWarehouseId(id);
  }

  useEffect(() => {
    if (!shopTypeId) return;
    let cancelled = false;
    getWarehousesForShopType(shopTypeId).then((list) => {
      if (cancelled) return;
      setWarehouses(list);
      setWarehouseId(list.length === 1 ? list[0].id : "");
    });
    return () => {
      cancelled = true;
    };
  }, [shopTypeId]);

  useEffect(() => {
    let cancelled = false;
    getDashboardData({
      shopTypeId: shopTypeId || undefined,
      warehouseId: warehouseId || undefined,
    }).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [shopTypeId, warehouseId]);

  return (
    <div className="space-y-6 pb-10">
      <DashboardHeader />
      <DashboardFilters
        shopTypes={access.shopTypes}
        selectedShopTypeId={shopTypeId}
        onShopTypeChange={handleShopTypeChange}
        warehouses={warehouses}
        selectedWarehouseId={warehouseId}
        onWarehouseChange={handleWarehouseChange}
      />

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <KpiCardsRow kpis={data.kpis} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MovementTypeDonut data={data.movementTypeSplit} />
            <StockHealthDonut data={data.stockHealth} />
          </div>
          <MovementVolumeChart data={data.movementVolumeTrend} />
          <MoversRow
            fastMovers={data.fastMovers}
            slowMovers={data.slowMovers}
          />
          <JubailSection data={data.jubail} />
          <RecentMovementsCard movements={data.recentMovements} />
        </>
      )}
    </div>
  );
}
