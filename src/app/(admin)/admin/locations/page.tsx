import { Suspense } from "react";

import { getLocations } from "@/actions/admin/locations";
import { ADMIN_PAGE_SIZE } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "@/components/admin/locations/columns";
import { LocationHeader } from "@/components/admin/locations/location-header";

interface LocationsPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function LocationsPage({
  searchParams,
}: LocationsPageProps) {
  const { q, page, pageSize } = await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || ADMIN_PAGE_SIZE;

  const { locations, totalCount } = await getLocations({
    query: q,
    page: currentPage,
    pageSize: currentPageSize,
    includeInactive: true,
  });

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="space-y-6">
      <LocationHeader />
      <Suspense fallback={<LocationsTableSkeleton />}>
        <DataTable
          columns={columns}
          data={locations}
          totalCount={totalCount}
          pageCount={pageCount}
          searchPlaceholder="Search by code, zone, aisle, rack, or bin..."
        />
      </Suspense>
    </div>
  );
}

function LocationsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-25" />
      </div>
      <div className="rounded-md border">
        <div className="bg-muted h-100 w-full animate-pulse" />
      </div>
    </div>
  );
}
