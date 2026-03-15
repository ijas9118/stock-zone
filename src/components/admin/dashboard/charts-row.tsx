"use client";

import { DashboardStats } from "@/actions/admin/dashboard";

import { MovementTypeChart } from "./movement-type-chart";
import { MovementVolumeChart } from "./movement-volume-chart";

interface ChartsRowProps {
  stats: DashboardStats;
}

export function ChartsRow({ stats }: ChartsRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <MovementTypeChart data={stats.movementCounts} />
      <MovementVolumeChart data={stats.movementsByDay} />
    </div>
  );
}
