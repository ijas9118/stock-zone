"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardData } from "@/actions/admin/dashboard";
import { ACCENT_RAMP } from "@/lib/chart-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JubailSectionProps {
  data: DashboardData["jubail"];
}

type Direction = "in" | "out";

interface MovementRow {
  name: string;
  totalIn: number;
  totalOut: number;
}

function topFive(rows: MovementRow[], direction: Direction) {
  const metric = (r: MovementRow) =>
    direction === "in" ? r.totalIn : r.totalOut;
  return rows
    .filter((r) => metric(r) > 0)
    .sort((a, b) => metric(b) - metric(a))
    .slice(0, 5)
    .map((r) => ({ name: r.name, value: metric(r) }));
}

function RankedBarChart({
  rows,
  emptyLabel,
}: {
  rows: { name: string; value: number }[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
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
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {rows.map((r, i) => (
            <Cell key={r.name} fill={ACCENT_RAMP[i % ACCENT_RAMP.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function JubailSection({ data }: JubailSectionProps) {
  const [categoryDirection, setCategoryDirection] = useState<Direction>("out");
  const [subcategoryDirection, setSubcategoryDirection] =
    useState<Direction>("out");
  const [selectedCategory, setSelectedCategory] = useState(
    data.available ? (data.categories[0] ?? "") : ""
  );

  const categoryRows = useMemo(
    () =>
      data.available ? topFive(data.categoryMovement, categoryDirection) : [],
    [data, categoryDirection]
  );

  const subcategoryRows = useMemo(() => {
    if (!data.available) return [];
    const scoped = data.subcategoryMovement.filter(
      (s) => s.category === selectedCategory
    );
    return topFive(scoped, subcategoryDirection);
  }, [data, selectedCategory, subcategoryDirection]);

  if (!data.available) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base font-medium">
            Top Categories
          </CardTitle>
          <Select
            value={categoryDirection}
            onValueChange={(v) => setCategoryDirection(v as Direction)}
          >
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in">IN</SelectItem>
              <SelectItem value="out">OUT</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <RankedBarChart
            rows={categoryRows}
            emptyLabel="No movement in the last 30 days."
          />
        </CardContent>
      </Card>

      <Card className="border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base font-medium">
            Top Subcategories
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {data.categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={subcategoryDirection}
              onValueChange={(v) => setSubcategoryDirection(v as Direction)}
            >
              <SelectTrigger className="h-8 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">IN</SelectItem>
                <SelectItem value="out">OUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <RankedBarChart
            rows={subcategoryRows}
            emptyLabel="No movement for this category."
          />
        </CardContent>
      </Card>
    </div>
  );
}
