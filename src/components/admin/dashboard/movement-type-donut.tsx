"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MovementTypeDonutProps {
  data: { in: number; out: number; transfer: number; adjustment: number };
}

const COLORS: Record<string, string> = {
  IN: "#6366f1",
  OUT: "#f43f5e",
  Transfer: "#0ea5e9",
  Adjustment: "#f59e0b",
};

export function MovementTypeDonut({ data }: MovementTypeDonutProps) {
  const chartData = [
    { name: "IN", value: data.in },
    { name: "OUT", value: data.out },
    { name: "Transfer", value: data.transfer },
    { name: "Adjustment", value: data.adjustment },
  ];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="border shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Movement Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No movements in the last 30 days.
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
