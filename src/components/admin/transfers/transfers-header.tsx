"use client";

interface TransfersHeaderProps {
  totalCount: number;
}

export function TransfersHeader({ totalCount }: TransfersHeaderProps) {
  return (
    <div className="border-muted flex flex-col gap-1 border-b pb-3 sm:pb-4">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
        Transfers
      </h1>
      <p className="text-muted-foreground text-xs sm:text-sm">
        All warehouse-to-warehouse stock transfers and their current status.
      </p>
      <p className="text-muted-foreground mt-0.5 text-[11px] sm:text-xs">
        {totalCount.toLocaleString()} transfer{totalCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
