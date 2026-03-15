"use client";

import Link from "next/link";
import { DashboardStats } from "@/actions/admin/dashboard";
import { format } from "date-fns";
import {
  ArrowRightLeft,
  ChevronRight,
  LucideIcon,
  PackagePlus,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const typeConfig: Record<
  string,
  { label: string; icon: LucideIcon; className: string }
> = {
  purchase: {
    label: "Purchase",
    icon: TrendingUp,
    className:
      "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  sale: {
    label: "Sale",
    icon: TrendingDown,
    className:
      "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-400",
  },
  transfer_in: {
    label: "Transfer In",
    icon: ArrowRightLeft,
    className:
      "bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400",
  },
  transfer_out: {
    label: "Transfer Out",
    icon: ArrowRightLeft,
    className:
      "bg-orange-500/10 text-orange-700 dark:bg-orange-400/10 dark:text-orange-400",
  },
  adjustment: {
    label: "Adjustment",
    icon: SlidersHorizontal,
    className:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
  },
  return: {
    label: "Return",
    icon: RotateCcw,
    className:
      "bg-purple-500/10 text-purple-700 dark:bg-purple-400/10 dark:text-purple-400",
  },
  initial_stock: {
    label: "Initial Stock",
    icon: PackagePlus,
    className:
      "bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-400",
  },
};

interface RecentMovementsCardProps {
  data: DashboardStats["recentMovements"];
}

export function RecentMovementsCard({ data }: RecentMovementsCardProps) {
  return (
    <Card className="h-full border shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Recent Movements
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Latest stock activity
            </CardDescription>
          </div>
          <Link
            href="/admin/stock-movements"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            View all
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="divide-border/50 divide-y">
          {data.map((movement) => {
            const config =
              typeConfig[movement.type] || typeConfig.initial_stock;
            const Icon = config.icon;
            const isPositive = movement.quantity_delta > 0;
            return (
              <Link
                key={movement.id}
                href={`/admin/stock-movements/${movement.id}`}
                className="hover:bg-muted/40 group flex items-center gap-3 px-6 py-2.5 transition-colors"
              >
                {/* Type icon badge */}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    config.className
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Content: two lines */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {/* Line 1: product name */}
                  <span className="truncate text-xs leading-none font-medium">
                    {movement.products?.name || "Unknown Product"}
                  </span>
                  {/* Line 2: type · warehouse · shop · time */}
                  <span className="text-muted-foreground truncate text-[10px] leading-none">
                    {[
                      config.label,
                      movement.warehouses?.name,
                      movement.shop_types?.name,
                      format(new Date(movement.created_at), "MMM d, h:mm a"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>

                {/* Delta */}
                <span
                  className={cn(
                    "shrink-0 font-mono text-xs font-semibold",
                    isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {isPositive
                    ? `+${movement.quantity_delta}`
                    : movement.quantity_delta}
                </span>
              </Link>
            );
          })}
          {data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground text-xs">
                No recent movements
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
