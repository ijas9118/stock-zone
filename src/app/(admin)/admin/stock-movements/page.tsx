import { Suspense } from "react";
import { getShops } from "@/actions/admin/shops";
import { getStockMovements } from "@/actions/admin/stock-movements";
import { getWarehouses } from "@/actions/admin/warehouses";

import { Skeleton } from "@/components/ui/skeleton";
import { ActiveMovementFilters } from "@/components/admin/stock-movements/active-movement-filters";
import { MovementsTable } from "@/components/admin/stock-movements/movements-table";
import { StockMovementsFilters } from "@/components/admin/stock-movements/stock-movements-filters";
import { StockMovementsHeader } from "@/components/admin/stock-movements/stock-movements-header";

interface StockMovementsPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    warehouse_id?: string;
    shop_type_id?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function StockMovementsPage({
  searchParams,
}: StockMovementsPageProps) {
  const {
    q,
    type,
    warehouse_id,
    shop_type_id,
    date_from,
    date_to,
    page,
    pageSize,
  } = await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 8;

  const [{ movements, totalCount }, { warehouses }, { shops: shopTypes }] =
    await Promise.all([
      getStockMovements({
        productQuery: q,
        type,
        warehouseId: warehouse_id,
        shopTypeId: shop_type_id,
        dateFrom: date_from,
        dateTo: date_to,
        page: currentPage,
        pageSize: currentPageSize,
      }),
      getWarehouses({ pageSize: 100 }),
      getShops({ pageSize: 100 }),
    ]);

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex flex-1 flex-col space-y-4 sm:space-y-6">
      <StockMovementsHeader totalCount={totalCount} />

      <div className="flex flex-col gap-4">
        <StockMovementsFilters
          initialWarehouses={warehouses}
          initialShopTypes={shopTypes}
        />
        <ActiveMovementFilters warehouses={warehouses} shopTypes={shopTypes} />
        <Suspense fallback={<TableSkeleton />}>
          <MovementsTable
            movements={movements}
            totalCount={totalCount}
            pageCount={pageCount}
          />
        </Suspense>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      <div className="rounded-md border">
        <div className="bg-muted h-[400px] w-full animate-pulse" />
      </div>
    </div>
  );
}
