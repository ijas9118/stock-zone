"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardStats } from "@/actions/admin/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MovementVolumeChartProps {
  data: DashboardStats["movementsByDay"];
}

export function MovementVolumeChart({ data }: MovementVolumeChartProps) {
  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Movement Volume
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Inbound vs outbound — 14 days
            </CardDescription>
          </div>
          <Link
            href="/admin/stock-movements"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
        {/* Legend */}
        <div className="mt-2 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500/70" />
            <span className="text-muted-foreground text-[10px]">Inbound</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500/70" />
            <span className="text-muted-foreground text-[10px]">Outbound</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
          >
            <defs>
              <linearGradient id="inbound" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outbound" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={20}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "11px",
                color: "var(--popover-foreground)",
              }}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="inbound"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="url(#inbound)"
              dot={false}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="outbound"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="url(#outbound)"
              dot={false}
              stackId="1"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
