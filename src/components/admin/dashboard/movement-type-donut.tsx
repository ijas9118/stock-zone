"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ACCENT_RAMP } from "@/lib/chart-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MovementTypeDonutProps {
  data: { in: number; out: number; transfer: number; adjustment: number };
}

const LABELS = ["IN", "OUT", "Transfer", "Adjustment"];

export function MovementTypeDonut({ data }: MovementTypeDonutProps) {
  const chartData = [
    { name: "IN", value: data.in },
    { name: "OUT", value: data.out },
    { name: "Transfer", value: data.transfer },
    { name: "Adjustment", value: data.adjustment },
  ];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const colorFor = (name: string) => ACCENT_RAMP[LABELS.indexOf(name)];

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
                      <Cell key={d.name} fill={colorFor(d.name)} />
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
                  {total}
                </span>
                <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                  Movements
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {chartData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: colorFor(d.name) }}
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
