"use client";

import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: StatCardProps) {
  return (
    <div className="bg-card group flex items-center gap-5 rounded-2xl border p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-md">
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
          iconBg
        )}
      >
        <Icon
          className={cn(
            "h-6 w-6 transition-transform duration-300 group-hover:scale-110",
            iconColor
          )}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-foreground text-3xl leading-none font-bold tracking-tight">
          {value}
        </span>
        <span className="text-muted-foreground mt-1.5 text-sm font-medium">
          {label}
        </span>
      </div>
    </div>
  );
}
