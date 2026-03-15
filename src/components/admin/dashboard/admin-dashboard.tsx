"use client";

import { DashboardStats } from "@/actions/admin/dashboard";

import { BottomRow } from "./bottom-row";
import { ChartsRow } from "./charts-row";
import { DashboardHeader } from "./dashboard-header";
import { StatCardsRow } from "./stat-cards-row";

interface AdminDashboardProps {
  stats: DashboardStats;
}

export function AdminDashboard({ stats }: AdminDashboardProps) {
  return (
    <div className="space-y-6 pb-10">
      <DashboardHeader />
      <StatCardsRow stats={stats} />
      <ChartsRow stats={stats} />
      <BottomRow stats={stats} />
    </div>
  );
}
