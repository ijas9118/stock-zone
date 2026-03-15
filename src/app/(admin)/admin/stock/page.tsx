import { Suspense } from "react";
import { getCategories } from "@/actions/admin/categories";
import { getShops } from "@/actions/admin/shops";
import { getStocks } from "@/actions/admin/stock";
import { getWarehouses } from "@/actions/admin/warehouses";

import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/admin/data-table";
import { ActiveFilters } from "@/components/admin/stock/active-filters";
import { columns } from "@/components/admin/stock/columns";
import { StockFilters } from "@/components/admin/stock/stock-filters";
import { StockHeader } from "@/components/admin/stock/stock-header";

interface StockPageProps {
  searchParams: Promise<{
    q?: string;
    warehouse_id?: string;
    shop_type_id?: string;
    category_id?: string;
    sub_category_id?: string;
    page?: string;
    pageSize?: string;
  }>;
}

function preload(params: {
  warehouseId?: string;
  shopTypeId?: string;
  categoryId?: string;
}) {
  void getWarehouses({ pageSize: 100 });
  void getShops({ pageSize: 100 });
  void getCategories({ pageSize: 100 });
  void getStocks({ ...params, page: 1, pageSize: 8 });
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const params_res = await searchParams;
  preload({
    warehouseId: params_res.warehouse_id,
    shopTypeId: params_res.shop_type_id,
    categoryId: params_res.category_id,
  });

  const {
    q,
    warehouse_id,
    shop_type_id,
    category_id,
    sub_category_id,
    page,
    pageSize,
  } = params_res;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 8;

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
      <StockHeader />

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
