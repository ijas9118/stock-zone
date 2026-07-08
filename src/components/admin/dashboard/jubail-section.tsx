"use client";

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

const DONUT_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

export function JubailSection({ data }: JubailSectionProps) {
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
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Stock by Category
            </CardTitle>
            <CardDescription>Quantity and low-stock count</CardDescription>
          </CardHeader>
          <CardContent>
            {data.categoryTable.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                No categories to show.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Low Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.categoryTable.map((c) => (
                    <TableRow key={c.category}>
                      <TableCell className="font-medium">
                        {c.category}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.lowStockCount > 0 ? (
                          <span className="font-medium text-red-600">
                            {c.lowStockCount}
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
