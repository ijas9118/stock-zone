import { Suspense } from "react";
import { getUnitsOfMeasure } from "@/actions/admin/uom";

import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "@/components/admin/uom/columns";
import { UOMHeader } from "@/components/admin/uom/uom-header";

interface UOMPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function UOMPage({ searchParams }: UOMPageProps) {
  const { q, page, pageSize } = await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 8;

  const { unitsOfMeasure, totalCount } = await getUnitsOfMeasure({
    query: q,
    page: currentPage,
    pageSize: currentPageSize,
  });

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex-1 space-y-6">
      <UOMHeader />
      <Suspense fallback={<UOMTableSkeleton />}>
        <DataTable
          columns={columns}
          data={unitsOfMeasure}
          totalCount={totalCount}
          pageCount={pageCount}
          searchPlaceholder="Search units..."
        />
      </Suspense>
    </div>
  );
}

function UOMTableSkeleton() {
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
