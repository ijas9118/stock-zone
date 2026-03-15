"use client";

interface StockMovementsHeaderProps {
  totalCount: number;
}

export function StockMovementsHeader({
  totalCount,
}: StockMovementsHeaderProps) {
  return (
    <div className="border-muted flex flex-col gap-1 border-b pb-4">
      <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
      <p className="text-muted-foreground text-sm">
        Full audit trail of every stock change across all locations.
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {totalCount.toLocaleString()} movement{totalCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
