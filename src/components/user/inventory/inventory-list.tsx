"use client";

import { UserStockWithDetails } from "@/actions/user/stock";
import { PackageX, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { InventoryTable } from "./inventory-table";

interface InventoryListProps {
  hasValidFilter: boolean;
  stocks: UserStockWithDetails[];
  isLoading: boolean;
  onClearFilters: () => void;
}

export function InventoryList({
  hasValidFilter,
  stocks,
  isLoading,
  onClearFilters,
}: InventoryListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!hasValidFilter) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center sm:space-y-4 sm:py-20">
        <div className="bg-muted rounded-full p-4 sm:p-6">
          <Search className="text-muted-foreground h-8 w-8 sm:h-12 sm:w-12" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight sm:text-xl sm:font-bold">
            Select a Warehouse or Search
          </h3>
          <p className="text-muted-foreground mx-auto max-w-[250px] text-xs sm:max-w-none sm:text-sm">
            Please choose a warehouse or enter a search query (min 2 characters)
            to load inventory.
          </p>
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center sm:space-y-4 sm:py-20">
        <div className="bg-muted rounded-full p-4 sm:p-6">
          <PackageX className="text-muted-foreground h-8 w-8 sm:h-12 sm:w-12" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight sm:text-xl sm:font-bold">
            No items found
          </h3>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Try adjusting your filters or search term.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="h-9 px-4 text-xs sm:h-10 sm:px-6 sm:text-sm"
        >
          Clear all filters
        </Button>
      </div>
    );
  }

  return <InventoryTable stocks={stocks} />;
}
