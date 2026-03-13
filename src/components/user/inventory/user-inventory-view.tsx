"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { getUserStocks, UserStockWithDetails } from "@/actions/user/stock";
import {
  AlertCircle,
  Package,
  PackageX,
  RefreshCw,
  Search,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockMovementDialog } from "@/components/admin/stock/movement-dialog";
import { StockTransferDialog } from "@/components/admin/stock/transfer-dialog";

import { StockCard } from "./stock-card";

interface UserInventoryViewProps {
  assignedShops: { id: string; name: string; accessLevel: string }[];
  warehouses: { id: string; name: string }[];
  permissions: {
    perm_do_transfer: boolean;
    perm_do_adjustment: boolean;
    perm_do_purchase: boolean;
    perm_do_sale: boolean;
    perm_do_return: boolean;
  };
}

export function UserInventoryView({
  assignedShops,
  warehouses,
  permissions,
}: UserInventoryViewProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [stocks, setStocks] = useState<UserStockWithDetails[]>([]);
  const [totalStocksCount, setTotalStocksCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [shopFilter, setShopFilter] = useState(
    searchParams.get("shop") || "all"
  );
  const [warehouseFilter, setWarehouseFilter] = useState("");

  // Dialog States
  const [activeDialog, setActiveDialog] = useState<{
    type: "transfer" | "adjustment" | "purchase" | "sale" | "return";
    stock: UserStockWithDetails;
  } | null>(null);

  const hasValidFilter =
    (warehouseFilter && warehouseFilter !== "all") ||
    searchTerm.trim().length >= 2;

  const handleRefresh = () => {
    if (!hasValidFilter) {
      setStocks([]);
      setTotalStocksCount(0);
      return;
    }

    startTransition(async () => {
      const result = await getUserStocks({
        query: searchTerm,
        shopTypeId: shopFilter === "all" ? undefined : shopFilter,
        warehouseId: warehouseFilter === "all" ? undefined : warehouseFilter,
        pageSize: 50,
      });
      setStocks(result.stocks);
      setTotalStocksCount(result.totalCount);
    });
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleRefresh();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, shopFilter, warehouseFilter]);

  const handleAction = (
    type: "transfer" | "adjustment" | "purchase" | "sale" | "return",
    stock: UserStockWithDetails
  ) => {
    setActiveDialog({ type, stock });
  };

  const lowStockCount = stocks.filter((s) => s.quantity <= 10).length;

  return (
    <div className="space-y-6">
      {/* Premium Header Section */}
      <section className="bg-primary/5 dark:bg-primary/10 relative overflow-hidden rounded-3xl p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-foreground text-3xl font-black tracking-tight sm:text-4xl">
              Inventory <span className="text-primary italic">Live</span>
            </h1>
            <p className="text-muted-foreground max-w-md text-sm font-medium">
              Manage and track products in your assigned shop sections.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-background/50 flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-sm backdrop-blur-sm">
              <div className="bg-primary/10 rounded-xl p-2">
                <Store className="text-primary h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl leading-none font-bold">
                  {assignedShops.length}
                </span>
                <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  Assigned Shops
                </span>
              </div>
            </div>

            <div className="bg-background/50 flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-sm backdrop-blur-sm">
              <div className="rounded-xl bg-emerald-500/10 p-2">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl leading-none font-bold">
                  {totalStocksCount}
                </span>
                <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  Filtered Results
                </span>
              </div>
            </div>

            <div className="bg-background/50 flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-sm backdrop-blur-sm">
              <div className="rounded-xl bg-red-500/10 p-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl leading-none font-bold">
                  {lowStockCount}
                </span>
                <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                  Low Stock
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Abstract Background Element */}
        <div className="bg-primary/10 absolute -top-16 -right-16 h-64 w-64 rounded-full blur-3xl" />
        <div className="bg-primary/5 absolute -bottom-16 -left-16 h-64 w-64 rounded-full blur-3xl" />
      </section>

      {/* Search and Filters */}
      <div className="bg-background/80 sticky top-0 z-10 -mt-4 flex flex-col gap-4 border-b py-4 backdrop-blur-md">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search by product, brand, or SKU (min 2 chars)..."
              className="bg-muted/50 focus-visible:ring-primary h-11 rounded-xl border-none pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="bg-muted/50 h-11 w-full rounded-xl border-none md:w-[200px]">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={shopFilter} onValueChange={setShopFilter}>
            <SelectTrigger className="bg-muted/50 h-11 w-full rounded-xl border-none md:w-[200px]">
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shop Types</SelectItem>
              {assignedShops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="bg-muted/30 h-11 w-11 shrink-0 rounded-xl"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw
              className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Inventory Grid / Placeholder */}
      {!hasValidFilter ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
          <div className="bg-muted rounded-full p-6">
            <Search className="text-muted-foreground h-12 w-12" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold">Select a Warehouse or Search</h3>
            <p className="text-muted-foreground">
              Please choose a warehouse or enter a search query (min 2
              characters) to load inventory.
            </p>
          </div>
        </div>
      ) : stocks.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 pb-10 md:grid-cols-2 xl:grid-cols-3">
          {stocks.map((stock) => (
            <StockCard
              key={stock.id}
              stock={stock}
              permissions={permissions}
              onAction={handleAction}
            />
          ))}
        </div>
      ) : (
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
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setWarehouseFilter("all");
              setShopFilter("all");
            }}
          >
            Clear all filters
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <Dialog
        open={activeDialog !== null}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {activeDialog?.type}: {activeDialog?.stock.products?.name}
            </DialogTitle>
            <DialogDescription>
              Process {activeDialog?.type} for this inventory item.
            </DialogDescription>
          </DialogHeader>

          {activeDialog?.type === "transfer" ? (
            <StockTransferDialog
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              initialData={activeDialog.stock as any}
              onSuccess={() => {
                setActiveDialog(null);
                handleRefresh();
              }}
            />
          ) : activeDialog ? (
            <StockMovementDialog
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              mode={activeDialog.type as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              initialData={activeDialog.stock as any}
              onSuccess={() => {
                setActiveDialog(null);
                handleRefresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
