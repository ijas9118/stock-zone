import { Suspense } from "react";
import { getWarehouses } from "@/actions/admin/warehouses";

import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "@/components/admin/warehouses/columns";
import { WarehouseHeader } from "@/components/admin/warehouses/warehouse-header";

interface WarehousesPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function WarehousesPage({
  searchParams,
}: WarehousesPageProps) {
  const { q, page, pageSize } = await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 8;

  const { warehouses, totalCount } = await getWarehouses({
    query: q,
    page: currentPage,
    pageSize: currentPageSize,
  });

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex-1 space-y-6">
      <WarehouseHeader />
      <Suspense fallback={<WarehouseTableSkeleton />}>
        <DataTable
          columns={columns}
          data={warehouses}
          totalCount={totalCount}
          pageCount={pageCount}
          searchPlaceholder="Search warehouses..."
        />
      </Suspense>
    </div>
  );
}

function WarehouseTableSkeleton() {
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
