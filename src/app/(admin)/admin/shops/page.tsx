import { getShops } from "@/actions/admin/shops";
import { ADMIN_PAGE_SIZE } from "@/lib/config";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "@/components/admin/shops/columns";
import { ShopHeader } from "@/components/admin/shops/shop-header";

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || ADMIN_PAGE_SIZE;
  const query = params.q;

  const { shops, totalCount } = await getShops({ query, page, pageSize });

  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      <ShopHeader />

      <DataTable
        columns={columns}
        data={shops}
        totalCount={totalCount}
        pageCount={Math.ceil(totalCount / pageSize)}
        searchPlaceholder="Search shops..."
      />
    </div>
  );
}
