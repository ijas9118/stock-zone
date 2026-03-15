"use client";

import { DashboardStats } from "@/actions/admin/dashboard";

import { RecentMovementsCard } from "./recent-movements-card";
import { TopStockedCard } from "./top-stocked-card";

interface BottomRowProps {
  stats: DashboardStats;
}

export function BottomRow({ stats }: BottomRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <RecentMovementsCard data={stats.recentMovements} />
      <TopStockedCard
        topStockData={stats.topStockedProducts}
        recentUsers={stats.recentUsers}
      />
    </div>
  );
}
