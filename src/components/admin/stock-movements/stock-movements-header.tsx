"use client";

interface StockMovementsHeaderProps {
  totalCount: number;
}

export function StockMovementsHeader({
  totalCount,
}: StockMovementsHeaderProps) {
  return (
    <div className="border-muted flex flex-col gap-1 border-b pb-3 sm:pb-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
        Stock Movements
      </h1>
      <p className="text-muted-foreground text-xs sm:text-sm">
        Full audit trail of every stock change across all locations.
      </p>
      <p className="text-muted-foreground mt-0.5 text-[11px] sm:text-xs">
        {totalCount.toLocaleString()} movement{totalCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
