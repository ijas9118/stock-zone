import { Suspense } from "react";
import { getBrandsPage } from "@/actions/admin/brands";

import { Skeleton } from "@/components/ui/skeleton";
import { BrandHeader } from "@/components/admin/brands/brand-header";
import { columns } from "@/components/admin/brands/columns";
import { DataTable } from "@/components/admin/data-table";

interface BrandsPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  const { q, page, pageSize } = await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 8;

  const { brands, totalCount } = await getBrandsPage({
    query: q,
    page: currentPage,
    pageSize: currentPageSize,
  });

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      <BrandHeader />
      <Suspense fallback={<TableSkeleton />}>
        <DataTable
          columns={columns}
          data={brands}
          totalCount={totalCount}
          pageCount={pageCount}
          searchPlaceholder="Search brands..."
        />
      </Suspense>
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
