"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  getLowStockReport,
  getStockMovementsReport,
  getStockSummaryReport,
} from "@/actions/admin/reports";
import { exportRowsToExcel } from "@/lib/reports/export-excel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/icons";

const REPORTS = [
  {
    id: "stock-summary",
    title: "Stock Summary",
    description:
      "Current quantity for every product, by warehouse and shop type.",
    fetch: getStockSummaryReport,
    filename: "stock-summary",
  },
  {
    id: "low-stock",
    title: "Low Stock / Reorder",
    description:
      "Products at or below their minimum stock level, with suggested reorder quantity.",
    fetch: getLowStockReport,
    filename: "low-stock-reorder",
  },
  {
    id: "stock-movements",
    title: "Stock Movements (Last 30 Days)",
    description: "IN / OUT / Transfer / Adjustment log for the past 30 days.",
    fetch: () => getStockMovementsReport(),
    filename: "stock-movements-30-days",
  },
] as const;

export function ReportsList() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleDownload(report: (typeof REPORTS)[number]) {
    setLoadingId(report.id);
    try {
      const rows = await report.fetch();
      if (rows.length === 0) {
        toast.info("No data available for this report.");
        return;
      }
      exportRowsToExcel(rows, report.filename, report.title);
      toast.success(`${report.title} downloaded`);
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {REPORTS.map((report) => (
        <Card key={report.id} className="border shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              {report.title}
            </CardTitle>
            <CardDescription>{report.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => handleDownload(report)}
              disabled={loadingId === report.id}
              className="w-full"
            >
              {loadingId === report.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.reports className="mr-2 h-4 w-4" />
              )}
              Download Excel
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
