"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StockHealthDonutProps {
  data: { healthy: number; low: number; outOfStock: number };
}

// Blue -> purple contrast: healthiest on the blue end, most severe deepest
// purple, matching the app's black theme.
const COLORS: Record<string, string> = {
  Healthy: "#3b82f6",
  Low: "#8b5cf6",
  "Out of Stock": "#5b21b6",
};

export function StockHealthDonut({ data }: StockHealthDonutProps) {
  const chartData = [
    { name: "Healthy", value: data.healthy },
    { name: "Low", value: data.low },
    { name: "Out of Stock", value: data.outOfStock },
  ];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

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
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {chartData.map((d) => (
                    <Cell key={d.name} fill={COLORS[d.name]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[d.name] }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
