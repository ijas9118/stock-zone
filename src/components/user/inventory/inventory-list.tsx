"use client";

import { UserStockWithDetails } from "@/actions/user/stock";
import { PackageX, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { StockCard } from "./stock-card";

interface InventoryListProps {
  hasValidFilter: boolean;
  stocks: UserStockWithDetails[];
  permissions: {
    perm_do_transfer: boolean;
    perm_do_adjustment: boolean;
    perm_do_purchase: boolean;
    perm_do_sale: boolean;
    perm_do_return: boolean;
  };
  onAction: (
    type: "transfer" | "adjustment" | "purchase" | "sale" | "return",
    stock: UserStockWithDetails
  ) => void;
  onClearFilters: () => void;
}

export function InventoryList({
  hasValidFilter,
  stocks,
  permissions,
  onAction,
  onClearFilters,
}: InventoryListProps) {
  if (!hasValidFilter) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
        <div className="bg-muted rounded-full p-6">
          <Search className="text-muted-foreground h-12 w-12" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold">Select a Warehouse or Search</h3>
          <p className="text-muted-foreground">
            Please choose a warehouse or enter a search query (min 2 characters)
            to load inventory.
          </p>
        </div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
        <div className="bg-muted rounded-full p-6">
          <PackageX className="text-muted-foreground h-12 w-12" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold">No items found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or search term.
          </p>
        </div>
        <Button variant="outline" onClick={onClearFilters}>
          Clear all filters
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 pb-10 md:grid-cols-2 xl:grid-cols-3">
      {stocks.map((stock) => (
        <StockCard
          key={stock.id}
          stock={stock}
          permissions={permissions}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
