import { Suspense } from "react";

import { getCategories } from "@/actions/admin/categories";
import { getProducts } from "@/actions/admin/products";
import { ADMIN_PAGE_SIZE } from "@/lib/config";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/admin/data-table";
import { ProductFilters } from "@/components/admin/products/product-filters";
import { columns } from "@/components/manager/products/columns";

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category_id?: string;
    sub_category_id?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function ManagerProductsPage({
  searchParams,
}: ProductsPageProps) {
  const { q, category_id, sub_category_id, page, pageSize } =
    await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || ADMIN_PAGE_SIZE;

  const [{ products, totalCount }, { categories }] = await Promise.all([
    getProducts({
      query: q,
      categoryId: category_id,
      subCategoryId: sub_category_id,
      page: currentPage,
      pageSize: currentPageSize,
    }),
    getCategories({ pageSize: 100 }),
  ]);

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          Products
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
          Browse the full product catalogue.
        </p>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <DataTable
          columns={columns}
          data={products}
          totalCount={totalCount}
          pageCount={pageCount}
          searchPlaceholder="Search products, SKUs, or brands..."
          additionalFilters={
            <ProductFilters
              key="product-filters"
              initialCategories={categories}
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
