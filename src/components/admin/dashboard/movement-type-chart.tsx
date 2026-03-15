"use client";

import Link from "next/link";
import { DashboardStats } from "@/actions/admin/dashboard";
import { ExternalLink } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MovementTypeChartProps {
  data: DashboardStats["movementCounts"];
}

export function MovementTypeChart({ data }: MovementTypeChartProps) {
  const chartData = [
    { label: "Purchase", count: data.purchase, color: "#10b981" },
    { label: "Sale", count: data.sale, color: "#ef4444" },
    {
      label: "Transfer",
      count: data.transfer_in + data.transfer_out,
      color: "#3b82f6",
    },
    { label: "Adjust", count: data.adjustment, color: "#f59e0b" },
    { label: "Return", count: data.return, color: "#8b5cf6" },
    { label: "Initial", count: data.initial_stock, color: "#94a3b8" },
  ];

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Movement Breakdown
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              By type — last 30 days
            </CardDescription>
          </div>
          <Link
            href="/admin/stock-movements"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barCategoryGap="30%">
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={24}
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
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
