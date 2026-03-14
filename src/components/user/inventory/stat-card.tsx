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
    <div className="bg-card group flex items-center gap-3 rounded-xl border p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-md sm:gap-5 sm:rounded-2xl sm:p-6">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 sm:h-12 sm:w-12 sm:rounded-xl",
          iconBg
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 transition-transform duration-300 group-hover:scale-110 sm:h-6 sm:w-6",
            iconColor
          )}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-foreground text-xl leading-none font-semibold tracking-tight sm:text-3xl sm:font-bold">
          {value}
        </span>
        <span className="text-muted-foreground mt-1 text-[10px] font-medium sm:mt-1.5 sm:text-sm">
          {label}
        </span>
      </div>
    </div>
  );
}
