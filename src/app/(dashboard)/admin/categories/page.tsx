import { Suspense } from "react";
import { getCategories } from "@/actions/admin/categories";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryHeader } from "@/components/admin/categories/category-header";
import { columns } from "@/components/admin/categories/columns";
import { DataTable } from "@/components/admin/data-table";

interface CategoriesPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const { q, page, pageSize } = await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 10;

  const { categories, totalCount } = await getCategories({
    query: q,
    page: currentPage,
    pageSize: currentPageSize,
  });

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex-1 space-y-6">
      <CategoryHeader />
      <Card>
        <CardHeader>
          <CardTitle>Category List</CardTitle>
          <CardDescription>
            A high-level view of product categories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<TableSkeleton />}>
            <DataTable
              columns={columns}
              data={categories}
              totalCount={totalCount}
              pageCount={pageCount}
              searchPlaceholder="Search categories..."
            />
          </Suspense>
        </CardContent>
      </Card>
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
