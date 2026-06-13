import { Suspense } from "react";

import { getCategories, getSubcategories } from "@/actions/admin/categories";
import { ADMIN_PAGE_SIZE } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "@/components/admin/subcategories/columns";
import { SubcategoryFilters } from "@/components/admin/subcategories/subcategory-filters";
import { SubcategoryHeader } from "@/components/admin/subcategories/subcategory-header";

interface SubcategoriesPageProps {
  searchParams: Promise<{
    q?: string;
    category_id?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function SubcategoriesPage({
  searchParams,
}: SubcategoriesPageProps) {
  const { q, category_id, page, pageSize } = await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || ADMIN_PAGE_SIZE;

  const [{ subcategories, totalCount }, { categories }] = await Promise.all([
    getSubcategories({
      query: q,
      categoryId: category_id,
      page: currentPage,
      pageSize: currentPageSize,
    }),
    getCategories({ pageSize: 100 }), // For the filter
  ]);

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      <SubcategoryHeader />
      <Suspense fallback={<TableSkeleton />}>
        <DataTable
          columns={columns}
          data={subcategories}
          totalCount={totalCount}
          pageCount={pageCount}
          searchPlaceholder="Search subcategories..."
          additionalFilters={
            <SubcategoryFilters
              key="subcategory-filters"
              categories={categories}
            />
          }
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
        <Skeleton className="h-10 w-25" />
      </div>
      <div className="rounded-md border">
        <div className="bg-muted h-100 w-full animate-pulse" />
      </div>
    </div>
  );
}
