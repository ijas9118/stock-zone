"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { DashboardData } from "@/actions/admin/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JubailSectionProps {
  data: DashboardData["jubail"];
}

// Blue -> purple family instead of a rainbow, so multi-slice charts still
// read as one cohesive palette.
const DONUT_COLORS = [
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#8b5cf6",
  "#7c3aed",
  "#6d28d9",
  "#4c1d95",
];

export function JubailSection({ data }: JubailSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState(
    data.available ? (data.categories[0] ?? "") : ""
  );

  const filteredSubcategories = useMemo(() => {
    if (!data.available) return [];
    return data.subcategoryTable
      .filter((s) => s.category === selectedCategory)
      .sort((a, b) => b.quantity - a.quantity);
  }, [data, selectedCategory]);

  if (!data.available) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Category-wise Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryDistribution.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No stock data available.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    label={({ name }) => name}
                  >
                    {data.categoryDistribution.map((d, i) => (
                      <Cell
                        key={d.name}
                        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                      />
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
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base font-medium">
                Subcategory Stock
              </CardTitle>
              <CardDescription>Quantity and low-stock count</CardDescription>
            </div>
            {data.categories.length > 0 && (
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {data.categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardHeader>
          <CardContent>
            {filteredSubcategories.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No subcategories to show.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subcategory</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Low Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubcategories.map((s) => (
                    <TableRow key={s.subcategory}>
                      <TableCell className="font-medium">
                        {s.subcategory}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.lowStockCount > 0 ? (
                          <span className="font-medium text-red-600">
                            {s.lowStockCount}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
