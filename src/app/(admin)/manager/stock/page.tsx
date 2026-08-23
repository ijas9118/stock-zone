import { Suspense } from "react";

import { getCategories } from "@/actions/admin/categories";
import { getShops } from "@/actions/admin/shops";
import { getStocks, StockSortBy, StockSortDir } from "@/actions/admin/stock";
import { getWarehouses } from "@/actions/admin/warehouses";
import { ADMIN_PAGE_SIZE } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/admin/data-table";
import { ActiveFilters } from "@/components/admin/stock/active-filters";
import { StockFilters } from "@/components/admin/stock/stock-filters";
import { columns } from "@/components/manager/stock/columns";

interface StockPageProps {
  searchParams: Promise<{
    q?: string;
    warehouse_id?: string;
    shop_type_id?: string;
    category_id?: string;
    sub_category_id?: string;
    stock_status?: string;
    sort_by?: string;
    sort_dir?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function ManagerStockPage({
  searchParams,
}: StockPageProps) {
  const params_res = await searchParams;

  const {
    q,
    warehouse_id,
    shop_type_id,
    category_id,
    sub_category_id,
    stock_status,
    sort_by,
    sort_dir,
    page,
    pageSize,
  } = params_res;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || ADMIN_PAGE_SIZE;

  const [
    { stocks, totalCount },
    { warehouses },
    { shops: shopTypes },
    { categories },
  ] = await Promise.all([
    getStocks({
      query: q,
      warehouseId: warehouse_id,
      shopTypeId: shop_type_id,
      categoryId: category_id,
      subCategoryId: sub_category_id,
      stockStatus:
        stock_status === "out" || stock_status === "low"
          ? stock_status
          : undefined,
      sortBy: sort_by as StockSortBy | undefined,
      sortDir: sort_dir as StockSortDir | undefined,
      page: currentPage,
      pageSize: currentPageSize,
    }),
    getWarehouses({ pageSize: 100 }),
    getShops({ pageSize: 100 }),
    getCategories({ pageSize: 100 }),
  ]);

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div className="border-muted flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between sm:pb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            Current Stock
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            Real-time stock levels across every warehouse.
          </p>
        </div>
      </div>

      <StockFilters
        initialWarehouses={warehouses}
        initialShopTypes={shopTypes}
        initialCategories={categories}
      />

      <main className="flex min-w-0 flex-1 flex-col gap-4">
        <ActiveFilters
          warehouses={warehouses}
          shopTypes={shopTypes}
          categories={categories}
        />
        <Suspense fallback={<TableSkeleton />}>
          <DataTable
            columns={columns}
            data={stocks}
            totalCount={totalCount}
            pageCount={pageCount}
            searchPlaceholder="Search products by name or SKU..."
          />
        </Suspense>
      </main>
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
