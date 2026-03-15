import { Suspense } from "react";
import { getCategories } from "@/actions/admin/categories";
import { getProducts } from "@/actions/admin/products";

import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "@/components/admin/products/columns";
import { ProductFilters } from "@/components/admin/products/product-filters";
import { ProductHeader } from "@/components/admin/products/product-header";

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category_id?: string;
    sub_category_id?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const { q, category_id, sub_category_id, page, pageSize } =
    await searchParams;

  const currentPage = Number(page) || 1;
  const currentPageSize = Number(pageSize) || 8;

  const [{ products, totalCount }, { categories }] = await Promise.all([
    getProducts({
      query: q,
      categoryId: category_id,
      subCategoryId: sub_category_id,
      page: currentPage,
      pageSize: currentPageSize,
    }),
    getCategories({ pageSize: 100 }), // for filter
  ]);

  const pageCount = Math.ceil(totalCount / currentPageSize);

  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      <ProductHeader />
      <Suspense fallback={<TableSkeleton />}>
        <DataTable
          columns={columns}
          data={products}
          totalCount={totalCount}
          pageCount={pageCount}
          searchPlaceholder="Search products, SKUs, or brands..."
          additionalFilters={<ProductFilters initialCategories={categories} />}
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
