"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronRight,
  Layers,
  LayoutGrid,
  Package,
  Store,
  Users,
  Warehouse,
} from "lucide-react";

import { DashboardStats } from "@/actions/admin/dashboard";
import { cn } from "@/lib/utils";

interface StatCardsRowProps {
  stats: DashboardStats;
}

export function StatCardsRow({ stats }: StatCardsRowProps) {
  const movementTotal = Object.values(stats.movementCounts).reduce(
    (a, b) => a + b,
    0
  );

  const primaryCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
      badge: `${stats.pendingUsers} pending`,
      badgeColor: "text-amber-600 dark:text-amber-400",
      subtext: `${stats.activeUsers} active accounts`,
      href: "/admin/users",
    },
    {
      label: "Products",
      value: stats.totalProducts,
      icon: Package,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600 dark:text-violet-400",
      subtext: "Active catalog items",
      href: "/admin/products",
    },
    {
      label: "Warehouses",
      value: stats.totalWarehouses,
      icon: Warehouse,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      subtext: "Active storage locations",
      href: "/admin/warehouses",
    },
    {
      label: "Shop Types",
      value: stats.totalShops,
      icon: Store,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-600 dark:text-orange-400",
      subtext: "Active shop channels",
      href: "/admin/shops",
    },
  ];

  const secondaryCards = [
    {
      label: "Inventory Items",
      value: stats.totalStockItems,
      icon: Layers,
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-600 dark:text-cyan-400",
      subtext: "Total stock records",
      href: "/admin/stock",
    },
    {
      label: "Low Stock",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      iconBg: "bg-red-500/10",
      iconColor:
        stats.lowStockItems > 0
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground",
      badge: stats.lowStockItems > 0 ? "Needs attention" : null,
      badgeColor: "text-red-600 dark:text-red-400",
      subtext:
        stats.lowStockItems > 0
          ? "Items at ≤ 10 units"
          : "All items well stocked",
      href: "/admin/stock",
      valueColor:
        stats.lowStockItems > 0 ? "text-red-600 dark:text-red-400" : undefined,
    },
    {
      label: "Movements (30d)",
      value: movementTotal,
      icon: ArrowRightLeft,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      subtext: "Last 30 days",
      href: "/admin/stock-movements",
    },
    {
      label: "Categories",
      value: stats.totalCategories,
      icon: LayoutGrid,
      iconBg: "bg-pink-500/10",
      iconColor: "text-pink-600 dark:text-pink-400",
      subtext: "Product categories",
      href: "/admin/categories",
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {primaryCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {secondaryCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badge?: string | null;
  badgeColor?: string;
  subtext?: string;
  href: string;
  valueColor?: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  badge,
  badgeColor,
  subtext,
  href,
  valueColor,
}: StatCardProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "bg-card flex flex-col gap-3 rounded-xl border p-4 sm:p-5",
          "hover:border-primary/30 transition-all duration-200 hover:shadow-sm",
          "group h-full cursor-pointer"
        )}
      >
        {/* top row: label + icon */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            {label}
          </span>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              iconBg
            )}
          >
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </div>
        {/* value */}
        <div className="flex items-end justify-between gap-2">
          <span
            className={cn(
              "text-2xl font-bold tracking-tight sm:text-3xl",
              valueColor
            )}
          >
            {value.toLocaleString()}
          </span>
          {badge && (
            <span
              className={cn(
                "mb-0.5 text-[11px] font-semibold whitespace-nowrap",
                badgeColor
              )}
            >
              {badge}
            </span>
          )}
        </div>
        {/* subtext */}
        {subtext && (
          <p className="text-muted-foreground text-xs leading-tight">
            {subtext}
          </p>
        )}
        {/* hover arrow indicator */}
        <div className="text-muted-foreground/0 group-hover:text-muted-foreground mt-auto flex items-center gap-1 pt-1 text-[10px] font-medium transition-colors">
          <span>View all</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}
