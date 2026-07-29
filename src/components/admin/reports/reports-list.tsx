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

type MovementType = Database["public"]["Enums"]["movement_type"];
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
] as const;

const TYPE_OPTIONS: { value: MovementType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "in", label: "Stock In" },
  { value: "out", label: "Stock Out" },
  { value: "transfer_in", label: "Transfer In" },
  { value: "transfer_out", label: "Transfer Out" },
  { value: "adjustment", label: "Adjustment" },
];

// Sub-types grouped by their parent type — only shown once that type is
// selected, so the list stays short and relevant.
const SUB_TYPE_OPTIONS_BY_TYPE: Partial<
  Record<MovementType, { value: MovementSubType; label: string }[]>
> = {
  in: [
    { value: "supplier_delivery", label: "Supplier Delivery" },
    { value: "customer_return", label: "Customer Return" },
    { value: "sent_from_shop", label: "Sent from Shop" },
    { value: "initial_stock", label: "Initial Stock" },
  ],
  out: [
    { value: "sent_to_customer", label: "Sent to Customer" },
    { value: "sent_to_samti", label: "Sent to Samti Shop" },
    { value: "sent_to_yanbu", label: "Sent to Yanbu" },
    { value: "sent_to_tz_showroom", label: "Sent to TZ Showroom" },
    { value: "supplier_return", label: "Supplier Return" },
    { value: "sent_to_shop", label: "Sent to Shop (legacy)" },
  ],
  adjustment: [
    { value: "stock_count_correction", label: "Stock Count Correction" },
    { value: "system_mistake", label: "System Mistake" },
    { value: "damaged_goods", label: "Damaged Goods" },
    { value: "expired_goods", label: "Expired Goods" },
    { value: "missing_lost", label: "Missing / Lost" },
    { value: "found_extra_stock", label: "Found Extra Stock" },
  ],
};

function MovementsReportCard() {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<MovementType | "all">("all");
  const [subType, setSubType] = useState<MovementSubType | "all">("all");

  const subTypeOptions =
    type === "all" ? undefined : SUB_TYPE_OPTIONS_BY_TYPE[type];

  function handleTypeChange(value: string) {
    setType(value as MovementType | "all");
    setSubType("all");
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const rows = await getStockMovementsReport({
        type: type === "all" ? undefined : type,
        subType: subType === "all" ? undefined : subType,
      });
      if (rows.length === 0) {
        toast.info("No data available for this report.");
        return;
      }
      const filenameParts = ["stock-movements", type, subType].filter(
        (p) => p !== "all"
      );
      exportRowsToExcel(
        rows,
        filenameParts.join("-"),
        "Stock Movements (Last 30 Days)"
      );
      toast.success("Stock Movements downloaded");
    } catch (err) {
      console.error("Failed to generate Stock Movements report:", err);
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
          Stock Movements (Last 30 Days)
        </CardTitle>
        <CardDescription>
          IN / OUT / Transfer / Adjustment log, optionally filtered by movement
          type.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {subTypeOptions && (
          <Select
            value={subType}
            onValueChange={(v) => setSubType(v as MovementSubType | "all")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              {subTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
      <MovementsReportCard />
    </div>
  );
}
