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

// Each card gets its own shade from the same 5-step ramp, darkest -> lightest,
// so all five feel like one family while still reading as distinct.
export function KpiCardsRow({ kpis }: KpiCardsRowProps) {
  const cards = [
    {
      label: "Total Stock Units",
      value: kpis.totalStockUnits.toLocaleString(),
      subtext: "Across current selection",
      icon: Boxes,
      accent: ACCENT[900],
    },
    {
      label: "Low Stock",
      value: kpis.lowStockCount.toLocaleString(),
      subtext: "At or below reorder point",
      icon: TriangleAlert,
      accent: ACCENT[700],
    },
    {
      label: "Out of Stock",
      value: kpis.outOfStock.toLocaleString(),
      subtext: "Items with zero quantity",
      icon: PackageX,
      // Intentional exception to the accent-only palette — this one needs
      // to read as a critical alert at a glance.
      accent: kpis.outOfStock > 0 ? "#dc2626" : ACCENT[500],
    },
    {
      label: "Movements Today",
      value: kpis.movementsToday.toLocaleString(),
      subtext: "IN / OUT / Transfer / Adjustment",
      icon: ArrowRightLeft,
      accent: ACCENT[300],
    },
    {
      label: "Pending Transfers",
      value: kpis.pendingTransfers.toLocaleString(),
      subtext: "Awaiting completion",
      icon: PackageSearch,
      accent: ACCENT[900],
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => (
        <Card
          key={c.label}
          className="flex h-full flex-col border-t-2 shadow-none"
          style={{ borderTopColor: c.accent }}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground min-h-8 text-xs leading-4 font-medium">
              {c.label}
            </CardTitle>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${c.accent}1f` }}
            >
              <c.icon className="h-4 w-4" style={{ color: c.accent }} />
            </span>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center">
            <div className="text-3xl leading-none font-bold tabular-nums sm:text-4xl">
              {c.value}
            </div>
            <p className="text-muted-foreground mt-1.5 text-xs">{c.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
