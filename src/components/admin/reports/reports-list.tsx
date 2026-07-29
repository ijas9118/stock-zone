"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  getLowStockReport,
  getStockMovementsReport,
  getStockOutReport,
  getStockSummaryReport,
} from "@/actions/admin/reports";
import { exportRowsToExcel } from "@/lib/reports/export-excel";
import { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
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
import { Icons } from "@/components/icons";

type MovementSubType = Database["public"]["Enums"]["movement_sub_type"];

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
    id: "stock-out",
    title: "Stock Out",
    description:
      "Products currently at zero quantity, by warehouse and shop type.",
    fetch: getStockOutReport,
    filename: "stock-out",
  },
  {
    id: "stock-movements",
    title: "Stock Movements (Last 30 Days)",
    description: "IN / OUT / Transfer / Adjustment log for the past 30 days.",
    fetch: () => getStockMovementsReport(),
    filename: "stock-movements-30-days",
  },
] as const;

// The "reason" a Stock Out movement was recorded for — this is the set the
// staff ops page offers on Stock Out, so it's the only breakdown this report
// filters by (not the broader in/out/transfer/adjustment movement types).
const OUT_REASON_OPTIONS: { value: MovementSubType; label: string }[] = [
  { value: "sent_to_customer", label: "Customer Delivery" },
  { value: "sent_to_samti", label: "Sent to Samti Shop" },
  { value: "sent_to_yanbu", label: "Sent to Yanbu" },
  { value: "sent_to_tz_showroom", label: "Sent to TZ Showroom" },
  { value: "supplier_return", label: "Supplier Return" },
];

function StockMovementsByTypesCard() {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<MovementSubType | "all">("all");

  async function handleDownload() {
    setLoading(true);
    try {
      const rows = await getStockMovementsReport({
        type: "out",
        subType: reason === "all" ? undefined : reason,
      });
      if (rows.length === 0) {
        toast.info("No data available for this report.");
        return;
      }
      const filenameParts = ["stock-movements-by-types", reason].filter(
        (p) => p !== "all"
      );
      exportRowsToExcel(
        rows,
        filenameParts.join("-"),
        "Stock Movements by Types"
      );
      toast.success("Stock Movements by Types downloaded");
    } catch (err) {
      console.error("Failed to generate Stock Movements by Types report:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate report"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Stock Movements by Types
        </CardTitle>
        <CardDescription>
          Customer Delivery, Sent to Samti/Yanbu/TZ Showroom, Supplier Return —
          filter to one reason or export them all.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={reason}
          onValueChange={(v) => setReason(v as MovementSubType | "all")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Reasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {OUT_REASON_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleDownload} disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.reports className="mr-2 h-4 w-4" />
          )}
          Download Excel
        </Button>
      </CardContent>
    </Card>
  );
}

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
    } catch (err) {
      console.error(`Failed to generate "${report.title}" report:`, err);
      toast.error(
        err instanceof Error ? err.message : "Failed to generate report"
      );
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
      <StockMovementsByTypesCard />
    </div>
  );
}
