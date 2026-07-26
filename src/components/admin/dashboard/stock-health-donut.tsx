"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ACCENT } from "@/lib/chart-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StockHealthDonutProps {
  data: { healthy: number; low: number; outOfStock: number };
}

// Same palette throughout: lightest = healthiest, darkest = most severe.
const COLORS: Record<string, string> = {
  Healthy: ACCENT[300],
  Low: ACCENT[500],
  "Out of Stock": ACCENT[900],
};

export function StockHealthDonut({ data }: StockHealthDonutProps) {
  const chartData = [
    { name: "Healthy", value: data.healthy },
    { name: "Low", value: data.low },
    { name: "Out of Stock", value: data.outOfStock },
  ];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const healthyPct = total > 0 ? Math.round((data.healthy / total) * 100) : 0;

  return (
    <Card className="border shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-medium">Stock Health</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No stock records for this selection.
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-[200px] w-[60%] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="68%"
                    outerRadius="95%"
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {chartData.map((d) => (
                      <Cell key={d.name} fill={COLORS[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    itemStyle={{ color: "var(--popover-foreground)" }}
                    labelStyle={{ color: "var(--popover-foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tracking-tight">
                  {healthyPct}%
                </span>
                <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                  Healthy
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[d.name] }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium">
                    {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
