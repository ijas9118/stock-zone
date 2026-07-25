"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ACCENT } from "@/lib/chart-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MovementVolumeChartProps {
  data: { date: string; inbound: number; outbound: number }[];
}

export function MovementVolumeChart({ data }: MovementVolumeChartProps) {
  const hasActivity = data.some((d) => d.inbound > 0 || d.outbound > 0);

  return (
    <Card className="border shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Stock Movement Volume (30 days)
        </CardTitle>
        <div className="mt-1 flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: ACCENT[900] }}
            />
            <span className="text-muted-foreground">Inbound quantity</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: ACCENT[300] }}
            />
            <span className="text-muted-foreground">Outbound quantity</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No stock movement in the last 30 days.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="inboundFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ACCENT[900]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={ACCENT[900]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outboundFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ACCENT[300]} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={ACCENT[300]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="inbound"
                stroke={ACCENT[900]}
                fill="url(#inboundFill)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="outbound"
                stroke={ACCENT[300]}
                fill="url(#outboundFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
