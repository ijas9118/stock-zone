import {
  ArrowRightLeft,
  Boxes,
  PackageSearch,
  PackageX,
  TriangleAlert,
} from "lucide-react";

import { ACCENT } from "@/lib/chart-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardsRowProps {
  kpis: {
    totalStockUnits: number;
    lowStockCount: number;
    outOfStock: number;
    movementsToday: number;
    pendingTransfers: number;
  };
}

export function KpiCardsRow({ kpis }: KpiCardsRowProps) {
  const cards = [
    {
      label: "Total Stock Units",
      value: kpis.totalStockUnits.toLocaleString(),
      subtext: "Across current selection",
      icon: Boxes,
      color: undefined,
    },
    {
      label: "Low Stock",
      value: kpis.lowStockCount,
      subtext: "Items at or below reorder point",
      icon: TriangleAlert,
      color: kpis.lowStockCount > 0 ? ACCENT[500] : undefined,
    },
    {
      label: "Out of Stock",
      value: kpis.outOfStock,
      subtext: "Items with zero quantity",
      icon: PackageX,
      color: kpis.outOfStock > 0 ? ACCENT[900] : undefined,
    },
    {
      label: "Movements Today",
      value: kpis.movementsToday,
      subtext: "IN / OUT / Transfer / Adjustment",
      icon: ArrowRightLeft,
      color: undefined,
    },
    {
      label: "Pending Transfers",
      value: kpis.pendingTransfers,
      subtext: "Awaiting completion",
      icon: PackageSearch,
      color: kpis.pendingTransfers > 0 ? ACCENT[700] : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {c.label}
            </CardTitle>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: `${ACCENT[300]}33` }}
            >
              <c.icon className="h-3.5 w-3.5" style={{ color: ACCENT[900] }} />
            </span>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold"
              style={c.color ? { color: c.color } : undefined}
            >
              {c.value}
            </div>
            <p className="text-muted-foreground text-xs">{c.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
