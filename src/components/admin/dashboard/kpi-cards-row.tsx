import {
  ArrowRightLeft,
  Boxes,
  PackageSearch,
  PackageX,
  TriangleAlert,
} from "lucide-react";

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
      tone: "text-foreground",
    },
    {
      label: "Low Stock",
      value: kpis.lowStockCount,
      subtext: "Items at or below reorder point",
      icon: TriangleAlert,
      tone: kpis.lowStockCount > 0 ? "text-amber-600" : "text-foreground",
    },
    {
      label: "Out of Stock",
      value: kpis.outOfStock,
      subtext: "Items with zero quantity",
      icon: PackageX,
      tone: kpis.outOfStock > 0 ? "text-rose-600" : "text-foreground",
    },
    {
      label: "Movements Today",
      value: kpis.movementsToday,
      subtext: "IN / OUT / Transfer / Adjustment",
      icon: ArrowRightLeft,
      tone: "text-foreground",
    },
    {
      label: "Pending Transfers",
      value: kpis.pendingTransfers,
      subtext: "Awaiting completion",
      icon: PackageSearch,
      tone: kpis.pendingTransfers > 0 ? "text-indigo-600" : "text-foreground",
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
            <c.icon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${c.tone}`}>{c.value}</div>
            <p className="text-muted-foreground text-xs">{c.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
